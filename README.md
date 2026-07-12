# REST API Client (Postman-lite)

Aplikasi desktop untuk membuat, mengirim, dan menyimpan HTTP request seperti Postman versi sederhana.  
Project ini dibuat untuk studi kasus **Early Bird PBO**.

**Nama:** Audina Citra Hapsari  
**NIM:** A11.2024.15724  
**Kelompok:** 44UG1  

---

## Video Presentasi

Link YouTube:

```text
https://youtu.be/sPjoMdhuSMw?si=E1wTFz2h7y-JKkvK
```

Video presentasi mencakup:

- Demo aplikasi
- Walkthrough fitur utama
- Testing CRUD operations
- Error handling
- Demonstrasi fitur tambahan
- Code review
- Penjelasan arsitektur aplikasi
- Penjelasan function penting
- Database operations
- Challenges and solutions
- Learning outcomes

---

## Stack

- TypeScript
- Electron
- electron-vite
- Vite
- SQLite
- better-sqlite3
- HTML
- CSS
- Vanilla TypeScript

---

## Fitur

### Core Features / MVP

- HTTP method: GET, POST, PUT, DELETE, PATCH
- Input URL endpoint
- Tambah dan hapus headers dalam bentuk key-value
- Input body request dalam bentuk raw JSON/text
- Input body request dalam bentuk form-data key-value
- Tombol Send untuk mengirim request
- Menampilkan status code dengan indikator visual
- Menampilkan response time
- Menampilkan ukuran response body
- Menampilkan response body
- Menampilkan response headers
- JSON response otomatis dibuat rapi
- Collection: simpan, buka, rename, delete, import, export
- Environment variable seperti `{{base_url}}` dan `{{api_key}}`
- Substitusi variable otomatis pada URL, headers, body, dan form-data
- History request otomatis
- Persistensi data menggunakan SQLite
- Error handling untuk URL invalid, timeout, network error, response non-JSON, nama collection duplikat, dan file import JSON tidak valid

### Fitur Opsional / Stretch Goals

- Auth helper untuk Bearer Token, Basic Auth, dan API Key
- Syntax highlighting sederhana pada JSON response
- Response diff untuk membandingkan response sekarang dengan response sebelumnya
- Pre-request variable untuk menyimpan nilai dari response terakhir ke environment aktif
- Copy as cURL untuk menyalin request menjadi command `curl`

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

Jika muncul error `NODE_MODULE_VERSION mismatch` pada `better-sqlite3`:

```powershell
npm run rebuild
```

Catatan: folder `node_modules` tidak disertakan di repository karena ukurannya besar. Dependency dibuat ulang dengan `npm install`.

---

## Struktur Folder

Project memakai struktur Electron agar aplikasi berjalan:

```text
src/
  main/
    db/
      CollectionRepository.ts
      Database.ts
      EnvironmentRepository.ts
      HistoryRepository.ts
      Repository.ts
      RequestRepository.ts
    errors/
      AppError.ts
    models/
      types.ts
    services/
      EnvironmentService.ts
      HttpClient.ts
      RequestService.ts
    index.ts

  preload/
    index.ts

  renderer/
    global.d.ts
    index.html
    renderer.ts
    style.css
```

Project juga menyertakan struktur konseptual sesuai pembagian PBO:

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

Project ini menggunakan Electron, sehingga struktur runtime utama dibagi menjadi `main`, `preload`, dan `renderer`.

Folder konseptual seperti `components`, `pages`, `models`, `services`, `repositories`, `utils`, dan `errors` digunakan sebagai pemetaan struktur PBO. Beberapa file berisi re-export dari implementasi utama agar struktur tetap rapi tanpa menduplikasi logic.

Pembagian layer:

- `components` untuk bagian tampilan
- `pages` untuk halaman utama
- `models` untuk bentuk data
- `services` untuk business logic
- `repositories` untuk akses database
- `utils` untuk fungsi bantu
- `errors` untuk error khusus
- `main` untuk proses utama Electron, database, service, dan repository
- `preload` untuk komunikasi aman antara renderer dan main process
- `renderer` untuk tampilan UI aplikasi

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

Penjelasan singkat:

- `ApiRequest` menyimpan method, URL, headers, body raw, dan form-data
- `ApiResponse` menyimpan status, headers, body, waktu response, dan ukuran response
- `Collection` menyimpan kumpulan request
- `Environment` menyimpan variable seperti `base_url` dan `api_key`
- `HistoryEntry` menyimpan riwayat request yang pernah dikirim

---

## Penerapan OOP

| Konsep | Penerapan |
|---|---|
| Encapsulation | `Database.getInstance()` menyembunyikan koneksi SQLite |
| Abstraction | `Repository<T>` sebagai abstract class |
| Inheritance | Repository khusus mewarisi `Repository<T>` |
| Polymorphism | Setiap repository punya implementasi `mapRow()` sendiri |
| Generics | `Repository<T>` dipakai untuk banyak model |
| Singleton | Database hanya punya satu instance |
| Repository Pattern | Query database dipisahkan dari logic aplikasi |
| Service Layer | Logic utama aplikasi ada di service |
| Dependency Injection | Service menerima dependency lewat constructor |
| Error Handling | Error khusus ditangani dengan custom error dan `IpcResult` |

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

