import sqlite3 from 'sqlite3';
import {Database, open} from 'sqlite';
import {AIType, IUsageDB} from "./usagedb.js";
import {readFileSync} from "node:fs";
import * as path from "node:path";
import * as fs from "fs";

export class SQLiteUsageDB implements IUsageDB {
  private db!: Database<sqlite3.Database, sqlite3.Statement>;

  async init() {
    console.log('SQLiteUsageDB.init()')

    let dbDirPath = path.join(process.cwd(), 'sqlite');
    let dbFilePath = path.join(dbDirPath, 'usagedb.sqlite');
    let must_init = !fs.existsSync(dbFilePath)

    if (!fs.existsSync(dbDirPath)) {
      fs.mkdirSync(dbDirPath, {recursive: true});
    }
    this.db = await open({filename: dbFilePath, driver: sqlite3.Database});

    if (must_init)
      await this.loadData()
  }

  async loadData(): Promise<void> {
    console.log('SQLiteUsageDB.loadData()')
    let schemaPath = path.join(process.cwd(), 'usage_db', 'schema.sql');
    let keysPath = path.join(process.cwd(), 'usage_db', 'keys.sql');

    const schema = readFileSync(schemaPath, 'utf-8');
    await this.db.exec(schema);
    const keys = readFileSync(keysPath, 'utf-8');
    await this.db.exec(keys);
  }

  async getAPIKey(aitype: AIType, model: string, opts?: { preferFree?: boolean }) {
    const preferFree = opts?.preferFree ?? false;
    // 동일 모델에 대해 today_call_count가 가장 적은 키를 선택.
    // api_key_usages에 행이 없을 수 있으므로 COALESCE로 0 처리하고, 없으면 LEFT JOIN 결과로 0으로 비교.
    const baseQuery = (
      `SELECT k.api_key, COALESCE(u.today_call_count, 0) AS today_calls
       FROM api_keys k
       LEFT JOIN api_key_usages u ON u.api_key = k.api_key AND u.model = ?
       WHERE k.ai_type = ? ${preferFree ? 'AND k.is_free = 1' : ''}
       ORDER BY today_calls ASC, k.created_at ASC
       LIMIT 1`);
    let row = await this.db.get(baseQuery, model, aitype);

    if (preferFree) {
      if (!row || row.call_count > 240) {
        // 무료 키가 없으면 유료 키에서 선택
        const paidQuery = (
          `SELECT k.api_key, COALESCE(u.today_call_count, 0) AS today_calls
           FROM api_keys k
                    LEFT JOIN api_key_usages u ON u.api_key = k.api_key AND u.model = ?
           WHERE k.ai_type = ?
             AND k.is_free = 0
           ORDER BY today_calls ASC, k.created_at ASC LIMIT 1`);
        row = await this.db.get(paidQuery, model, aitype);
      }
    }

    if (!row) throw new Error('No available API key');

    // 선택된 키에 대한 usage row가 없으면 초기화
    await this.db.run(
      `INSERT INTO api_key_usages (api_key, model)
       VALUES (?, ?)
       ON CONFLICT(api_key, model) DO NOTHING`,
      row.api_key, model
    );

    return row.api_key;
  }

  async addTokenUsage(apiKey: string, model: string, inputTokens: number, outputTokens: number = 0, callCount: number = 1): Promise<void> {
    try {
      // upsert and increment usage counters per (api_key, model)
      await this.db.run(
        `INSERT INTO api_key_usages (
            api_key, model,
            total_input_tokens, month_input_tokens, week_input_tokens, today_input_tokens,
            total_output_tokens, month_output_tokens, week_output_tokens, today_output_tokens,
            total_call_count, month_call_count, week_call_count, today_call_count
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(api_key, model) DO UPDATE SET
            total_input_tokens  = total_input_tokens  + excluded.total_input_tokens,
            month_input_tokens  = month_input_tokens  + excluded.month_input_tokens,
            week_input_tokens   = week_input_tokens   + excluded.week_input_tokens,
            today_input_tokens  = today_input_tokens  + excluded.today_input_tokens,
            total_output_tokens = total_output_tokens + excluded.total_output_tokens,
            month_output_tokens = month_output_tokens + excluded.month_output_tokens,
            week_output_tokens  = week_output_tokens  + excluded.week_output_tokens,
            today_output_tokens = today_output_tokens + excluded.today_output_tokens,
            total_call_count    = total_call_count    + excluded.total_call_count,
            month_call_count    = month_call_count    + excluded.month_call_count,
            week_call_count     = week_call_count     + excluded.week_call_count,
            today_call_count    = today_call_count    + excluded.today_call_count`,
        apiKey, model,
        inputTokens, inputTokens, inputTokens, inputTokens,
        outputTokens, outputTokens, outputTokens, outputTokens,
        callCount, callCount, callCount, callCount
      );
    } catch (e) {
      throw e;
    }
  }

