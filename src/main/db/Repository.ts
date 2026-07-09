import { Database as DB } from 'better-sqlite3';

/**
 * REPOSITORY (abstract, generic).
 * Pilar OOP: Abstraction + Inheritance + Generics.
 *
 * CRUD dasar (findAll, findById, delete) ditulis SATU KALI di sini dan
 * dipakai ulang oleh semua subclass. Tiap subclass hanya wajib menyediakan:
 *   - mapRow()  : cara mengubah baris database (snake_case) menjadi objek T
 *   - insert()  : query INSERT spesifik
 *   - update()  : query UPDATE spesifik
 */
export abstract class Repository<T extends { id?: number }> {
  constructor(
    protected readonly db: DB,
    protected readonly table: string
  ) {}

  /** Konversi baris mentah DB menjadi objek domain T. Wajib diisi subclass. */
  protected abstract mapRow(row: any): T;

  findAll(): T[] {
    const rows = this.db
      .prepare(`SELECT * FROM ${this.table} ORDER BY id`)
      .all() as any[];
    return rows.map((row) => this.mapRow(row));
  }

  findById(id: number): T | null {
    const row = this.db
      .prepare(`SELECT * FROM ${this.table} WHERE id = ?`)
      .get(id) as any;
    return row ? this.mapRow(row) : null;
  }

  delete(id: number): boolean {
    const result = this.db
      .prepare(`DELETE FROM ${this.table} WHERE id = ?`)
      .run(id);
    return result.changes > 0;
  }

  abstract insert(data: Omit<T, 'id'>): T;
  abstract update(id: number, data: Partial<T>): T | null;
}
