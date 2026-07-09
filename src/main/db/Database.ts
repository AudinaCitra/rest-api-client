import BetterSqlite3, { Database as DB } from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

/**
 * DATABASE (Singleton Pattern).
 * Menyembunyikan detail koneksi (encapsulation) dan menjamin hanya ada
 * SATU koneksi ke file SQLite selama aplikasi hidup.
 */
export class Database {
  private static instance: DB | null = null;

  static getInstance(): DB {
    if (!Database.instance) {
      const dbPath = path.join(app.getPath('userData'), 'rest-client.db');

      Database.instance = new BetterSqlite3(dbPath);
      Database.instance.pragma('journal_mode = WAL');
      Database.instance.pragma('foreign_keys = ON');

      Database.migrate(Database.instance);
    }

    return Database.instance;
  }

  static close(): void {
    Database.instance?.close();
    Database.instance = null;
  }

  private static migrate(db: DB): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER,
        name TEXT NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        headers TEXT NOT NULL DEFAULT '[]',
        body TEXT NOT NULL DEFAULT '',
        body_mode TEXT NOT NULL DEFAULT 'raw',
        form_data TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS environments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        variables TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT,
        url TEXT,
        status INTEGER,
        time_ms INTEGER,
        size_bytes INTEGER,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        request TEXT NOT NULL DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_requests_collection_id
      ON requests(collection_id);

      CREATE INDEX IF NOT EXISTS idx_history_created_at
      ON history(created_at);
    `);

    // Migration tambahan untuk database lama yang dibuat sebelum fitur form-data.
    Database.addColumnIfMissing(
      db,
      'requests',
      'body_mode',
      "TEXT NOT NULL DEFAULT 'raw'"
    );

    Database.addColumnIfMissing(
      db,
      'requests',
      'form_data',
      "TEXT NOT NULL DEFAULT '[]'"
    );
  }

  private static addColumnIfMissing(
    db: DB,
    tableName: string,
    columnName: string,
    columnDefinition: string
  ): void {
    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{ name: string }>;

    const exists = columns.some((column) => column.name === columnName);

    if (!exists) {
      db.exec(`
        ALTER TABLE ${tableName}
        ADD COLUMN ${columnName} ${columnDefinition};
      `);
    }
  }
}