Import akan memvalidasi JSON, method, URL, header, body mode, dan form-data.

---

## Contoh Pengujian

### GET

```text
https://jsonplaceholder.typicode.com/posts/1
```

### POST JSON

```text
https://jsonplaceholder.typicode.com/posts
```

Body:

```json
{
  "title": "Belajar PBO",
  "body": "Membuat REST API Client menggunakan Electron dan TypeScript",
  "userId": 1
}
```

Endpoint backup untuk POST:

```text
https://postman-echo.com/post
```

### PUT

```text
https://jsonplaceholder.typicode.com/posts/1
```

Body:

```json
{
  "id": 1,
  "title": "Judul Post Diubah",
  "body": "Isi post diperbarui menggunakan method PUT",
  "userId": 1
}
```

### PATCH

```text
https://jsonplaceholder.typicode.com/posts/1
```

Body:

```json
{
  "title": "Judul Diubah Dengan PATCH"
}
```

### DELETE

```text
https://jsonplaceholder.typicode.com/posts/1
```

### Form-data

```text
https://postman-echo.com/post
```

Isi form-data:

```text
title   Belajar PBO Form Data
userId  1
```

### Environment Variable

Variable:

```text
base_url = https://jsonplaceholder.typicode.com
api_key = abc123
```

URL request:

```text
{{base_url}}/posts/1
```

Post id juga dapat dibuat sebagai variable:

```text
post_id = 1
```

URL request:

```text
{{base_url}}/posts/{{post_id}}
```

### Auth Helper

Bearer Token:

```text
Authorization: Bearer abc123
```

Basic Auth:

```text
Authorization: Basic <encoded username:password>
```

API Key:

```text
X-API-Key: abc123
```

### Pre-request Variable

Response terakhir:

```json
{
  "userId": 1,
  "id": 1,
  "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit"
}
```

Input:

```text
Nama variabel: last_post_id
JSON path: id
```

Variable dapat digunakan pada request berikutnya:

```text
https://jsonplaceholder.typicode.com/posts/{{last_post_id}}
```

Atau digabung dengan environment variable:

```text
{{base_url}}/posts/{{last_post_id}}
```

### Response Diff

Kirim request pertama:

```text
https://jsonplaceholder.typicode.com/posts/1
```

Kirim request kedua:

```text
https://jsonplaceholder.typicode.com/posts/2
```

Buka tab:

```text
Response Diff
```

Aplikasi akan menampilkan perbedaan response sebelumnya dan response terbaru. Baris dengan tanda minus menunjukkan data dari response sebelumnya, sedangkan baris dengan tanda plus menunjukkan data dari response terbaru.

Contoh hasil:

```text
-   "id": 1,
+   "id": 2,
```

### Copy as cURL

Contoh hasil Copy cURL:

```bash
curl -X "GET" "https://postman-echo.com/get?demo=1"
```

Jika memakai auth helper, hasil cURL juga menyertakan header:

```bash
curl -X "GET" "https://postman-echo.com/get?demo=1" -H "Authorization: Bearer abc123"
```

---

## Checklist Pengujian

Checklist fitur yang diuji:

- GET request untuk mengambil data
- POST request untuk membuat data
- PUT request untuk update data penuh
- PATCH request untuk update data sebagian
- DELETE request untuk menghapus data
- Raw JSON body
- Form-data key-value
- Headers key-value
- Response body dan response headers
- Status code, response time, dan ukuran response
- Collection save dan load
- Rename, delete, import, dan export collection
- Environment variable
- History request
- Auth Helper
- Syntax highlighting
- Response Diff
- Pre-request variable
- Copy as cURL
- Error handling untuk network error, timeout, URL invalid, dan file import invalid

---

## Batasan

- Form-data mendukung key-value.
- File upload multipart belum didukung.
- Pre-request yang didukung adalah penyimpanan variable dari response terakhir ke environment aktif, bukan script bebas seperti JavaScript custom.
- Copy as cURL mendukung raw body dan form-data sederhana.
- API Key helper menggunakan header `X-API-Key`.

---

## Error Handling

Aplikasi menangani beberapa kondisi error, seperti:

- URL kosong atau tidak valid
- Server tidak merespons
- Network error
- Timeout
- Response bukan JSON
- File import collection tidak valid
- Nama collection duplikat

Jika server atau koneksi belum merespons, aplikasi menampilkan pesan error tanpa membuat aplikasi crash.

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
- menangani error tanpa membuat aplikasi crash
- menerapkan OOP, service layer, repository pattern, dan error handling

Aplikasi juga menambahkan fitur opsional seperti auth helper, syntax highlighting, response diff, pre-request variable, dan copy as cURL.