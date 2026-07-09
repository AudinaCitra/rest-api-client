import { Database as DB } from 'better-sqlite3';
import { Repository } from './Repository';
import { Collection } from '../models/types';

type CollectionRow = {
  id: number;
  name: string;
};

export class CollectionRepository extends Repository<Collection> {
  constructor(db: DB) {
    super(db, 'collections');
  }

  protected mapRow(row: CollectionRow): Collection {
    return {
      id: row.id,
      name: row.name,
    };
  }

  insert(data: Omit<Collection, 'id'>): Collection {
    const result = this.db
      .prepare('INSERT INTO collections (name) VALUES (?)')
      .run(data.name);

    return {
      id: Number(result.lastInsertRowid),
      name: data.name,
    };
  }

  update(id: number, data: Partial<Collection>): Collection | null {
    const existing = this.findById(id);

    if (!existing) return null;

    const name = data.name ?? existing.name;

    this.db
      .prepare('UPDATE collections SET name = ? WHERE id = ?')
      .run(name, id);

    return {
      id,
      name,
    };
  }

  rename(id: number, name: string): Collection | null {
    return this.update(id, { name });
  }
}
