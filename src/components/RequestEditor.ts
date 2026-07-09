/**
 * Komponen konseptual untuk editor request.
 *
 * Pada implementasi vanilla TypeScript + Electron ini, DOM editor request
 * dikelola langsung oleh class RestClientApp di src/renderer/renderer.ts.
 * File ini dibuat agar struktur folder mengikuti ketentuan tutorial tanpa
 * memindahkan/mengubah kode asli aplikasi.
 */
export type { ApiRequest } from '../models/ApiRequest';
export const requestEditorImplementation = 'src/renderer/renderer.ts';
