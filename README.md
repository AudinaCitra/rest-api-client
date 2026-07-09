# REST API Client (Postman-lite)

Aplikasi desktop untuk membuat, mengirim, dan menyimpan HTTP request seperti Postman versi sederhana.  
Project ini dibuat untuk studi kasus **Early Bird PBO**.

**Nama:** Audina Citra Hapsari  
**NIM:** 111202415724  
**Kelompok:** 44UG1  

---

## Stack

- TypeScript
- Electron
- electron-vite
- SQLite
- better-sqlite3
- HTML, CSS, Vanilla TypeScript

---

## Fitur

- HTTP method: GET, POST, PUT, DELETE, PATCH
- Input URL, headers, raw body JSON/text, dan form-data key-value
- Menampilkan response status, body, headers, waktu, dan ukuran response
- JSON response otomatis dibuat rapi
- Collection: simpan, buka, rename, delete, import, export
- Environment variable seperti `{{base_url}}`
- History request otomatis
- Persistensi data dengan SQLite
- Error handling untuk URL invalid, timeout, network error, dan file import tidak valid

---

## Cara Install dan Menjalankan

Pastikan Node.js dan npm sudah terinstall.

Cek versi:

```powershell
node -v
npm -v
```

Install dependency:

```powershell
npm install --legacy-peer-deps
```

Jalankan aplikasi:

```powershell
npm run dev
```

Build aplikasi:

```powershell
npm run build
```

Jika `npm install` bermasalah atau terlalu lama:

```powershell
npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund --progress=false
npm rebuild electron --foreground-scripts
npm rebuild better-sqlite3 --foreground-scripts
npm run dev
```

Catatan: folder `node_modules` tidak disertakan di ZIP karena ukurannya besar. Dependency dibuat ulang dengan `npm install`.

---

## Struktur Folder

Project memakai struktur Electron agar aplikasi berjalan:

```text
src/
  main/
    db/
    errors/
    models/
    services/
    index.ts

  preload/
    index.ts

  renderer/
    index.html
    renderer.ts
    style.css
```

Project juga menyertakan struktur konseptual sesuai arahan tutorial:

```text
src/
  components/
  pages/
  models/
  services/
  repositories/
  utils/
  errors/
```

Pembagian layer:

- `components` untuk bagian tampilan
- `pages` untuk halaman utama
- `models` untuk bentuk data
- `services` untuk business logic
- `repositories` untuk akses database
- `utils` untuk fungsi bantu
- `errors` untuk error khusus

---

## Arsitektur

Alur aplikasi:

```text
Renderer/UI
  -> Preload IPC
    -> Main Process
      -> Services
        -> Repositories
          -> SQLite
```

Renderer tidak mengakses database langsung. Semua komunikasi dilakukan melalui `window.api` pada preload.

---

## Model Utama

Model utama aplikasi:

```text
ApiRequest
ApiResponse
Collection
Environment
HistoryEntry
```

`ApiRequest` menyimpan method, URL, headers, body raw, dan form-data.  
`ApiResponse` menyimpan status, headers, body, waktu response, dan ukuran response.

---

## Penerapan OOP

| Konsep | Penerapan |
|---|---|
| Encapsulation | `Database.getInstance()` menyembunyikan koneksi SQLite |
| Abstraction | `Repository<T>` sebagai abstract class |
| Inheritance | Repository khusus mewarisi `Repository<T>` |
| Polymorphism | Setiap repository punya `mapRow()` sendiri |
| Generics | `Repository<T>` dipakai untuk banyak model |
| Singleton | Database hanya punya satu instance |
| Repository Pattern | Query database dipisahkan dari logic |
| Service Layer | Logic utama ada di service |
| Dependency Injection | Service menerima dependency lewat constructor |

---

## Export / Import Collection

Export collection menghasilkan file JSON berisi:

```json
{
  "schemaVersion": 1,
  "name": "JSONPlaceholder",
  "exportedAt": "2026-07-07T00:00:00.000Z",
  "requests": [
    {
      "name": "Get Post",
      "method": "GET",
      "url": "https://jsonplaceholder.typicode.com/posts/1",
      "headers": [],
      "bodyMode": "raw",
      "body": "",
      "formData": []
    }
  ]
}
```

Import akan memvalidasi JSON, method, URL, header, dan form-data.

---

## Contoh Pengujian

GET:

```text
https://jsonplaceholder.typicode.com/posts/1
```

POST JSON:

```text
https://jsonplaceholder.typicode.com/posts
```

Form-data:

```text
https://postman-echo.com/post
```

Isi form-data:

```text
title   Belajar PBO Form Data
userId  1
```

---

## Batasan

- Form-data mendukung key-value.
- File upload multipart belum didukung.
- Auth helper belum didukung.
- Syntax highlighting belum didukung.
- Pre-request script belum didukung.

---

## Kesimpulan

Aplikasi ini sudah memenuhi fitur utama REST API Client:

- membuat dan mengirim request
- menampilkan response lengkap
- menyimpan collection
- menyimpan history
- memakai environment variable
- import/export JSON
- menyimpan data di SQLite
- menerapkan OOP, service layer, repository pattern, dan error handling