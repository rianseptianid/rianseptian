# nurearn (v1.2.0)

<div align="center">

![nurearn Logo](assets/icon.ico)

**Platform Desktop Interaktif untuk Streamer TikTok LIVE**  
*Monitor event realtime, trigger otomatis, TTS Edge Neural, overlay interaktif OBS, dan pemutar musik YouTube.*

[![Version](https://img.shields.io/badge/version-1.2.0-amber.svg)](https://github.com/nurearn/nurearn/releases)
[![Electron](https://img.shields.io/badge/Electron-31.7.7-blue.svg)](https://electronjs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-green.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)]()

</div>

---

## 📖 Tentang nurearn

**nurearn** adalah aplikasi desktop berbasis Electron & Node.js yang dirancang khusus untuk mempermudah dan memaksimalkan interaksi penonton pada siaran langsung **TikTok LIVE**. Dengan aplikasi ini, setiap event siaran (Gift, Chat, Like, Share, Follow) dapat dihubungkan langsung ke berbagai aksi di komputer host maupun di overlay OBS secara otomatis dan realtime.

Aplikasi ini telah dioptimalkan untuk sesi live berdurasi panjang (8+ jam) dengan sistem manajemen memori aktif (*DOM auto-trimming* dan pencegahan kebocoran RAM/event listener).

---

## ✨ Fitur Utama

### 1. 🎯 TikTok LIVE Real-Time Connector
- Koneksi langsung ke ruang siaran TikTok LIVE tanpa perlu OBS Virtual Camera.
- Memantau event secara instan: **Chat, Gift, Like, Follow, Share, Join, Subscribe, Battle (PK), dan Viewer Count**.
- Pembersihan listener otomatis (*garbage collection*) saat reconnect untuk menjaga RAM tetap stabil di kisaran rendah.

### 2. ⚡ Powerful Trigger Engine
Memetakan event TikTok ke berbagai aksi otomatis:
- **Keyboard Keystrokes & Hotkeys**: Mengirim tombol keyboard tunggal (`A`, `Space`, `Enter`), tombol khusus (`Numpad0`-`Numpad9`, `F1`-`F24`), kombinasi (`Ctrl+Shift+A`), atau sekuens berantai (`W,A,S,D`) langsung ke aplikasi atau game aktif melalui driver native.
- **Sound Effect (SFX)**: Memutar file audio lokal (`.mp3`, `.wav`) dengan opsi antrean (*queue*) atau tumpang-tindih (*overlap*).
- **Overlay Media Alert**: Menampilkan gambar (`.png`, `.jpg`, `.gif`, `.webp`) atau video (`.mp4`, `.webm`) di layar stream dengan kontrol durasi dan animasi.
- **Dukungan Combo & Minimal Gift**: Pengaturan khusus untuk hanya memicu trigger setelah rentetan combo gift selesai (*streak ended*) atau berdasarkan ambang jumlah koin tertentu.
- **Test Run Mandiri**: Tombol pengujian instan untuk setiap trigger sebelum dipakai saat live.

### 3. 🎙️ Edge Neural Text-to-Speech (TTS) Reader
- Menggunakan suara AI natural berteknologi tinggi **Microsoft Edge Neural** (seperti ID-ArdiNeural, ID-GadisNeural, serta opsi multilingual).
- Fallback cerdas ke sistem suara lokal SAPI saat offline atau koneksi terputus.
- Normalisasi bahasa gaul & singkatan Indonesia (misal: *wkwk*, *bgt*, *yg*, *gk*).
- Pengucapan angka & mata uang yang rapi dalam Bahasa Indonesia.
- Filter sensor kata kasar (*blacklist filter*) yang dapat disesuaikan.
- Caching audio terisolasi untuk menghemat bandwidth dan menghilangkan delay pembacaan.

### 4. 📺 OBS Transparent Overlays
Server lokal berbasis Express + WebSocket (`http://localhost:8642/overlay`) siap dipasang sebagai *Browser Source* transparan di OBS Studio / Streamlabs:
- **Chat Box Alert**: Tampilan chat bergaya modern.
- **Gift Notification**: Notifikasi popup gift dengan animasi halus.
- **Top Gifter Leaderboard**: Menampilkan 5 donatur teratas secara dinamis.
- **Goal Progress Bar**: Target gift atau koin interaktif dengan efek perayaan saat target tercapai.
- **Battle / PK Overlay**: Tampilan duel interaktif.
- **Public Tunneling**: Terintegrasi dengan Cloudflare Tunnel & LocalTunnel untuk menampilkan overlay di perangkat lain dalam jaringan berbeda.

### 5. 🎵 Interactive YouTube Player
- Pemutar YouTube bawaan (*BrowserWindow*) terisolasi di latar belakang.
- Penonton dapat meminta lagu (*song request*) via chat atau gift tertentu.
- Manajemen antrean pemutaran lagu otomatis dengan sinkronisasi ke overlay musik.

### 6. 🎹 Soundboard & Global Hotkeys
- Soundboard internal dengan pintasan tombol global (*global hooks*) yang dapat diaktifkan kapan saja meski aplikasi nurearn sedang di-*minimize*.

### 7. 🚀 Auto-Update Notifier
- Pengecekan versi pembaruan otomatis di latar belakang melalui GitHub Releases API.
- Menampilkan banner emas yang elegan dan tidak mengganggu sesi siaran saat ada versi baru dirilis.

### 8. 🛡️ Keamanan & Lisensi Terintegrasi
- Sistem aktivasi berbasis Device Hardware ID (`node-machine-id`) yang divalidasi dengan Firebase.
- Pipeline build aman dengan proteksi obfuscation kode dan pengemasan ASAR.

---

## 📁 Struktur Direktori

```
xumuid-studio/
├── main.js                     # Proses utama Electron, orkestrasi modul & IPC
├── preload.js                   # Bridge komunikasi aman (Context Isolation)
├── package.json                 # Konfigurasi dependensi & build
├── src/
│   ├── tiktokConnector.js       # Driver koneksi TikTok LIVE & event emitter
│   ├── triggerEngine.js         # Evaluasi kondisi & eksekusi trigger
│   ├── giftManager.js           # Database koin & katalog gift TikTok
│   ├── goalManager.js           # Pengelola progress bar target donasi
│   ├── keySender.js             # Generator input keyboard native (nut-js)
│   ├── ttsEngine.js             # Engine sintesis suara Microsoft Edge Neural
│   ├── ttsReader.js             # Antrean & parser teks TTS
│   ├── youtubeManager.js        # Manajer pemutar YouTube background
│   ├── overlayServer.js         # Web server lokal (Express + WS) untuk OBS
│   ├── tunnelManager.js         # Cloudflare Tunnel & LocalTunnel integration
│   ├── LicenseManager.js        # Validasi lisensi hardware & sinkronisasi
│   ├── updater.js               # Auto-update background checker
│   ├── logger.js                # Logger harian & siaran log ke UI
│   └── configManager.js         # Penyimpanan pengaturan persisten (JSON)
├── renderer/                    # Antarmuka Pengguna (UI)
│   ├── index.html               # Halaman utama aplikasi
│   ├── css/
│   │   └── style.css            # Styling tema hitam & emas (Dark Luxury)
│   └── js/
│       ├── app.js               # Logika kontrol UI renderer
│       ├── updater-ui.js        # Kontrol banner update
│       ├── dom-trim.js          # Optimasi memori DOM untuk streaming panjang
│       ├── tts.js               # Pengaturan suara TTS di UI
│       └── youtube.js           # Antarmuka kontrol musik
├── overlay/                     # Template Browser Source OBS
│   ├── index.html               # Overlay all-in-one transparan
│   ├── battle.html              # Overlay khusus mode battle
│   ├── player.html              # Overlay pemutar musik
│   └── goal.html                # Overlay progress goal
├── assets/                      # Ikon & grafis aplikasi
└── scripts/                     # Skrip build & proteksi kode
```

---

## 💻 Panduan Instalasi & Pengembangan

### Prasyarat
- **Node.js**: v18.x atau v20.x LTS
- **Sistem Operasi**: Windows 10/11 64-bit
- **Build Tools** (opsional untuk modul native): `npm install --global --production windows-build-tools`

### Langkah Pemasangan
1. Clone repositori ini atau ekstrak file proyek:
   ```bash
   git clone https://github.com/nurearn/nurearn.git
   cd nurearn
   ```
2. Pasang semua dependensi:
   ```bash
   npm install
   ```
3. Jalankan aplikasi dalam mode pengembangan:
   ```bash
   npm start
   ```

### Membangun Installer Produksi (.exe)
Untuk membuat installer Windows NSIS 64-bit yang terproteksi dan terkompresi:
```bash
npm run build:win
```
Hasil file installer (`nurearn Setup 1.2.0.exe`) akan otomatis dibuat di folder `dist/`.

---

## 🎮 Panduan Penggunaan Singkat

1. **Hubungkan ke TikTok**:
   - Masukkan username TikTok akun yang sedang live (tanpa `@`) pada form di sidebar, lalu klik **Connect**.
2. **Setup Trigger**:
   - Buka tab **Triggers**, klik **Tambah Trigger**.
   - Tentukan event pemicu (Gift tertentu, Like, atau Komentar).
   - Tentukan aksi balasan: tekan tombol game, bunyikan efek suara, sebutkan nama donatur lewat TTS, atau tampilkan video lucu di layar.
3. **Pasang di OBS Studio**:
   - Buka tab **Overlay**, salin URL yang tertera (misal: `http://localhost:8642/overlay`).
   - Di OBS Studio, tambahkan sumber baru: **Browser Source**.
   - Tempelkan URL tersebut, atur resolusi sesuai kanvas (misal: `1920x1080`), dan centang *"Shutdown source when not visible"* bila diperlukan.
4. **TTS Otomatis**:
   - Atur suara favorit Anda di tab **TTS** (rekomendasi: *ID-ArdiNeural* atau *ID-GadisNeural*). Aktifkan filter sensor kata untuk menjaga siaran tetap ramah penonton.

---

## ⚖️ Open Source Acknowledgements & Licenses

Sebagai bentuk penghargaan dan kepatuhan terhadap komunitas pengembang perangkat lunak sumber terbuka (Open Source Community), proyek ini dibangun dengan memanfaatkan karya luar biasa dari repositori-repositori berikut:

| Pustaka / Proyek | Lisensi | Penggunaan dalam nurearn | Hak Cipta / Pengembang |
|---|---|---|---|
| [**tiktok-live-connector**](https://github.com/zerodya/TikTok-Live-Connector) | MIT | Integrasi WebCast TikTok LIVE & penanganan event stream | © Zerodya |
| [**msedge-tts**](https://github.com/SchneeHertz/node-msedge-tts) | MIT | Sintesis suara Microsoft Edge Neural TTS | © SchneeHertz |
| [**@nut-tree-fork/nut-js**](https://github.com/nut-tree/nut.js) | Apache-2.0 | Automasi input keyboard dan penekanan tombol native | © nut-tree.net |
| [**uiohook-napi**](https://github.com/kfish/uiohook-napi) | Apache-2.0 / LGPL | Global key hook listener untuk soundboard | © Rafael R. Camargo & contributors |
| [**electron**](https://github.com/electron/electron) | MIT | Kerangka kerja desktop cross-platform | © OpenJS Foundation & Electron contributors |
| [**electron-builder**](https://github.com/electron-userland/electron-builder) | MIT | Solusi pengemasan aplikasi dan pembuatan installer NSIS | © Vladimir Krivosheev |
| [**express**](https://github.com/expressjs/express) | MIT | Server HTTP lokal untuk penyedia aset overlay OBS | © StrongLoop, Inc. & Express contributors |
| [**ws**](https://github.com/websockets/ws) | MIT | Komunikasi realtime WebSocket antara backend dan overlay OBS | © Einar Otto Stangvik |
| [**cloudflared**](https://github.com/cloudflare/cloudflared) | Apache-2.0 | Penyedia tunnel aman Cloudflare untuk akses overlay publik | © Cloudflare, Inc. |
| [**localtunnel**](https://github.com/localtunnel/localtunnel) | MIT | Penyedia tunneling alternatif untuk akses overlay jarak jauh | © Roman Shtylman |
| [**node-machine-id**](https://github.com/automation-stack/node-machine-id) | BSD-3-Clause | Identifikasi unik hardware perangkat untuk sistem lisensi | © Automation Stack |
| [**play-dl**](https://github.com/play-dl/play-dl) | MIT | Ekstraksi dan pemutaran audio/video YouTube | © Play-dl contributors |
| [**@distube/ytdl-core**](https://github.com/distubejs/ytdl-core) | MIT | Modul pengurai stream media YouTube alternatif | © DisTube |
| [**say**](https://github.com/Marak/say.js) | MIT | Fallback Text-to-Speech lokal untuk Windows SAPI | © Marak Squires |
| [**firebase**](https://github.com/firebase/firebase-js-sdk) | Apache-2.0 | Sinkronisasi status lisensi dan autentikasi jarak jauh | © Google LLC |
| [**javascript-obfuscator**](https://github.com/javascript-obfuscator/javascript-obfuscator) | BSD-2-Clause | Proteksi dan obfusikasi kode JavaScript produksi | © Timofey Kachalov |
| [**Lucide Icons**](https://github.com/lucide-icons/lucide) | ISC / MIT | Koleksi ikon antarmuka pengguna | © Lucide Contributors |
| [**Google Fonts**](https://fonts.google.com/) *(Inter, Fredoka, Montserrat, dll.)* | SIL Open Font License 1.1 | Tipografi antarmuka aplikasi dan overlay | © Desainer Font masing-masing |

> Seluruh lisensi asli dari masing-masing pustaka pihak ketiga di atas dihormati dan tetap melekat pada distribusi masing-masing modul terkait.

---

## 📄 Lisensi Proyek

Aplikasi **nurearn** didistribusikan di bawah lisensi [MIT License](LICENSE).  
Copyright (c) 2024–2026 nurearn.
# basic-nurearn