  async resetAndArchiveForPSTMidnight(): Promise<void> {
    function nowInLA() {
      // America/Los_Angeles 기준 날짜/월/요일을 구한다 (DST 대응)
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
      return {date: `${y}-${m}-${d}`, month: `${y}-${m}`, weekday};
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
      return fmt.format(prev); // YYYY-MM-DD
    }

    const {date, month, weekday} = nowInLA();
    await this.db.exec('BEGIN');
    try {
      // 오늘 사용량 아카이브 (입력/출력/호출 수)
      await this.db.run(
        `INSERT INTO daily_usage_archive (api_key, model, ai_type, usage_date, input_tokens, output_tokens, call_count)
         SELECT k.api_key, u.model, k.ai_type, ?, u.today_input_tokens, u.today_output_tokens, u.today_call_count
         FROM api_key_usages u
         JOIN api_keys k ON k.api_key = u.api_key
         WHERE u.today_input_tokens > 0 OR u.today_output_tokens > 0 OR u.today_call_count > 0`,
        date
      );
      // 오늘 사용량 리셋
      await this.db.run(
        `UPDATE api_key_usages
         SET today_input_tokens = 0,
             today_output_tokens = 0,
             today_call_count = 0
         WHERE today_input_tokens > 0 OR today_output_tokens > 0 OR today_call_count > 0`);

      // 이번달 아카이브: 매월 1일 00:00 (LA)에서 지난달 누적을 아카이브하고 리셋
      const day = Number(date.slice(-2));
      if (day === 1) {
        await this.db.run(
          `INSERT INTO monthly_usage_archive (api_key, model, ai_type, usage_month, input_tokens, output_tokens, call_count)
           SELECT k.api_key, u.model, k.ai_type, ?, u.month_input_tokens, u.month_output_tokens, u.month_call_count
           FROM api_key_usages u
           JOIN api_keys k ON k.api_key = u.api_key
           WHERE u.month_input_tokens > 0 OR u.month_output_tokens > 0 OR u.month_call_count > 0`,
          prevMonth(month)
        );
        await this.db.run(
          `UPDATE api_key_usages
           SET month_input_tokens = 0,
               month_output_tokens = 0,
               month_call_count = 0
           WHERE month_input_tokens > 0 OR month_output_tokens > 0 OR month_call_count > 0`);
      }

      // 주간 아카이브: 일요일에서 월요일로 넘어가는 순간(Mon 00:00 LA)
      if (weekday === 1) {
        const usageWeek = previousMondayDate(date); // 지난주 월요일 날짜
        await this.db.run(
          `INSERT INTO weekly_usage_archive (api_key, model, ai_type, usage_week, input_tokens, output_tokens, call_count)
           SELECT k.api_key, u.model, k.ai_type, ?, u.week_input_tokens, u.week_output_tokens, u.week_call_count
           FROM api_key_usages u
           JOIN api_keys k ON k.api_key = u.api_key
           WHERE u.week_input_tokens > 0 OR u.week_output_tokens > 0 OR u.week_call_count > 0`,
          usageWeek
        );
        await this.db.run(
          `UPDATE api_key_usages
           SET week_input_tokens = 0,
               week_output_tokens = 0,
               week_call_count = 0
           WHERE week_input_tokens > 0 OR week_output_tokens > 0 OR week_call_count > 0`);
      }

      await this.db.exec('COMMIT');
    } catch (e) {
      await this.db.exec('ROLLBACK');
      throw e;
    }
  }
}
