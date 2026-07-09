# Manual Testing Checklist

## Kirim Request
- [ ] GET ke https://jsonplaceholder.typicode.com/posts/1 -> 200, JSON ter-pretty-print
- [ ] POST ke https://jsonplaceholder.typicode.com/posts dengan body JSON -> 201
- [ ] PUT / DELETE / PATCH mengembalikan status yang sesuai
- [ ] Header custom (mis. Content-Type) terkirim
- [ ] Status 2xx hijau, 4xx/5xx merah, 3xx kuning
- [ ] Waktu (ms) dan ukuran (B/KB) tampil

## Error Handling
- [ ] URL kosong -> pesan "URL tidak boleh kosong", tidak crash
- [ ] URL tanpa http:// -> pesan validasi
- [ ] Domain tidak ada (mis. https://tidakada.abcxyz) -> NETWORK_ERROR, tidak crash
- [ ] Endpoint yang lambat/menggantung -> TIMEOUT setelah 15 detik
- [ ] Response non-JSON (mis. https://example.com) -> tampil sebagai teks biasa

## Collection & Persistensi
- [ ] Buat collection baru
- [ ] Simpan request ke collection
- [ ] Klik request tersimpan -> form terisi ulang
- [ ] Hapus collection
- [ ] Tutup & buka aplikasi -> collection + request masih ada

## Environment Variables
- [ ] Buat environment dengan {{base_url}}
- [ ] Set environment aktif
- [ ] Kirim request memakai {{base_url}} di URL -> tersubstitusi benar
- [ ] {{var}} juga tersubstitusi di header dan body
- [ ] Environment tetap ada setelah restart

## History
- [ ] Setiap request yang dikirim masuk history
- [ ] Klik entri history -> form terisi ulang
- [ ] History maksimal 50 entri
- [ ] Tombol bersihkan mengosongkan history


## Import / Export Collection
- [ ] Export collection menghasilkan file `.json`
- [ ] Isi file export memuat `schemaVersion`, `name`, `exportedAt`, dan `requests`
- [ ] Import file JSON valid berhasil membuat collection baru
- [ ] Import JSON rusak/tidak sesuai format menampilkan error dan tidak crash
- [ ] Import collection dengan nama yang sudah ada otomatis memakai nama unik
- [ ] Request hasil import bisa diklik dan form terisi ulang

## Validasi Tambahan
- [ ] Buat collection dengan nama kosong -> muncul error
- [ ] Buat collection dengan nama yang sudah ada -> muncul error
