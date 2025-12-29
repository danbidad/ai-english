import { sql, eq, and, asc, desc, or, gt } from 'drizzle-orm';
import { db } from '../index.js';
import { apiKeys, apiKeyUsages, dailyUsageArchive, monthlyUsageArchive, weeklyUsageArchive } from './schema.js';
import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as fs from "fs";

export type AIType = 'openai' | 'anthropic' | 'google';

class UsageDBClass {
  async init() {
    console.log('UsageDB.init() - via Drizzle');
    // Drizzle handles connection via db/index.ts
    // Check if initializing data is needed logic could go here, but usually setup is skipped or managed via migration
    // However, original logic loaded keys.sql on first run if file didn't exist.
    // Since usagedb.sqlite existence check was used, we can mimic it or just try to load keys.

    // For now, let's keep it simple. If we want to support auto-loading keys.sql:
    // We can check if api_keys table is empty.
    const count = await db.select({ count: sql<number>`count(*)` }).from(apiKeys);
    if (count[0].count === 0) {
      await this.loadData();
    }
  }

  async loadData(): Promise<void> {
    console.log('UsageDB.loadData()');
    let keysPath = path.join(process.cwd(), 'usage_db', 'keys.sql');
    if (fs.existsSync(keysPath)) {
      const keys = readFileSync(keysPath, 'utf-8');
      // split by semicolon to handle multiple statements if any, though db.run(sql) might take whole script depending on driver
      // better-sqlite3 exec supports multiple statements
      await db.run(sql.raw(keys));
    }
  }

  async getAPIKey(aitype: AIType, model: string, opts?: { preferFree?: boolean }) {
    const preferFree = opts?.preferFree ?? false;

    // Logic: Same model, lowest today_call_count.
    // If no usage record, treat as 0 calls.


    let candidate;

    if (preferFree) {
      // Try free first
      const freeRows = await db.select({
        apiKey: apiKeys.apiKey,
        todayCalls: sql<number>`COALESCE(${apiKeyUsages.todayCallCount}, 0)`
      })
        .from(apiKeys)
        .leftJoin(apiKeyUsages, and(eq(apiKeyUsages.apiKey, apiKeys.apiKey), eq(apiKeyUsages.model, model)))
        .where(and(eq(apiKeys.aiType, aitype), eq(apiKeys.isFree, sql`1`)))
        .orderBy(asc(sql`COALESCE(${apiKeyUsages.todayCallCount}, 0)`), asc(apiKeys.createdAt))
        .limit(1);

      if (freeRows.length > 0 && freeRows[0].todayCalls <= 240) {
        candidate = freeRows[0];
      } else {
        // Fallback to paid
        const paidRows = await db.select({
          apiKey: apiKeys.apiKey,
          todayCalls: sql<number>`COALESCE(${apiKeyUsages.todayCallCount}, 0)`
        })
          .from(apiKeys)
          .leftJoin(apiKeyUsages, and(eq(apiKeyUsages.apiKey, apiKeys.apiKey), eq(apiKeyUsages.model, model)))
          .where(and(eq(apiKeys.aiType, aitype), eq(apiKeys.isFree, sql`0`)))
          .orderBy(asc(sql`COALESCE(${apiKeyUsages.todayCallCount}, 0)`), asc(apiKeys.createdAt))
          .limit(1);
        if (paidRows.length > 0) candidate = paidRows[0];
      }
    } else {
      // Just get any key, free or paid, least usage
      const rows = await db.select({
        apiKey: apiKeys.apiKey,
        todayCalls: sql<number>`COALESCE(${apiKeyUsages.todayCallCount}, 0)`
      })
        .from(apiKeys)
        .leftJoin(apiKeyUsages, and(eq(apiKeyUsages.apiKey, apiKeys.apiKey), eq(apiKeyUsages.model, model)))
        .where(eq(apiKeys.aiType, aitype))
        .orderBy(asc(sql`COALESCE(${apiKeyUsages.todayCallCount}, 0)`), asc(apiKeys.createdAt))
        .limit(1);
      if (rows.length > 0) candidate = rows[0];
    }

    if (!candidate) throw new Error('No available API key');

    // Init usage row if needed
    /* Original:
       INSERT INTO api_key_usages (api_key, model) VALUES (?, ?)
       ON CONFLICT(api_key, model) DO NOTHING
    */
    await db.insert(apiKeyUsages)
      .values({ apiKey: candidate.apiKey, model })
      .onConflictDoNothing({ target: [apiKeyUsages.apiKey, apiKeyUsages.model] });

    return candidate.apiKey;
  }

