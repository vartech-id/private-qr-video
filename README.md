# Private QR Video

Aplikasi lokal berbasis **Nuxt 4** untuk mendeteksi video hasil export, menampilkan video terbaru, mengunggahnya ke Cloudflare R2 secara berurutan, lalu menghasilkan QR Code untuk mengunduh video tersebut.

Sistem ini dirancang untuk kebutuhan event pada **satu komputer lokal**. Operator memilih halaman Display dari menu utama, lalu setiap video baru yang masuk ke hot folder akan diproses dan ditampilkan otomatis.

---

## 1. Tujuan Proyek

Alur utama aplikasi:

```text
CapCut / software export video
        ↓
Hot folder lokal
        ↓
Chokidar mendeteksi file MP4 baru
        ↓
FFprobe memvalidasi video
        ↓
FFmpeg membuat thumbnail
        ↓
Metadata disimpan ke SQLite
        ↓
Video masuk antrean upload
        ↓
Upload ke Cloudflare R2 satu per satu
        ↓
URL download tersedia
        ↓
QR Code muncul di Display dan Gallery
```

Aplikasi mempertahankan seluruh riwayat video di Gallery, walaupun hot folder aktif diganti melalui halaman Admin.

---

## 2. Status Proyek

Status saat ini:

- MVP lokal sudah berfungsi.
- Hot folder dapat diganti tanpa restart aplikasi.
- Gallery menyimpan seluruh metadata video.
- Upload R2 berjalan serial dengan concurrency `1`.
- Display menampilkan video terbaru dan QR Code.
- Navigasi menuju Display digunakan sebagai interaksi pengguna untuk mencoba autoplay dengan suara.

Aplikasi ditujukan untuk komputer event lokal, bukan aplikasi publik multi-user.

---

## 3. Teknologi

| Bagian | Teknologi |
|---|---|
| Full-stack framework | Nuxt 4 |
| Frontend | Vue 3 |
| Runtime/package manager | Bun |
| Server | Nitro / H3 |
| ORM | Prisma |
| Database | SQLite |
| SQLite adapter | `@prisma/adapter-libsql` |
| Folder watcher | Chokidar |
| Video validation | FFprobe |
| Thumbnail generation | FFmpeg |
| Object storage | Cloudflare R2 |
| R2 SDK | AWS SDK S3 Client |
| QR Code | `qrcode` atau komponen QR yang digunakan aplikasi |

Project menggunakan JavaScript untuk source aplikasi. File konfigurasi Prisma tetap dapat menggunakan TypeScript sesuai kebutuhan Prisma.

---

## 4. Fitur Utama

### 4.1 Hot Folder Watcher

- Memantau satu folder lokal aktif.
- Hanya memproses file `.mp4`.
- Menggunakan `awaitWriteFinish` agar file tidak diproses ketika proses export masih berjalan.
- Hot folder dapat diganti dari halaman Admin.
- Watcher lama ditutup setelah watcher baru berhasil aktif.
- Video lama tidak disalin atau dipindahkan.

### 4.2 Validasi Video

Video diproses menggunakan FFprobe untuk membaca metadata seperti:

- codec video;
- width dan height;
- durasi;
- informasi stream.

FFmpeg membuat thumbnail JPG yang disimpan di folder lokal khusus thumbnail.

### 4.3 Upload Queue

- Video yang valid masuk status `QUEUED`.
- Worker mengambil video paling lama dalam antrean.
- Hanya satu video yang di-upload pada satu waktu.
- Upload menggunakan file stream, bukan Base64 atau Buffer penuh.
- Jika aplikasi restart ketika status masih `UPLOADING`, record dapat dikembalikan ke antrean.
- Retry menggunakan batas maksimal dan jeda bertahap.

### 4.4 Display

- Menampilkan video terbaru dari local stream.
- Video portrait dan landscape dipertahankan sesuai rasio aslinya.
- QR Code ditampilkan di panel terpisah.
- QR muncul setelah upload R2 selesai.
- Setiap video baru menggantikan video sebelumnya.
- Tidak menggunakan playback queue.

### 4.5 Gallery

- Menampilkan seluruh video yang tercatat di SQLite.
- Menggunakan thumbnail lokal.
- Menampilkan status upload dan QR.
- Mendukung filter berdasarkan status, nama file, dan tanggal.
- Mengganti hot folder tidak menghapus isi Gallery.

### 4.6 Admin

