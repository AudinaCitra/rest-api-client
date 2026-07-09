import { Database as DB } from 'better-sqlite3';
import { Repository } from './Repository';
import { HistoryEntry } from '../models/types';

export class HistoryRepository extends Repository<HistoryEntry> {
  private static readonly MAX_ENTRIES = 50;

  constructor(db: DB) {
    super(db, 'history');
  }

  protected mapRow(row: any): HistoryEntry {
    return {
      id: row.id,
      method: row.method,
      url: row.url,
      status: row.status,
      timeMs: row.time_ms,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
      request: JSON.parse(row.request),
    };
  }

  /** History ditampilkan terbaru dulu. */
  findAll(): HistoryEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM history ORDER BY id DESC')
      .all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  insert(data: Omit<HistoryEntry, 'id'>): HistoryEntry {
    const result = this.db
      .prepare(
        `INSERT INTO history (method, url, status, time_ms, size_bytes, request)
         VALUES (@method, @url, @status, @time_ms, @size_bytes, @request)`
      )
      .run({
        method: data.method,
        url: data.url,
        status: data.status,
        time_ms: data.timeMs,
        size_bytes: data.sizeBytes,
        request: JSON.stringify(data.request),
      });
    // Jaga hanya 50 terbaru yang tersimpan.
    this.db
      .prepare(
        `DELETE FROM history WHERE id NOT IN
         (SELECT id FROM history ORDER BY id DESC LIMIT ?)`
      )
      .run(HistoryRepository.MAX_ENTRIES);
    return this.findById(Number(result.lastInsertRowid))!;
  }

  // History bersifat append-only; update tidak dipakai tapi wajib ada (kontrak abstract).
  update(): HistoryEntry | null {
    return null;
  }

  clear(): void {
    this.db.prepare('DELETE FROM history').run();
  }
}
