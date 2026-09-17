# nurearn (v1.3.0)

<div align="center">

![nurearn Logo](assets/icon.ico)

**Platform Desktop Interaktif untuk Streamer TikTok LIVE**  
*Monitor event realtime, trigger otomatis, TTS Edge Neural, overlay interaktif OBS, dan pemutar musik YouTube.*

[![Version](https://img.shields.io/badge/version-1.3.0-amber.svg)](https://github.com/nurearn/basic-nurearn/releases)
[![Electron](https://img.shields.io/badge/Electron-31.7.7-blue.svg)](https://electronjs.org)
[![Platform](https://img.shields.io/badge/Platform-Windows%20x64-green.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)]()

</div>

---

## 📖 Tentang nurearn

**nurearn** adalah aplikasi desktop modern berbasis Electron & Node.js yang dirancang khusus untuk mempermudah dan memaksimalkan interaksi penonton pada siaran langsung **TikTok LIVE**. Dengan aplikasi ini, setiap event siaran (Gift, Chat, Like, Share, Follow, Join, Subscribe) dapat dihubungkan langsung ke berbagai aksi di komputer host maupun di overlay OBS secara otomatis, simultan, dan realtime.

Pada **versi 1.3.0**, nurearn hadir dengan arsitektur yang lebih ringan, tidak memerlukan hak akses administrator (*non-elevated*), tetap berjalan penuh saat diminimize, memiliki sistem pembersihan cache otomatis (*safe auto-cache cleanup*), eksekusi aksi paralel (keystroke, sound, dan overlay bersamaan), serta keamanan kode terobfuskasi maksimal.

---

## ✨ Fitur Utama (v1.3.0)

### 1. 🚀 Non-Administrator & Instalasi Bersih
- **Berjalan Tanpa Run as Administrator**: Menggunakan konfigurasi UAC `asInvoker` dan instalasi per-user (`%LOCALAPPDATA%\Programs\nurearn`) sehingga aman dan tidak membutuhkan elevated privileges.
- **Clean First-Time Install**: Pemasangan awal 100% bersih (dashboard 0 statistik, soundboard kosong, riwayat kosong murni).
- **Migrasi Konfigurasi v1.2.0**: Mendukung deteksi otomatis serta tombol **"Impor Preset (JSON)"** untuk langsung memakai konfigurasi `config.json` dari versi 1.2.0 sebelumnya tanpa perlu setting ulang.

### 2. ⚡ Minimalkan Aplikasi Tanpa Hambatan (Full Background Operation)
- Didukung flag Chromium `disable-background-timer-throttling`, `disable-renderer-backgrounding`, dan `backgroundThrottling: false`.
- Saat jendela aplikasi di-minimize, seluruh fungsi tetap aktif 100%: **keystroke game, soundboard, animasi overlay OBS, pembacaan TTS, dan live feed TikTok**.

### 3. 🍃 Ringan, Hemat Resource & Pembersihan Cache Aman
- **Batas Memori Terkelola**: Alokasi heap V8 dioptimalkan (`--max-old-space-size=384`) dan batas renderer process untuk konsumsi RAM dan CPU yang sangat rendah.
- **Auto-Hapus Cache Otomatis**: Scheduler pembersihan berkala berjalan setiap 10 menit membersihkan HTTP session cache dan V8 code cache tanpa mengganggu token login, session cookies, atau streaming yang sedang berjalan.
- **DOM Auto-Trimming**: Live Chat Feed dibatasi maksimal 200 pesan dan Gift Feed maksimal 100 elemen agar tidak terjadi memory leak selama sesi live berjam-jam (8+ jam nonstop).

### 4. 🎯 TikTok LIVE Real-Time Connector & Live Chat Feed
- Koneksi langsung ke ruang siaran TikTok LIVE tanpa perlu OBS Virtual Camera.
- Memantau event secara instan: **Chat, Gift, Like, Follow, Share, Member Join, Subscribe, Battle (PK), dan Viewer Count**.
- **Live Chat Feed Terintegrasi**: Kotak chat feed interaktif di Dashboard menampilkan komentar penonton dan notifikasi penonton bergabung (*join*) secara realtime, dilengkapi tombol *Bersihkan Chat*.

### 5. 🎮 Trigger Engine & Eksekusi Multi-Aksi Simultan
Memetakan event TikTok ke berbagai aksi otomatis secara non-blocking:
- **Simultaneous Action Execution**: Tombol keyboard, efek audio, dan overlay alert dapat berjalan bersamaan secara simultan tanpa jeda antrian (*non-blocking*).
- **Keyboard Keystrokes & Hotkeys**: Mengirim tombol keyboard tunggal (`A`, `Space`, `Enter`), tombol khusus (`Numpad0`-`Numpad9`, `F1`-`F24`), kombinasi (`Ctrl+Shift+A`), atau sekuens berantai (`W,A,S,D`) langsung ke game/aplikasi target melalui driver native.
- **Interactive Keyboard Modal**: Dialog pemilihan tombol keyboard visual interaktif untuk mempermudah pengaturan key binding.
- **Sound Effect (SFX)**: Memutar file audio lokal (`.mp3`, `.wav`) dengan kontrol volume dan opsi tumpang-tindih (*overlap*).
- **Overlay Media Alert**: Menampilkan gambar (`.png`, `.jpg`, `.gif`, `.webp`) atau video (`.mp4`, `.webm`) di layar stream dengan kontrol durasi dan animasi.
- **Dukungan Combo & Minimal Gift**: Pengaturan khusus untuk memicu trigger setelah rentetan combo gift selesai (*streak ended*) atau berdasarkan ambang jumlah koin tertentu.
- **Test Run Mandiri**: Tombol pengujian instan untuk setiap trigger sebelum dipakai saat live streaming.

### 6. 🎙️ Edge Neural Text-to-Speech (TTS) Reader
- Menggunakan suara AI natural berteknologi tinggi **Microsoft Edge Neural** (seperti ID-ArdiNeural, ID-GadisNeural, serta opsi multilingual).
- Fallback cerdas ke sistem suara lokal Windows SAPI saat offline atau koneksi terputus.
- Normalisasi bahasa gaul & singkatan Indonesia (misal: *wkwk*, *bgt*, *yg*, *gk*).
- Pengucapan angka & mata uang yang rapi dalam Bahasa Indonesia.
- Filter sensor kata kasar (*blacklist filter*) yang dapat disesuaikan.
- Caching audio terisolasi untuk menghemat bandwidth dan menghilangkan delay pembacaan.

### 7. 📺 OBS Transparent Overlays
Server lokal berbasis Express + WebSocket (`http://localhost:8642/overlay`) siap dipasang sebagai *Browser Source* transparan di OBS Studio / Streamlabs:
- **Chat Box Alert**: Tampilan chat bergaya modern.
- **Gift Notification**: Notifikasi popup gift dengan animasi halus.
- **Top Gifter Leaderboard**: Menampilkan 5 donatur teratas secara dinamis.
- **Goal Progress Bar**: Target gift atau koin interaktif dengan efek perayaan saat target tercapai.
- **Battle / PK Overlay**: Tampilan duel interaktif.
- **Public Tunneling**: Terintegrasi dengan Cloudflare Tunnel & LocalTunnel untuk menampilkan overlay di perangkat lain dalam jaringan berbeda.

### 8. 🎵 Interactive YouTube Player
- Pemutar YouTube bawaan (*BrowserWindow*) terisolasi di latar belakang.
- Penonton dapat meminta lagu (*song request*) via chat atau gift tertentu.
- Manajemen antrean pemutaran lagu otomatis dengan sinkronisasi ke overlay musik.

### 9. 🎹 Soundboard & Global Hotkeys
- Soundboard internal dengan pintasan tombol global (*global hooks*) yang dapat diaktifkan kapan saja meski aplikasi nurearn sedang di-*minimize*.

### 10. 🛡️ Proteksi Keamanan Kode Maksimal (Anti-Tamper & Obfuscation)
- Seluruh file JavaScript produksi (`main.js`, `preload.js`, controller UI, engine triggers, dan server overlay) diacak menggunakan pipeline `build-secure.js` dengan:
  - *Control Flow Flattening*
  - Enkripsi String via cipher Base64 & RC4
  - *Dead Code Injection* dan *Variable Mangling*
  - Pengemasan ASAR terproteksi untuk mencegah tampering dan reverse engineering.

---

## 📁 Struktur Direktori

```
xumuid-studio/
├── main.js                     # Proses utama Electron, orkestrasi modul, cache cleaner & IPC
├── preload.js                   # Bridge komunikasi aman (Context Isolation)
├── package.json                 # Konfigurasi dependensi, NSIS non-admin & metadata v1.3.0
├── src/
│   ├── tiktokConnector.js       # Driver koneksi TikTok LIVE & event emitter
│   ├── triggerEngine.js         # Evaluasi kondisi & eksekusi multi-aksi simultan
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
│   └── configManager.js         # Penyimpanan pengaturan persisten & migrasi v1.2.0
├── renderer/                    # Antarmuka Pengguna (UI)
│   ├── index.html               # Dashboard utama aplikasi
│   ├── css/
│   │   └── style.css            # Styling tema hitam & emas (Dark Luxury)
│   └── js/
│       ├── app.js               # Controller inisialisasi aplikasi
│       ├── dashboardStats.js    # Pengelola statistik realtime live
│       ├── liveChatFeed.js      # Controller live chat & join feed realtime
│       ├── interactionsController.js # Manajemen interaksi & action library
│       ├── keyboardModal.js     # Modal interaktif input keyboard
│       ├── goalsController.js   # Pengaturan target & progress goals
│       ├── giftsController.js   # Katalog & pengaturan trigger gift
│       ├── soundboard.js        # Soundboard & global hotkeys
│       ├── dom-trim.js          # Optimasi memori DOM untuk streaming panjang
│       ├── tts.js               # Pengaturan suara TTS di UI
│       └── youtube.js           # Antarmuka kontrol musik
├── overlay/                     # Template Browser Source OBS
│   ├── index.html               # Overlay all-in-one transparan
│   ├── battle.html              # Overlay khusus mode battle
│   ├── player.html              # Overlay pemutar musik
│   └── goal.html                # Overlay progress goal
├── assets/                      # Ikon & grafis aplikasi
└── scripts/
    └── build-secure.js          # Pipeline build produksi berproteksi obfuscation RC4/Base64
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
   git clone https://github.com/nurearn/basic-nurearn.git
   cd basic-nurearn
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
Untuk membuat installer Windows NSIS 64-bit yang terproteksi, terobfuskasi maksimal, dan siap pakai tanpa administrator:
```bash
npm run build:secure
```
Hasil file installer (`nurearn Setup 1.3.0.exe`) akan otomatis dibuat di folder `dist/`.

---

## 🎮 Panduan Penggunaan Singkat

1. **Hubungkan ke TikTok**:
   - Masukkan username TikTok akun yang sedang live (tanpa `@`) pada form di sidebar, lalu klik **Connect**.
2. **Setup Interaksi & Trigger**:
   - Buka tab **Interaksi**, klik **Tambah Interaksi**.
   - Tentukan event pemicu (Gift tertentu, Like, Komentar, atau Bergabung).
   - Tentukan aksi balasan: tekan tombol game (bisa memilih via visual keyboard modal), bunyikan efek suara, sebutkan nama donatur lewat TTS, atau tampilkan animasi media di layar secara simultan.
3. **Pasang di OBS Studio**:
   - Buka tab **Overlay**, salin URL yang tertera (misal: `http://localhost:8642/overlay`).
   - Di OBS Studio, tambahkan sumber baru: **Browser Source**.
   - Tempelkan URL tersebut, atur resolusi sesuai kanvas (misal: `1920x1080`), dan centang *"Shutdown source when not visible"* bila diperlukan.
4. **TTS Otomatis**:
   - Atur suara favorit Anda di tab **TTS** (rekomendasi: *ID-ArdiNeural* atau *ID-GadisNeural*). Aktifkan filter sensor kata untuk menjaga siaran tetap ramah penonton.
5. **Impor Konfigurasi v1.2.0**:
   - Jika Anda memiliki konfigurasi dari versi sebelumnya, klik tombol **"Impor Preset (JSON)"** di Dashboard untuk memuat semua pengaturan secara instan.

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