- Menampilkan hot folder aktif.
- Mengubah hot folder melalui absolute path Windows.
- Memilih apakah file lama dalam folder baru ikut diproses.
- Menampilkan status watcher.
- Menyimpan konfigurasi aktif ke SQLite.

---

## 5. Struktur Halaman

```text
/
├── tombol Display
├── link Gallery
└── link Settings

/display
├── video terbaru
├── QR Code
├── status playback
└── fallback aktivasi suara

/gallery
├── seluruh video
├── thumbnail
├── status
├── QR Code
└── filter

/admin
├── hot-folder path
├── process existing videos
└── watcher status
```

Navigasi internal harus menggunakan `navigateTo()` atau `<NuxtLink>` agar tetap menjadi navigasi SPA.

Hindari:

```js
window.location.href = "/display";
```

karena itu membuat full page navigation.

---

## 6. Struktur Folder yang Direkomendasikan

```text
private-qr-video/
├── app/
│   ├── components/
│   │   └── QrCode.vue
│   └── pages/
│       ├── index.vue
│       ├── display.vue
│       ├── gallery.vue
│       └── admin.vue
│
├── server/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── settings.get.js
│   │   │   └── settings.patch.js
│   │   └── videos/
│   │       ├── index.get.js
│   │       ├── index.post.js
│   │       ├── latest.get.js
│   │       └── [id]/
│   │           ├── index.get.js
│   │           ├── stream.get.js
│   │           └── thumbnail.get.js
│   │
│   ├── plugins/
│   │   ├── hot-folder.js
│   │   └── upload-worker.js
│   │
│   ├── services/
│   │   ├── hot-folder-manager.js
│   │   ├── video-watcher.js
│   │   ├── video-processor.js
│   │   ├── r2-uploader.js
│   │   └── upload-worker.js
│   │
│   └── utils/
│       ├── prisma.js
│       ├── r2-client.js
│       └── video-response.js
│
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── generated/
│   └── prisma/
│
├── prisma.config.ts
├── nuxt.config.js
├── package.json
└── .env
```

Sesuaikan nama file dengan struktur aktual repository apabila berbeda.

---

## 7. Persyaratan Sistem

Pastikan komputer memiliki:

- Bun;
- FFmpeg;
- FFprobe;
- akses internet untuk Cloudflare R2;
- izin membaca hot folder;
- izin menulis folder thumbnail;
- browser Chromium modern.

Cek instalasi:

```bash
bun --version
ffmpeg -version
ffprobe -version
```

---

## 8. Instalasi

### 8.1 Install dependency

```bash
bun install
```

### 8.2 Generate Prisma Client

```bash
bun run db:generate
```

### 8.3 Terapkan migration

```bash
bun run db:deploy
```

### 8.4 Jalankan development server

```bash
bun run dev
```

Akses:

```text
http://localhost:3000
```

---

## 9. Environment Variables

Contoh `.env`:

```env
DATABASE_URL="file:./dev.db"

NUXT_HOT_FOLDER_PATH="C:/Users/username/Videos/exports"
NUXT_THUMBNAIL_FOLDER_PATH="C:/Users/username/Videos/thumbnails"

NUXT_FFMPEG_PATH="ffmpeg"
NUXT_FFPROBE_PATH="ffprobe"

NUXT_R2_ACCOUNT_ID="your-cloudflare-account-id"
NUXT_R2_ACCESS_KEY_ID="your-r2-access-key-id"
NUXT_R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
NUXT_R2_BUCKET_NAME="your-r2-bucket-name"
NUXT_R2_DOWNLOAD_DOMAIN="https://download.example.com"
NUXT_R2_OBJECT_PREFIX="videos"

NUXT_UPLOAD_POLL_INTERVAL_MS="1000"
NUXT_UPLOAD_MAX_RETRIES="5"
```

### Catatan

- Gunakan forward slash pada path Windows agar lebih mudah dibaca.
- Jangan commit `.env`.
- Jangan menulis credential R2 ke log.
- `NUXT_HOT_FOLDER_PATH` hanya menjadi default awal. Setelah Admin menyimpan path baru, SQLite menjadi sumber konfigurasi utama.

---

## 10. Konfigurasi Nuxt

Contoh bagian `runtimeConfig`:

