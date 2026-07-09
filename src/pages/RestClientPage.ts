/**
 * Halaman utama REST Client.
 *
 * Karena project ini memakai vanilla TypeScript pada Electron renderer,
 * halaman utama direpresentasikan oleh file:
 * - src/renderer/index.html
 * - src/renderer/renderer.ts
 * - src/renderer/style.css
 *
 * File ini menjadi pemetaan struktur agar sesuai ketentuan tutorial,
 * tanpa mengubah entry point asli Electron/Vite.
 */
export const restClientPageFiles = [
  'src/renderer/index.html',
  'src/renderer/renderer.ts',
  'src/renderer/style.css',
] as const;