  async addTokenUsage(apiKey: string, model: string, inputTokens: number, outputTokens: number = 0, callCount: number = 1): Promise<void> {
    await db.insert(apiKeyUsages)
      .values({
        apiKey,
        model,
        totalInputTokens: inputTokens,
        monthInputTokens: inputTokens,
        weekInputTokens: inputTokens,
        todayInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
        monthOutputTokens: outputTokens,
        weekOutputTokens: outputTokens,
        todayOutputTokens: outputTokens,
        totalCallCount: callCount,
        monthCallCount: callCount,
        weekCallCount: callCount,
        todayCallCount: callCount
      })
      .onConflictDoUpdate({
        target: [apiKeyUsages.apiKey, apiKeyUsages.model],
        set: {
          totalInputTokens: sql`${apiKeyUsages.totalInputTokens} + ${inputTokens}`,
          monthInputTokens: sql`${apiKeyUsages.monthInputTokens} + ${inputTokens}`,
          weekInputTokens: sql`${apiKeyUsages.weekInputTokens} + ${inputTokens}`,
          todayInputTokens: sql`${apiKeyUsages.todayInputTokens} + ${inputTokens}`,
          totalOutputTokens: sql`${apiKeyUsages.totalOutputTokens} + ${outputTokens}`,
          monthOutputTokens: sql`${apiKeyUsages.monthOutputTokens} + ${outputTokens}`,
          weekOutputTokens: sql`${apiKeyUsages.weekOutputTokens} + ${outputTokens}`,
          todayOutputTokens: sql`${apiKeyUsages.todayOutputTokens} + ${outputTokens}`,
          totalCallCount: sql`${apiKeyUsages.totalCallCount} + ${callCount}`,
          monthCallCount: sql`${apiKeyUsages.monthCallCount} + ${callCount}`,
          weekCallCount: sql`${apiKeyUsages.weekCallCount} + ${callCount}`,
          todayCallCount: sql`${apiKeyUsages.todayCallCount} + ${callCount}`,
        }
      });
  }

  async resetAndArchiveForPSTMidnight(): Promise<void> {
    // Helper functions same as before
    function nowInLA() {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long'
      });
      const parts = fmt.formatToParts(new Date());
      const y = parts.find(p => p.type === 'year')!.value;
      const m = parts.find(p => p.type === 'month')!.value;
      const d = parts.find(p => p.type === 'day')!.value;
      const weekdayName = parts.find(p => p.type === 'weekday')!.value.toLowerCase();
      const map: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
      };
      const weekday = map[weekdayName];
      return { date: `${y}-${m}-${d}`, month: `${y}-${m}`, weekday };
    }

    function prevMonth(currentYYYYMM: string): string {
      const [yStr, mStr] = currentYYYYMM.split('-');
      let y = Number(yStr);
      let m = Number(mStr);
      m -= 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
      return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}`;
    }

    function previousMondayDate(currentYYYYMMDD: string): string {
      const [yStr, mStr, dStr] = currentYYYYMMDD.split('-');
      const dt = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr)));
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const prev = new Date(dt.getTime() - sevenDaysMs);
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit'
      });
      return fmt.format(prev);
    }

    const { date, month, weekday } = nowInLA();

    // Transaction
    await db.transaction(async (tx) => {
      // Daily Archive
      await tx.run(sql`
            INSERT INTO daily_usage_archive (api_key, model, ai_type, usage_date, input_tokens, output_tokens, call_count)
            SELECT k.api_key, u.model, k.ai_type, ${date}, u.today_input_tokens, u.today_output_tokens, u.today_call_count
            FROM api_key_usages u
            JOIN api_keys k ON k.api_key = u.api_key
            WHERE u.today_input_tokens > 0 OR u.today_output_tokens > 0 OR u.today_call_count > 0
        `);

      // Daily Reset
      await tx.update(apiKeyUsages).set({
        todayInputTokens: 0,
        todayOutputTokens: 0,
        todayCallCount: 0
      }).where(or(
        gt(apiKeyUsages.todayInputTokens, 0),
        gt(apiKeyUsages.todayOutputTokens, 0),
        gt(apiKeyUsages.todayCallCount, 0)
      ));

      // Monthly
      const day = Number(date.slice(-2));
      if (day === 1) {
        const pMonth = prevMonth(month);
        await tx.run(sql`
                INSERT INTO monthly_usage_archive (api_key, model, ai_type, usage_month, input_tokens, output_tokens, call_count)
                SELECT k.api_key, u.model, k.ai_type, ${pMonth}, u.month_input_tokens, u.month_output_tokens, u.month_call_count
                FROM api_key_usages u
                JOIN api_keys k ON k.api_key = u.api_key
                WHERE u.month_input_tokens > 0 OR u.month_output_tokens > 0 OR u.month_call_count > 0
             `);

        await tx.update(apiKeyUsages).set({
          monthInputTokens: 0,
          monthOutputTokens: 0,
          monthCallCount: 0
        }).where(or(
          gt(apiKeyUsages.monthInputTokens, 0),
          gt(apiKeyUsages.monthOutputTokens, 0),
          gt(apiKeyUsages.monthCallCount, 0)
        ));
      }

      // Weekly
      if (weekday === 1) {
        const usageWeek = previousMondayDate(date);
        await tx.run(sql`
                INSERT INTO weekly_usage_archive (api_key, model, ai_type, usage_week, input_tokens, output_tokens, call_count)
                SELECT k.api_key, u.model, k.ai_type, ${usageWeek}, u.week_input_tokens, u.week_output_tokens, u.week_call_count
                FROM api_key_usages u
                JOIN api_keys k ON k.api_key = u.api_key
                WHERE u.week_input_tokens > 0 OR u.week_output_tokens > 0 OR u.week_call_count > 0
            `);

        await tx.update(apiKeyUsages).set({
          weekInputTokens: 0,
          weekOutputTokens: 0,
          weekCallCount: 0
        }).where(or(
          gt(apiKeyUsages.weekInputTokens, 0),
          gt(apiKeyUsages.weekOutputTokens, 0),
          gt(apiKeyUsages.weekCallCount, 0)
        ));
      }
    });
  }
}

export const UsageDB = new UsageDBClass();