```js
export default defineNuxtConfig({
  runtimeConfig: {
    hotFolderPath: "",
    thumbnailFolderPath: "",
    ffmpegPath: "ffmpeg",
    ffprobePath: "ffprobe",

    r2AccountId: "",
    r2AccessKeyId: "",
    r2SecretAccessKey: "",
    r2BucketName: "",
    r2DownloadDomain: "",
    r2ObjectPrefix: "videos",

    uploadPollIntervalMs: 1000,
    uploadMaxRetries: 5,
  },
});
```

Environment variable dengan prefix `NUXT_` akan memetakan nilai ke runtime config.

---

## 11. Prisma Schema

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Video {
  id              String      @id @default(uuid())
  fileName        String
  localPath       String      @unique
  thumbnailPath   String?
  mimeType        String      @default("video/mp4")
  fileSize        BigInt?
  durationMs      Int?
  objectKey       String?     @unique
  downloadUrl     String?     @unique
  status          VideoStatus @default(DETECTED)
  retryCount      Int         @default(0)
  errorMessage    String?
  createdAt       DateTime    @default(now())
  queuedAt        DateTime?
  uploadStartedAt DateTime?
  lastAttemptAt   DateTime?
  uploadedAt      DateTime?
  updatedAt       DateTime    @updatedAt

  @@index([status, queuedAt])
  @@index([createdAt])
}

