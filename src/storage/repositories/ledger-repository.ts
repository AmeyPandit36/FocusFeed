import type { FocusFeedDatabase } from '../database';
import type { CreditLedgerRecord } from '../../core/types';

export interface ILedgerRepository {
  addRecord(record: CreditLedgerRecord): Promise<void>;
  getRecordsForDate(localDate: string): Promise<CreditLedgerRecord[]>;
  getAllRecords(): Promise<CreditLedgerRecord[]>;
  clearRecords(): Promise<void>;
}

export class LedgerRepository implements ILedgerRepository {
  private db: FocusFeedDatabase;

  constructor(db: FocusFeedDatabase) {
    this.db = db;
  }

  async addRecord(record: CreditLedgerRecord): Promise<void> {
    await this.db.creditLedger.put(record);
  }

  async getRecordsForDate(localDate: string): Promise<CreditLedgerRecord[]> {
    return await this.db.creditLedger.where('localDate').equals(localDate).toArray();
  }

  async getAllRecords(): Promise<CreditLedgerRecord[]> {
    return await this.db.creditLedger.orderBy('timestamp').reverse().toArray();
  }

  async clearRecords(): Promise<void> {
    await this.db.creditLedger.clear();
  }
}
