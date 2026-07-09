// ============================================================
// ERROR LAYER — hierarki error kustom.
// Mendemonstrasikan 3 pilar OOP sekaligus:
//   - Abstraction : AppError abstract + property abstract `code`
//   - Inheritance : setiap error meng-extends AppError
//   - Polymorphism: tiap subclass punya `code` dan pesan berbeda
// ============================================================

/** Base class untuk semua error aplikasi. Tidak bisa di-instansiasi langsung. */
export abstract class AppError extends Error {
  /** Kode error yang wajib diisi tiap subclass (abstraction). */
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    // this.constructor.name = nama subclass sebenarnya (mis. "ValidationError")
    this.name = this.constructor.name;
  }
}

/** Input dari user tidak valid (URL kosong, format salah, dsb). */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
  }
}

/** Server tidak bisa dihubungi (DNS gagal, koneksi ditolak, dll). */
export class NetworkError extends AppError {
  readonly code = 'NETWORK_ERROR';
  constructor(detail: string) {
    super(`Gagal terhubung ke server: ${detail}`);
  }
}

/** Request melewati batas waktu. */
export class TimeoutError extends AppError {
  readonly code = 'TIMEOUT_ERROR';
  constructor(ms: number) {
    super(`Request timeout setelah ${ms / 1000} detik`);
  }
}

/** Data yang diminta tidak ditemukan di database. */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  constructor(resource: string, id: number | string) {
    super(`${resource} dengan ID '${id}' tidak ditemukan`);
  }
}
