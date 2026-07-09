// ============================================================
// MODEL LAYER — hanya definisi data (interface), tanpa perilaku.
// Perilaku/OOP ada di layer service, repository, dan errors.
// ============================================================

/** Mode body request yang dipilih user. */
export type BodyMode = 'raw' | 'form-data';

/** Satu pasangan header key-value. `enabled` agar bisa dimatikan tanpa dihapus. */
export interface HeaderPair {
  key: string;
  value: string;
  enabled: boolean;
}

/** Satu pasangan form-data key-value. `enabled` agar bisa dimatikan tanpa dihapus. */
export interface FormDataPair {
  key: string;
  value: string;
  enabled: boolean;
}

/** Request HTTP yang disusun user. Bisa disimpan ke dalam Collection. */
export interface ApiRequest {
  id?: number;
  collectionId: number | null;
  name: string;
  method: string; // GET, POST, PUT, DELETE, PATCH
  url: string;
  headers: HeaderPair[];

  /** Mode body: raw text/JSON atau form-data key-value. */
  bodyMode?: BodyMode;

  /** Body raw text / JSON. Tetap dipakai untuk mode raw. */
  body: string;

  /** Data form-data key-value. Dipakai jika bodyMode = 'form-data'. */
  formData?: FormDataPair[];
}

/** Hasil response dari server, sudah diukur waktu & ukurannya. */
export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  sizeBytes: number;
}

/** Folder yang mengelompokkan beberapa request. */
export interface Collection {
  id?: number;
  name: string;
}

/** Format file JSON untuk export/import collection. */
export interface ExportedCollection {
  schemaVersion: 1;
  name: string;
  exportedAt?: string;
  requests: Array<{
    name: string;
    method: string;
    url: string;
    headers: HeaderPair[];
    bodyMode?: BodyMode;
    body: string;
    formData?: FormDataPair[];
  }>;
}

/** Environment berisi variabel {{key}} yang disubstitusi saat request dikirim. */
export interface Environment {
  id?: number;
  name: string;
  isActive: boolean;
  variables: Record<string, string>;
}

/** Satu entri history request yang pernah dikirim. */
export interface HistoryEntry {
  id?: number;
  method: string;
  url: string;
  status: number;
  timeMs: number;
  sizeBytes: number;
  createdAt: string;
  request: ApiRequest;
}

/**
 * Hasil pemanggilan IPC. Karena Error class tidak bisa dikirim utuh lewat IPC,
 * kita bungkus hasil dalam bentuk discriminated union yang aman diserialisasi.
 */
export interface IpcResult<T> {
  ok: boolean;
  data?: T;
  error?: { name: string; code: string; message: string };
}
