import { Database as DB } from 'better-sqlite3';
import { Repository } from './Repository';
import { Environment } from '../models/types';

export class EnvironmentRepository extends Repository<Environment> {
  constructor(db: DB) {
    super(db, 'environments');
  }

  protected mapRow(row: any): Environment {
    return {
      id: row.id,
      name: row.name,
      isActive: !!row.is_active,
      variables: JSON.parse(row.variables) as Record<string, string>,
    };
  }

  insert(data: Omit<Environment, 'id'>): Environment {
    const result = this.db
      .prepare(
        'INSERT INTO environments (name, is_active, variables) VALUES (@name, @is_active, @variables)'
      )
      .run({
        name: data.name,
        is_active: data.isActive ? 1 : 0,
        variables: JSON.stringify(data.variables ?? {}),
      });
    return { id: Number(result.lastInsertRowid), ...data };
  }

  update(id: number, data: Partial<Environment>): Environment | null {
    const existing = this.findById(id);
    if (!existing) return null;
    const merged = { ...existing, ...data, id };
    this.db
      .prepare(
        'UPDATE environments SET name = @name, is_active = @is_active, variables = @variables WHERE id = @id'
      )
      .run({
        id,
        name: merged.name,
        is_active: merged.isActive ? 1 : 0,
        variables: JSON.stringify(merged.variables),
      });
    return merged;
  }

  /** Tandai satu environment sebagai aktif; sisanya dinonaktifkan (atomic). */
  setActive(id: number): void {
    const tx = this.db.transaction((activeId: number) => {
      this.db.prepare('UPDATE environments SET is_active = 0').run();
      this.db.prepare('UPDATE environments SET is_active = 1 WHERE id = ?').run(activeId);
    });
    tx(id);
  }

  getActive(): Environment | null {
    const row = this.db
      .prepare('SELECT * FROM environments WHERE is_active = 1 LIMIT 1')
      .get() as any;
    return row ? this.mapRow(row) : null;
  }
}
