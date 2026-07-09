import { ApiRequest, ApiResponse } from '../models/types';
import { HttpClient } from './HttpClient';
import { EnvironmentService } from './EnvironmentService';
import { HistoryRepository } from '../db/HistoryRepository';
import { ValidationError } from '../errors/AppError';

/**
 * RequestService — jantung fitur kirim request.
 * Menggabungkan (orkestrasi): validasi -> substitusi variabel -> kirim -> catat history.
 * Semua dependency di-inject via constructor (Dependency Injection).
 */
export class RequestService {
  constructor(
    private readonly http: HttpClient,
    private readonly env: EnvironmentService,
    private readonly history: HistoryRepository
  ) {}

  async send(req: ApiRequest): Promise<ApiResponse> {
    // 1. Validasi (throw early).
    const resolved = this.env.applyTo(req);
    this.validate(resolved);

    // 2. Kirim via HttpClient (bisa throw NetworkError / TimeoutError).
    const response = await this.http.send(resolved);

    // 3. Catat ke history (best-effort; kegagalan mencatat tidak menggagalkan request).
    try {
      this.history.insert({
        method: resolved.method,
        url: resolved.url,
        status: response.status,
        timeMs: response.timeMs,
        sizeBytes: response.sizeBytes,
        createdAt: '',
        request: req,
      });
    } catch {
      /* abaikan kegagalan pencatatan history */
    }

    return response;
  }

  private validate(req: ApiRequest): void {
    const url = req.url.trim();
    if (url.length === 0) {
      throw new ValidationError('URL tidak boleh kosong');
    }
    if (!/^https?:\/\//i.test(url)) {
      throw new ValidationError("URL harus diawali 'http://' atau 'https://'");
    }
  }
}
