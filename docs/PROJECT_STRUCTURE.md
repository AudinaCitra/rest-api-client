# Project Structure Mapping

Dokumen tutorial memberi contoh struktur umum seperti `components`, `pages`, `models`, `services`, `repositories`, `utils`, dan `errors`.

Project ini memakai Electron, jadi struktur fisiknya tetap dipisah menjadi:

```text
src/
  main/        # main process: HTTP, database, repository, service, IPC
  preload/     # jembatan aman window.api
  renderer/    # tampilan UI / presentation layer
```

Pemetaan ke struktur tutorial:

```text
components / pages
  -> src/renderer/index.html
  -> src/renderer/renderer.ts
  -> src/renderer/style.css

models
  -> src/main/models/types.ts

services
  -> src/main/services/RequestService.ts
  -> src/main/services/EnvironmentService.ts
  -> src/main/services/HttpClient.ts

repositories
  -> src/main/db/Repository.ts
  -> src/main/db/CollectionRepository.ts
  -> src/main/db/RequestRepository.ts
  -> src/main/db/EnvironmentRepository.ts
  -> src/main/db/HistoryRepository.ts

errors
  -> src/main/errors/AppError.ts

utils
  -> fungsi bantu kecil berada di layer terkait, misalnya formatter response di renderer dan resolver environment di EnvironmentService.
```

Alasan tidak memindahkan semua file ke folder baru: Electron membutuhkan pemisahan `main`, `preload`, dan `renderer` agar aplikasi tetap berjalan aman. Jadi struktur ini tetap sesuai layer tutorial, hanya disesuaikan dengan arsitektur Electron.
