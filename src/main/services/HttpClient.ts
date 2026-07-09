import { ApiRequest, ApiResponse } from '../models/types';
import { NetworkError, TimeoutError } from '../errors/AppError';

/**
 * HttpClient — melakukan HTTP request sesungguhnya.
 * Karena berjalan di MAIN PROCESS (Node), fetch di sini TIDAK terkena CORS
 * seperti fetch di browser/renderer. Inilah alasan request diproses di main.
 */
export class HttpClient {
  private static readonly TIMEOUT_MS = 15000;

  async send(req: ApiRequest): Promise<ApiResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HttpClient.TIMEOUT_MS);
    const start = Date.now();

    try {
      const method = req.method.toUpperCase();
      const methodAllowsBody = !['GET', 'HEAD'].includes(method);

      const headers = this.buildHeaders(req);
      const body = methodAllowsBody ? this.buildBody(req, headers) : undefined;

      const res = await fetch(req.url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      const text = await res.text();
      const timeMs = Date.now() - start;

      const respHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        respHeaders[key] = value;
      });

      return {
        status: res.status,
        statusText: res.statusText,
        headers: respHeaders,
        body: text,
        timeMs,
        sizeBytes: new TextEncoder().encode(text).length,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new TimeoutError(HttpClient.TIMEOUT_MS);
      }

      throw new NetworkError(err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timer);
    }
  }

  private buildHeaders(req: ApiRequest): Record<string, string> {
    const headers: Record<string, string> = {};

    for (const h of req.headers ?? []) {
      if (!h.enabled) continue;

      const key = h.key.trim();
      if (!key) continue;

      headers[key] = h.value;
    }

    return headers;
  }

  private buildBody(
    req: ApiRequest,
    headers: Record<string, string>
  ): string | FormData | undefined {
    const bodyMode = req.bodyMode ?? 'raw';

    if (bodyMode === 'form-data') {
      const form = new FormData();
      let count = 0;

      for (const pair of req.formData ?? []) {
        if (!pair.enabled) continue;

        const key = pair.key.trim();
        if (!key) continue;

        form.append(key, pair.value);
        count += 1;
      }

      if (count === 0) return undefined;

      /**
       * Kalau pakai FormData, Content-Type jangan diset manual.
       * Fetch akan otomatis membuat multipart/form-data + boundary.
       */
      this.removeHeaderIgnoreCase(headers, 'content-type');

      return form;
    }

    const rawBody = req.body ?? '';
    if (rawBody.trim().length === 0) return undefined;

    return rawBody;
  }

  private removeHeaderIgnoreCase(
    headers: Record<string, string>,
    targetKey: string
  ): void {
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === targetKey.toLowerCase()) {
        delete headers[key];
      }
    }
  }
}
