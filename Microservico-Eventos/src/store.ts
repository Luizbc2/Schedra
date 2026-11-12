import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { type ClientEvent, type ClientEventType } from './contract.js';

export type RecordOutcome = 'processed' | 'duplicate' | 'conflict';
export interface ActivityStore {
  record(event: ClientEvent): RecordOutcome;
  summary(): { type: ClientEventType; count: number }[];
  ping(): boolean;
  close(): void;
}
export class SqliteActivityStore implements ActivityStore {
  private readonly db: DatabaseSync;
  constructor(path: string, private readonly retentionDays: number, private readonly now = Date.now) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path, { timeout: 500 });
    try {
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
      const version = Number(this.db.prepare('PRAGMA user_version').get()?.user_version);
      if (![0, 1].includes(version)) throw new Error('Unknown activity schema version');
      if (version === 0) this.db.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE receipts (
          event_id TEXT PRIMARY KEY, payload_hash TEXT NOT NULL,
          event_type TEXT NOT NULL, received_at TEXT NOT NULL
        );
        CREATE INDEX receipts_received_at ON receipts(received_at);
        CREATE TABLE activity (event_type TEXT PRIMARY KEY, count INTEGER NOT NULL CHECK(count >= 0));
        PRAGMA user_version=1;
        COMMIT;
      `);
    } catch (error) { this.db.close(); throw error; }
  }

  record(event: ClientEvent): RecordOutcome {
    const receivedAt = new Date(this.now()).toISOString();
    const cutoff = new Date(this.now() - this.retentionDays * 86_400_000).toISOString();
    const hash = createHash('sha256').update(JSON.stringify(event)).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('DELETE FROM receipts WHERE received_at < ?').run(cutoff);
      const previous = this.db.prepare('SELECT payload_hash FROM receipts WHERE event_id = ?').get(event.eventId);
      if (previous) {
        this.db.exec('COMMIT');
        return previous.payload_hash === hash ? 'duplicate' : 'conflict';
      }
      this.db.prepare('INSERT INTO receipts(event_id,payload_hash,event_type,received_at) VALUES(?,?,?,?)')
        .run(event.eventId, hash, event.type, receivedAt);
      this.db.prepare('INSERT INTO activity(event_type,count) VALUES(?,1) ON CONFLICT(event_type) DO UPDATE SET count=count+1')
        .run(event.type);
      this.db.exec('COMMIT');
      return 'processed';
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  summary(): { type: ClientEventType; count: number }[] {
    return this.db.prepare('SELECT event_type,count FROM activity ORDER BY event_type').all().map(row => ({
      type: String(row.event_type) as ClientEventType, count: Number(row.count),
    }));
  }
  ping(): boolean { return this.db.prepare('SELECT 1 AS ok').get()?.ok === 1; }
  close(): void { this.db.close(); }
}
