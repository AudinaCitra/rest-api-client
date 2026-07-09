# Struktur Folder Sesuai Ketentuan

Project ini menggunakan Electron + vanilla TypeScript, sehingga entry point asli aplikasi tetap berada di:

```text
src/main
src/preload
src/renderer
```

Agar struktur folder tetap mirip ketentuan tutorial, folder konseptual berikut juga disediakan:

```text
src/
  components/
    RequestEditor.ts
    ResponseViewer.ts
    CollectionSidebar.ts
    EnvironmentSelector.ts
  pages/
    RestClientPage.ts
  models/
    ApiRequest.ts
    ApiResponse.ts
    Collection.ts
    Environment.ts
    HistoryEntry.ts
  services/
    RequestService.ts
    EnvironmentService.ts
    CollectionService.ts
    HistoryService.ts
  repositories/
    CollectionRepository.ts
    EnvironmentRepository.ts
    HistoryRepository.ts
  utils/
    jsonFormatter.ts
    variableResolver.ts
  errors/
    NetworkError.ts
    ValidationError.ts
```

Catatan penting:

- Kode asli aplikasi tidak dipindahkan agar Electron/Vite tetap berjalan aman.
- File di folder konseptual sebagian berupa re-export/pemetaan dari kode asli.
- Model utama tetap tersedia: `ApiRequest`, `ApiResponse`, `Collection`, `Environment`, dan `HistoryEntry`.
- Karena tidak memakai React, ekstensi `.tsx` diganti menjadi `.ts`.
