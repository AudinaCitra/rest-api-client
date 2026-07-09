import { ApiRequest, Environment } from '../models/types';
import { EnvironmentRepository } from '../db/EnvironmentRepository';

/**
 * EnvironmentService — business logic untuk environment & substitusi variabel.
 * Menerima repository via constructor (Dependency Injection).
 */
export class EnvironmentService {
  private static readonly VAR_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

  constructor(private readonly repo: EnvironmentRepository) {}

  list(): Environment[] {
    return this.repo.findAll();
  }

  save(env: Environment): Environment {
    if (env.id) return this.repo.update(env.id, env) ?? env;
    return this.repo.insert(env);
  }

  remove(id: number): boolean {
    return this.repo.delete(id);
  }

  setActive(id: number): void {
    this.repo.setActive(id);
  }

  /** Ganti semua {{key}} pada sebuah teks dengan nilai dari environment aktif. */
  resolveText(text: string): string {
    const vars = this.repo.getActive()?.variables ?? {};

    return text.replace(EnvironmentService.VAR_PATTERN, (whole, key: string) =>
      key in vars ? vars[key] : whole
    );
  }

  /** Terapkan substitusi ke seluruh bagian request: URL, headers, raw body, dan form-data. */
  applyTo(req: ApiRequest): ApiRequest {
    return {
      ...req,

      url: this.resolveText(req.url),

      headers: (req.headers ?? []).map((h) => ({
        ...h,
        key: this.resolveText(h.key),
        value: this.resolveText(h.value),
      })),

      body: this.resolveText(req.body ?? ''),

      formData: (req.formData ?? []).map((pair) => ({
        ...pair,
        key: this.resolveText(pair.key),
        value: this.resolveText(pair.value),
      })),
    };
  }
}