model AppConfig {
  id                    Int      @id @default(1)
  hotFolderPath         String
  processExistingVideos Boolean  @default(false)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum VideoStatus {
  DETECTED
  VALIDATING
  READY
  QUEUED
  UPLOADING
  QR_READY
  FAILED
}
```

`AppConfig` menggunakan row singleton dengan `id = 1`.

---

## 12. Prisma Config

`prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

Pastikan Prisma CLI dan runtime menggunakan `DATABASE_URL` yang sama.

---

## 13. Package Scripts

Tambahkan pada `package.json`:

```json
{
  "scripts": {
    "dev": "bun run db:deploy && nuxt dev",
    "build": "bun run db:generate && nuxt build",
    "preview": "bun run db:deploy && nuxt preview",

    "db:generate": "bunx --bun prisma generate",
    "db:migrate": "bunx --bun prisma migrate dev",
    "db:deploy": "bunx --bun prisma migrate deploy",
    "db:status": "bunx --bun prisma migrate status",
    "db:studio": "bunx --bun prisma studio",

    "setup": "bun run db:generate && bun run db:deploy"
  }
}
```

### Penggunaan

```bash
# Penggunaan harian
bun run dev

# Generate Prisma Client
bun run db:generate

# Membuat migration baru saat schema berubah
bunx --bun prisma migrate dev --name nama_perubahan

# Menerapkan migration yang sudah tersedia
bun run db:deploy

# Melihat status migration
bun run db:status

# Membuka Prisma Studio
bun run db:studio
```

`db:deploy` aman dijalankan sebelum startup karena hanya menerapkan migration yang belum diterapkan.

---

## 14. Alur Migration

### Saat schema berubah

Contoh menambah field baru:

```bash
bunx --bun prisma migrate dev --name add_video_has_audio
bun run db:generate
```

### Saat file database dihapus

Tidak perlu membuat migration baru dan tidak perlu generate ulang Prisma Client selama schema tidak berubah.

Cukup:

```bash
bun run dev
```

Startup akan menjalankan:

```text
prisma migrate deploy
→ membuat database jika belum ada
→ menerapkan seluruh migration
→ menjalankan Nuxt
```

### Saat ingin membuat ulang migration awal

Hanya lakukan sebelum migration digunakan pada production atau dibagikan ke tim lain.

```bash
rm -f dev.db
rm -rf prisma/migrations

bunx --bun prisma migrate dev --name init
bun run db:generate
```

---

## 15. Status Video

| Status | Arti |
|---|---|
| `DETECTED` | File sudah ditemukan watcher |
| `VALIDATING` | Sedang diperiksa FFprobe/FFmpeg |
| `READY` | File valid dan siap masuk antrean |
| `QUEUED` | Menunggu giliran upload |
| `UPLOADING` | Sedang di-upload ke R2 |
| `QR_READY` | Upload selesai dan URL download tersedia |
| `FAILED` | Proses validasi atau upload gagal |

Alur normal:

```text
DETECTED
→ VALIDATING
→ QUEUED
→ UPLOADING
→ QR_READY
```

Jika gagal:

```text
VALIDATING / UPLOADING
→ FAILED
```

---

## 16. Hot Folder Manager

Hot folder aktif tidak hanya dibaca dari `.env`.

Prioritas konfigurasi:

```text
SQLite AppConfig
→ jika kosong, gunakan .env
```

Saat Admin mengganti path:

```text
validasi folder baru
→ buat watcher baru
→ tunggu watcher ready
→ simpan konfigurasi
→ tutup watcher lama
```

File video lama:

- tidak disalin;
- tidak dipindahkan;
- tidak dihapus;
- tetap menggunakan `localPath` asli.

Jika file lama dihapus secara manual:

- record Gallery tetap ada;
- thumbnail dapat tetap tersedia;
- QR R2 tetap tersedia;
- local stream mengembalikan `404`.

---

## 17. Audio dan Autoplay

Browser membatasi autoplay dengan suara.

Aplikasi menggunakan alur:

```text
User membuka /
→ klik tombol Display
→ set useState("display-audio-unlocked") = true
→ navigateTo("/display")
→ video mencoba play dalam kondisi unmuted
```

State:

```js
const audioUnlocked = useState(
  "display-audio-unlocked",
  () => false,
);
```

Halaman lain yang membutuhkan state tersebut harus memanggil `useState()` menggunakan key yang sama.

State ini:

- bertahan selama navigasi SPA;
- tidak dimaksudkan sebagai penyimpanan permanen;
- tidak menggantikan browser autoplay policy;
- kembali tidak dapat dipercaya setelah full refresh.

Selalu tangani Promise dari `video.play()`:

```js
try {
  await videoElement.value.play();
} catch (error) {
  // tampilkan fallback button untuk aktivasi suara
}
```

---

## 18. Video Stream Endpoint

Endpoint:

```text
GET /api/videos/:id/stream
```

Fungsinya:

- mencari `localPath` dari Prisma;
- memastikan file masih ada;
- membaca header `Range`;
- mengirim status `206 Partial Content` jika diperlukan;
- menggunakan `sendStream()` untuk response binary.

Header penting:

```text
Content-Type: video/mp4
Accept-Ranges: bytes
Content-Range: bytes start-end/size
Content-Length: chunk-size
```

Endpoint harus mendukung browser melakukan seek dan progressive playback.

---

## 19. Thumbnail Endpoint

Endpoint:

```text
GET /api/videos/:id/thumbnail
```

Fungsinya:

- mencari `thumbnailPath` dari Prisma;
- memastikan file thumbnail masih tersedia;
- menentukan content type;
- mengirim JPG melalui stream.

Browser tidak boleh menerima path Windows langsung. Browser hanya menerima URL virtual aplikasi.

Contoh:

```text
/api/videos/VIDEO_ID/thumbnail
/api/videos/VIDEO_ID/stream
```

---

## 20. API Routes

### Video

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/videos` | List dan filter Gallery |
| `POST` | `/api/videos` | Membuat record manual jika diperlukan |
| `GET` | `/api/videos/latest` | Mengambil video terbaru |
| `GET` | `/api/videos/:id` | Detail satu video |
| `GET` | `/api/videos/:id/stream` | Stream video lokal |
| `GET` | `/api/videos/:id/thumbnail` | Menampilkan thumbnail |

### Admin

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/admin/settings` | Membaca hot folder dan status watcher |
| `PATCH` | `/api/admin/settings` | Mengganti hot folder aktif |

Contoh body PATCH:

```json
{
  "hotFolderPath": "D:/CapCut/Exports",
  "processExistingVideos": false
}
```

---

## 21. Serializer API

`serializeVideo()` digunakan untuk memisahkan model database dari response API.

Tanggung jawabnya:

- tidak mengekspos `localPath`;
- tidak mengekspos `thumbnailPath`;
- mengubah `BigInt` menjadi string;
- menghasilkan `streamUrl`;
- menghasilkan `thumbnailUrl`;
- menghasilkan `qrReady`;
- menjaga response konsisten.

Contoh response:

```json
{
  "id": "video-uuid",
  "fileName": "event-video.mp4",
  "fileSize": "11485760",
  "durationMs": 15000,
  "status": "QR_READY",
  "streamUrl": "/api/videos/video-uuid/stream",
  "thumbnailUrl": "/api/videos/video-uuid/thumbnail",
  "downloadUrl": "https://download.example.com/videos/video-uuid.mp4",
  "qrReady": true
}
```

---

## 22. R2 Object Naming

Object key menggunakan ID video:

```text
videos/{video.id}.mp4
```

Contoh:

```text
videos/5e459030-5c87-462d-931b-6ef739e33043.mp4
```

Keuntungan:

- nama object unik;
- retry upload tetap menggunakan key yang sama;
- nama file asli tidak perlu diekspos;
- URL sulit ditebak secara acak.

Namun URL publik dengan UUID tetap merupakan **unguessable public URL**, bukan sistem autentikasi file privat.

---

## 23. Menjalankan Production Build

Build:

```bash
bun run build
```

Preview hasil build:

```bash
bun run preview
```

Jangan menggunakan `bun run dev` untuk event production karena development server memiliki hot reload dan perilaku plugin yang berbeda.

Untuk penggunaan event jangka panjang, jalankan output Nitro melalui process manager atau startup script yang dapat menghidupkan ulang aplikasi apabila crash.

---

## 24. Checklist Sebelum Event

- [ ] Jalankan production build.
- [ ] Pastikan FFmpeg dan FFprobe tersedia.
- [ ] Pastikan hot folder benar.
- [ ] Pastikan thumbnail folder dapat ditulis.
- [ ] Pastikan credential R2 valid.
- [ ] Pastikan custom domain download aktif.
- [ ] Test satu video portrait.
- [ ] Test satu video landscape.
- [ ] Test video dengan audio.
- [ ] Test dua video masuk hampir bersamaan.
- [ ] Test upload ketika internet terputus.
- [ ] Test recovery setelah aplikasi restart.
- [ ] Test QR membuka file yang benar.
- [ ] Test Gallery dan filter.
- [ ] Test perubahan hot folder.
- [ ] Test fallback autoplay setelah refresh.
- [ ] Pastikan output audio Windows benar.
- [ ] Backup SQLite sebelum event.

---

## 25. Skenario Pengujian

### Test 1 — Video normal

1. Export MP4 ke hot folder.
2. Pastikan watcher mendeteksi file.
3. Pastikan thumbnail muncul.
4. Pastikan status berubah ke `QUEUED`.
5. Pastikan worker meng-upload video.
6. Pastikan status menjadi `QR_READY`.
7. Scan QR dan download video.

### Test 2 — Banyak video

1. Masukkan 20–50 video secara berurutan.
2. Pastikan hanya satu upload aktif.
3. Pastikan video terbaru selalu tampil di Display.
4. Pastikan QR setiap video tidak tertukar.

### Test 3 — Internet terputus

1. Putuskan internet ketika upload berjalan.
2. Pastikan status menjadi `FAILED` atau kembali ke antrean sesuai worker.
3. Hidupkan internet kembali.
4. Pastikan retry bekerja.

### Test 4 — Restart aplikasi

1. Hentikan aplikasi ketika ada status `UPLOADING`.
2. Jalankan kembali aplikasi.
3. Pastikan worker tidak membuat upload paralel.
4. Pastikan record diproses kembali.

### Test 5 — File lokal dihapus

1. Upload video sampai `QR_READY`.
2. Hapus file lokal secara manual.
3. Pastikan local stream menjadi `404`.
4. Pastikan thumbnail dan QR tetap dapat digunakan.

---

## 26. Troubleshooting

### `SQLITE_ERROR: no such table: main.Video`

Penyebab:

- migration belum diterapkan;
- aplikasi membuka file database berbeda;
- database baru dibuat tetapi masih kosong.

Perbaikan:

```bash
bun run db:status
bun run db:deploy
```

Pastikan output status:

```text
Database schema is up to date!
```

### `SQLITE_ERROR: no such table: main.AppConfig`

Sama seperti kasus `Video`. Pastikan migration yang membuat `AppConfig` tersedia dan sudah diterapkan.

### Migration tersedia tetapi belum applied

```bash
bunx --bun prisma migrate status
bunx --bun prisma migrate deploy
```

### Database dan runtime berbeda

Cari seluruh file database:

```powershell
Get-ChildItem -Path . -Filter *.db -Recurse
```

Pastikan Prisma CLI dan runtime sama-sama menggunakan:

```env
DATABASE_URL="file:./dev.db"
```

### Video tidak bersuara

Periksa:

- halaman Display dibuka melalui tombol dari `/`;
- elemen video tidak `muted`;
- volume video `1`;
- tab browser tidak di-mute;
- output audio Windows benar;
- file benar-benar memiliki audio stream.

Cek audio stream:

```bash
ffprobe -v error -select_streams a -show_streams "video.mp4"
```

### Video tidak dapat diputar

Target export yang aman:

```text
Container: MP4
Video codec: H.264
Audio codec: AAC
```

MP4 hanyalah container. Codec di dalamnya tetap harus didukung browser.

### Thumbnail tidak muncul

Periksa:

- `thumbnailPath` pada database;
- folder thumbnail masih tersedia;
- FFmpeg berhasil dijalankan;
- endpoint thumbnail mengembalikan `200`;
- file JPG tidak terhapus.

### Hot folder tidak aktif

Periksa:

- path absolut benar;
- folder benar-benar ada;
- proses memiliki izin membaca;
- path bukan file;
- log Hot Folder Manager;
- `GET /api/admin/settings`.

### Gallery error `getStatusLabel is not a function`

Template memanggil function yang tidak tersedia di `<script setup>`.

Pastikan function seperti berikut masih didefinisikan:

```js
function getStatusLabel(status) {
  // mapping status
}
```

### Stream mengembalikan `404`

Record database masih ada, tetapi file pada `localPath` sudah dipindahkan atau dihapus.

QR R2 tetap dapat berfungsi selama object R2 masih tersedia.

---

## 27. Backup

SQLite menyimpan metadata penting:

- daftar video;
- status upload;
- URL R2;
- retry count;
- error history;
- hot folder aktif.

Lakukan backup ketika aplikasi berhenti.

Contoh:

```bash
cp dev.db backups/private-qr-video-$(date +%Y%m%d-%H%M%S).db
```

Pada Windows, backup juga dapat dilakukan dengan menyalin file database ketika aplikasi tidak berjalan.

Menghapus database tidak menghapus file lokal atau object R2, tetapi aplikasi kehilangan metadata untuk menghubungkannya kembali.

---

## 28. Logging yang Disarankan

Minimal simpan log berikut:

- watcher started;
- watcher stopped;
- active folder changed;
- file detected;
- validation success/failure;
- thumbnail generated;
- upload queued;
- upload started;
- upload completed;
- upload retry;
- R2 error;
- local stream file missing.

Jangan pernah mencatat:

- R2 secret access key;
- access token;
- isi `.env` lengkap.

---

## 29. Batasan Sistem

- Berjalan untuk satu komputer lokal.
- Belum memiliki authentication admin.
- URL R2 publik dapat dibagikan ulang.
- Local playback bergantung pada keberadaan file asli.
- Browser tetap memiliki keputusan akhir mengenai autoplay suara.
- Belum ada sinkronisasi multi-device.
- Belum ada mekanisme revoke URL.
- Belum ada managed local video library.

---

## 30. Pengembangan Lanjutan

Fitur yang dapat ditambahkan:

- tombol retry manual untuk video `FAILED`;
- indikator progress upload;
- validasi codec H.264/AAC;
- field `hasAudio`;
- log file terstruktur;
- automatic SQLite backup;
- private R2 bucket dan signed URL;
- authentication halaman Admin;
- health check worker dan watcher;
- cleanup otomatis thumbnail lama;
- downloadable event report;
- packaged desktop application menggunakan Tauri atau Electron;
- native folder picker.

---

## 31. Ringkasan Arsitektur

```text
Nuxt UI
├── Menu
├── Display
├── Gallery
└── Admin

Nitro API
├── video metadata
├── video stream
├── thumbnail stream
└── admin settings

Background services
├── Chokidar watcher
├── FFprobe validation
├── FFmpeg thumbnail
└── R2 upload worker

Persistence
├── SQLite metadata
├── local video files
├── local thumbnails
└── Cloudflare R2 objects
```

Prinsip utama proyek:

- SQLite hanya menyimpan metadata.
- Video dan thumbnail tetap berupa file binary.
- Browser tidak menerima path Windows langsung.
- Upload berjalan serial dan persisten.
- Hot folder dapat berubah tanpa menghapus Gallery.
- Video terbaru langsung menggantikan video sebelumnya pada Display.

---

## 32. Quick Start

```bash
bun install
bun run setup
bun run dev
```

Kemudian:

1. Buka `http://localhost:3000`.
2. Masuk ke Settings dan periksa hot folder.
3. Klik Display dari halaman utama agar aplikasi mencoba mengaktifkan autoplay suara.
4. Export video MP4 ke hot folder.
5. Tunggu QR Code muncul setelah upload selesai.

