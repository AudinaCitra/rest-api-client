import { Database as DB } from 'better-sqlite3';
import { Repository } from './Repository';
import {
  ApiRequest,
  BodyMode,
  FormDataPair,
  HeaderPair,
} from '../models/types';

type RequestRow = {
  id: number;
  collection_id: number | null;
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string;
  body_mode?: string;
  form_data?: string;
};

export class RequestRepository extends Repository<ApiRequest> {
  constructor(db: DB) {
    super(db, 'requests');
  }

  protected mapRow(row: RequestRow): ApiRequest {
    return {
      id: row.id,
      collectionId: row.collection_id ?? null,
      name: row.name,
      method: row.method,
      url: row.url,
      headers: this.parseJson<HeaderPair[]>(row.headers, []),
      bodyMode: this.parseBodyMode(row.body_mode),
      body: row.body ?? '',
      formData: this.parseJson<FormDataPair[]>(row.form_data ?? '[]', []),
    };
  }

  listByCollection(collectionId: number): ApiRequest[] {
    const rows = this.db
      .prepare('SELECT * FROM requests WHERE collection_id = ? ORDER BY id')
      .all(collectionId) as RequestRow[];

    return rows.map((row) => this.mapRow(row));
  }

  insert(data: Omit<ApiRequest, 'id'>): ApiRequest {
    const bodyMode = data.bodyMode ?? 'raw';
    const formData = data.formData ?? [];

    const result = this.db
      .prepare(
        `INSERT INTO requests (
          collection_id,
          name,
          method,
          url,
          headers,
          body,
          body_mode,
          form_data
        )
        VALUES (
          @collection_id,
          @name,
          @method,
          @url,
          @headers,
          @body,
          @body_mode,
          @form_data
        )`
      )
      .run({
        collection_id: data.collectionId,
        name: data.name,
        method: data.method,
        url: data.url,
        headers: JSON.stringify(data.headers ?? []),
        body: data.body ?? '',
        body_mode: bodyMode,
        form_data: JSON.stringify(formData),
      });

    return {
      id: Number(result.lastInsertRowid),
      ...data,
      bodyMode,
      formData,
    };
  }

  update(id: number, data: Partial<ApiRequest>): ApiRequest | null {
    const existing = this.findById(id);

    if (!existing) return null;

    const merged: ApiRequest = {
      ...existing,
      ...data,
      id,
      bodyMode: data.bodyMode ?? existing.bodyMode ?? 'raw',
      formData: data.formData ?? existing.formData ?? [],
    };

    this.db
      .prepare(
        `UPDATE requests
         SET collection_id = @collection_id,
             name = @name,
             method = @method,
             url = @url,
             headers = @headers,
             body = @body,
             body_mode = @body_mode,
             form_data = @form_data
         WHERE id = @id`
      )
      .run({
        id,
        collection_id: merged.collectionId,
        name: merged.name,
        method: merged.method,
        url: merged.url,
        headers: JSON.stringify(merged.headers ?? []),
        body: merged.body ?? '',
        body_mode: merged.bodyMode ?? 'raw',
        form_data: JSON.stringify(merged.formData ?? []),
      });

    return merged;
  }

  private parseBodyMode(value?: string): BodyMode {
    if (value === 'form-data') return 'form-data';
    return 'raw';
  }

  private parseJson<T>(value: string, fallback: T): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
}
