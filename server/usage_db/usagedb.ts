import {SQLiteUsageDB} from './usagedb_sqlite.js'
import {SetScheduleResetUsageDB} from "./reset_usage.js";

// 타입 정의
export type AIType = 'openai' | 'anthropic' | 'google';

// DB 추상화 (확장성을 위해 최소 인터페이스 정의)
export interface IUsageDB {
  init();
  getAPIKey(aitype: AIType, model: string, opts?: { preferFree?: boolean }): Promise<string>;
  addTokenUsage(apiKey: string, model: string, input_tokens: number, output_tokens)
  resetAndArchiveForPSTMidnight(): Promise<void>;
}

// 기본 내보내기: SQLite 구현을 사용
export class APIUsageDB implements IUsageDB {
  private impl: SQLiteUsageDB;
  constructor() {
    console.log('APIUsageDB constructor')
    this.impl = new SQLiteUsageDB();
  }
  init() { return this.impl.init(); }
  getAPIKey(aitype: AIType, model: string, opts?: { preferFree?: boolean }) { return this.impl.getAPIKey(aitype, model, opts); }
  async addTokenUsage(apiKey: string, model: string, input_tokens: number, output_tokens) { return this.impl.addTokenUsage(apiKey, model, input_tokens, output_tokens); }
  resetAndArchiveForPSTMidnight() { return this.impl.resetAndArchiveForPSTMidnight(); }
}

export const UsageDB = new APIUsageDB();
await UsageDB.init();
SetScheduleResetUsageDB()
