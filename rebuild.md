# 📐 nurearn Studio — Master UI/UX Specification & Rebuild Guide (Google Stitch Ready)

> Dokumen spesifikasi arsitektur UI/UX lengkap untuk aplikasi desktop **nurearn** (TikTok LIVE Interactive Streaming Toolkit & Companion).  
> Dibuat khusus agar siap di-**copy-paste langsung ke Google Stitch** (atau AI UI Generator / Generative Design Tool lainnya) untuk merekonstruksi, memodernisasi, dan merapikan seluruh antarmuka aplikasi.

---

## 📑 Daftar Isi
1. [Ringkasan Produk & Persona](#1-ringkasan-produk--persona)
2. [Design System & Theme Tokens (Dark Luxury Gold)](#2-design-system--theme-tokens-dark-luxury-gold)
3. [App Shell & Struktur Layout Navigasi](#3-app-shell--struktur-layout-navigasi)
4. [Daftar Lengkap Layar & Panel (Tab Pages)](#4-daftar-lengkap-layar--panel-tab-pages)
   - [4.1 Dashboard](#41-dashboard)
   - [4.2 Live Chat](#42-live-chat)
   - [4.3 Gifts Gallery & Live Log](#43-gifts-gallery--live-log)
   - [4.4 Interaksi & Aktivitas (Trigger Engine)](#44-interaksi--aktivitas-trigger-engine)
   - [4.5 Sound Board](#45-sound-board)
   - [4.6 Goals (Crowdfunding & Milestone Overlays)](#46-goals-crowdfunding--milestone-overlays)
   - [4.7 Overlay Browser Source (OBS & TikTok LIVE Studio)](#47-overlay-browser-source-obs--tiktok-live-studio)
   - [4.8 YouTube Music & Song Request](#48-youtube-music--song-request)
   - [4.9 TTS Chat (Edge Neural Reader)](#49-tts-chat-edge-neural-reader)
   - [4.10 Pengaturan & Manajemen Preset (Aset Lokal)](#410-pengaturan--manajemen-preset-aset-lokal)
   - [4.11 Battle Arena (PK Mode)](#411-battle-arena-pk-mode)
   - [4.12 Log Aktivitas & Debug](#412-log-aktivitas--debug)
   - [4.13 License Verification Window](#413-license-verification-window)
5. [Spesifikasi Modal & Dialog Interaktif](#5-spesifikasi-modal--dialog-interaktif)
6. [OBS Transparent Overlays (Browser Source Views)](#6-obs-transparent-overlays-browser-source-views)
7. [Prompt Siap Copas untuk Google Stitch](#7-prompt-siap-copas-untuk-google-stitch)

---

## 1. Ringkasan Produk & Persona

- **Nama Aplikasi**: nurearn (v1.2.0)
- **Kategori**: Desktop Streaming Companion & Automation Tool
- **Target Pengguna**: Streamer TikTok LIVE (Gaming, Hiburan, PK/Battle, Podcast, Musik) yang menggunakan OBS Studio atau TikTok LIVE Studio di Windows 10/11 64-bit.
- **Tujuan Utama**:
  1. Menghubungkan event realtime TikTok LIVE (Gift, Chat, Like, Follow, Share, Viewer) ke komputer host secara otomatis tanpa latency.
  2. Memicu aksi otomatis: Keyboard Hotkey/Keystrokes, Sound Effect (SFX), Media Popup (Gambar/Video) di layar stream.
  3. Membacakan komentar penonton dengan suara natural AI Microsoft Edge Neural dalam Bahasa Indonesia.
  4. Menyediakan overlay transparan berkecepatan tinggi untuk OBS / TikTok LIVE Studio (Chatbox, Leaderboard Top 10, Goal Bar, Alerts).
  5. Memutar lagu permintaan penonton (Song Request) via YouTube Music terisolasi tanpa iklan.

---

## 2. Design System & Theme Tokens (Dark Luxury Gold)

Tema visual mengusung gaya **Obsidian Black & Luxury Gold** dengan sentuhan **Glassmorphism**, kontras tajam, dan micro-animations halus untuk mendukung kenyamanan penggunaan saat streaming maraton (8+ jam).

### 2.1 Palet Warna (Color Palette)
```css
:root {
  /* Background & Canvas */
  --bg-primary: #000000;              /* Hitam pekat OLED / obsidian */
  --bg-secondary: #0A0A0A;            /* Background sidebar & navbar */
  --card-panel: #111111;              /* Background kartu/panel modul */
  --card-hover: #171717;              /* Hover state kartu */
  --card-glass: rgba(17, 17, 17, 0.8);/* Glassmorphism panel dengan blur */

  /* Borders & Dividers */
  --border-default: #1F1F1F;          /* Garis tepi halus standar */
  --border-soft: rgba(255, 215, 0, 0.08); /* Aksen gold transparan tipis */
  --border-active: #FFD700;           /* Garis tepi elemen terpilih */

  /* Typographic Hierarchy */
  --text-primary: #FFFFFF;            /* Teks judul & data penting */
  --text-secondary: #888888;          /* Keterangan, label, deskripsi */
  --text-disabled: #555555;           /* Placeholder & elemen nonaktif */
  --text-gold: #f5e6b2;               /* Teks aksen emas lembut */

  /* Luxury Gold Accents */
  --accent-primary: #FFD700;          /* Emas murni TikTok / Luxury Gold */
  --accent-hover: #FFE44D;            /* Emas terang saat hover */
  --accent-dark: #D4AF37;             /* Emas gelap untuk shadow/gradient */
  --accent-soft: rgba(255, 215, 0, 0.10); /* Soft gold pill & badge */
  --accent-glow: rgba(255, 215, 0, 0.35); /* Shadow gold bercahaya */
  --gold-gradient: linear-gradient(135deg, #FFD700 0%, #D4AF37 100%);
  --gold-gradient-soft: linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%);

  /* Multi-Accent Feature Highlights */
  --color-neon-blue: #38bdf8;         /* TTS & Hotkey accents */
  --color-cyber-pink: #f472b6;        /* Gift & Activity accents */
  --color-violet: #a78bfa;            /* Soundboard & Follower accents */
  --color-success: #10B981;           /* Online, connected, active */
  --color-warning: #F59E0B;           /* Warning, pending, battle alert */
  --color-error: #EF4444;             /* Disconnected, reset, delete */

  /* Spacing & Radii */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 9999px;

  /* Elevation & Shadows */
  --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.5);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.65);
  --shadow-lg: 0 12px 32px rgba(0, 0, 0, 0.85);
  --shadow-gold: 0 4px 20px rgba(255, 215, 0, 0.18);

  /* Fonts */
  --font-heading: 'Poppins', 'Montserrat', sans-serif;
  --font-body: 'Inter', 'Roboto', sans-serif;
  --font-mono: 'Consolas', 'JetBrains Mono', monospace;
}
```

---

## 3. App Shell & Struktur Layout Navigasi

Aplikasi menggunakan layout **Sidebar Kiri + Konten Utama Kanan** yang responsif dan dapat diminimalkan (*collapsible*) dengan pintasan `Ctrl+B`.

### 3.1 Komponen App Shell
1. **Header Update Notifier Banner** (`#updateBanner`):
   - Muncul otomatis di puncak layar bila terdapat rilis pembaruan baru dari GitHub Releases.
   - Styling: Linear gradient gelap dengan border gold neon, ikon roket berdenyut (`🚀`), judul info pembaruan, tombol "*Unduh Sekarang*", dan tombol tutup (*dismiss*).
2. **Sidebar Kiri** (`#sidebar`, lebar default: 260px, collapsible):
   - **Tombol Collapse Sidebar** (`#toggleNavBtn`): Icon panah lipat kiri/kanan.
   - **Konektor TikTok LIVE** (`.connect-box`):
     - Input teks username TikTok tanpa awalan `@`.
     - Checkbox "*Simpan Username*" agar username tersimpan saat aplikasi dibuka kembali.
     - Tombol ganda: `[Connect]` (Aksen Emas) & `[Disconnect]` (Ghost Red).
     - Indikator status realtime: Dot warna hijau/merah/kuning berdenyut + label teks status (`Connected`, `Connecting...`, `Disconnected`).
   - **Menu Navigasi Tab** (`.tabs`):
     - **Grup 1: Live & Utama**
       - 📊 `Dashboard` (Metrik live, top gifter, ringkasan perolehan koin)
       - 💬 `Chat` (Live chat feed dengan moderasi badge & filter)
       - 🎁 `Gifts` (Galeri gift database & live stream gift feed)
     - **Grup 2: Interaksi & Overlay**
       - ⚡ `Interaksi` (Trigger Engine: Hotkey, Audio SFX, Media Overlay, Pemetaan Event)
       - 🎹 `Sound Board` (Papan tombol audio instan dengan hotkey global)
       - 🎯 `Goals` (Crowdfunding bar untuk Likes, Follower, Share, Subs, Koin, Viewer)
       - 📺 `Overlay` (Manajer Browser Source OBS / TikTok LIVE Studio, URL generator & CSS editor)
       - 🎵 `YouTube Music` (Song Request penonton via chat/gift & player mandiri)
       - 🎙️ `TTS Chat` (Microsoft Edge Neural Voice Reader & normalisasi slang Indonesia)
     - **Grup 3: Manajemen & Sistem**
       - ⚙️ `Pengaturan` (Folder direktori aset audio/media lokal, Preset Manager, Import/Export JSON)
       - 📜 `Log` (Terminal aktivitas & error logger realtime)
   - **Sidebar Footer**: Logo teks brand `nurearn` dengan indikator versi aktif.
3. **Konten Utama** (`#app > .content`):
   - Tombol munculkan navigasi (`#showNavBtn`) ketika sidebar sedang diminimalkan.
   - Container kartu panel (`.tab-panel`) yang hanya menampilkan tab yang aktif.

---

## 4. Daftar Lengkap Layar & Panel (Tab Pages)

---

### 4.1 Dashboard
- **Header**: Judul "Dashboard", sub-judul statistik realtime, dan tombol "*Reset Statistik*".
- **Stat Cards Grid (4 Kolom Utama)**:
  1. **Total Koin / Diamond**: Ikon Koin TikTok emas 3D, angka total koin yang terkumpul sesi ini, format angka otomatis (misal: 12.4K).
  2. **Total Komentar**: Ikon chat bubble biru muda, counter jumlah chat penonton yang masuk.
  3. **Total Like / Tap-Tap**: Ikon hati merah muda/emas, counter jumlah tap layar dari penonton.
  4. **Follower Baru**: Ikon user violet dengan tanda plus, counter penonton yang baru mengikuti akun selama sesi live berjalan.
- **Leaderboard Realtime Widget**:
  - Tombol switch: `[Top 10 Gifter]` | `[Top 10 Gift]` | `[Top 10 Tap-Tap]`.
  - Daftar pemenang urutan 1-10 dengan border khusus juara 1 (Gold/Crown), juara 2 (Silver), juara 3 (Bronze), foto profil penonton, nama akun, dan perolehan koin.

---

### 4.2 Live Chat
- **Header**: Judul "Live Chat" dengan tombol pembersih riwayat chat.
- **Chat Feed View** (`#chatFeed`):
  - Kotak streaming pesan dengan optimasi memori aktif (*DOM auto-trimming*, maksimal 200 elemen DOM agar tidak terjadi memory leak).
  - Item chat memuat: Avatar penonton, Badge peran (Moderator, Top Gifter, Subscriber), nama pengirim beraksen warna cerah, dan isi pesan teks.
  - Auto-scroll ke bawah saat chat baru masuk dengan opsi jeda saat pengguna scroll ke atas.

---

### 4.3 Gifts Gallery & Live Log
- **Header**: Judul "Galeri Gift & Live Log", sub-teks database koleksi gift, switch tampilan:
  - `[🎁 Galeri Gift]` (Database katalog gift TikTok).
  - `[📜 Live Feed Gift]` (Riwayat gift yang masuk realtime saat siaran).
  - Tombol `[+ Tambah Gift Baru]` untuk input gift custom ke file konfigurasi lokal.
- **Galeri Gift Cards Grid**:
  - Kartu gift berisi foto/ikon gift TikTok resmi, nama gift, nilai koin (misal: Mawar = 1 koin, Paus = 2150 koin), ID gift internal, dan tombol edit/hapus.
- **Live Feed Gift View**:
  - Animasi kartu gift masuk realtime menampilkan avatar penonton, nama akun, thumbnail gift bergerak, jumlah combo streak (`x5`, `x100`), dan total koin yang dihasilkan.

---

### 4.4 Interaksi & Aktivitas (Trigger Engine)
Layar ini adalah inti otomatisasi siaran nurearn, dibagi menjadi 2 modul utama:

#### Bagian 1: Interaksi (Action Library)
- **Header**: Judul "Interaksi (Action Library)", badge hitungan total interaksi, kolom pencarian cepat, tombol "*Reset Interaksi*", dan tombol `[+ Tambah Interaksi]`.
- **Daftar Kartu Interaksi**:
  - Setiap kartu menampilkan:
    - Nama interaksi (misal: *Lompat Game Space*, *Suara Tertawa*, *Popup Meme Video*).
    - Tipe Aksi:
      - ⌨️ **Keyboard Keystroke**: Tombol tunggal (`Space`, `Enter`), kombinasi (`Ctrl+Shift+A`), tombol function (`F1`-`F24`), atau urutan tombol berantai (`W,A,S,D`).
      - 🔊 **Sound Effect (SFX)**: Path file audio lokal (`.mp3`, `.wav`), slider volume suara (0-100%), dan mode *Overlap* (tumpang-tindih suara).
      - 🎬 **Overlay Media**: File visual animasi pop-up (`.png`, `.gif`, `.mp4`, `.webm`) dengan durasi tayang (detik) dan animasi masuk/keluar.
    - Tombol aksi: `[Tes Aksi]` (uji coba langsung), `[Edit]`, `[Hapus]`.

#### Bagian 2: Aktivitas (Gift & Event Mapping)
- **Header**: Judul "Aktivitas (Gift & Event Mapping)", badge hitungan total aktivitas, search box, dan tombol `[+ Tambah Aktivitas]`.
- **Daftar Kartu Pemetaan Aktivitas**:
  - Menghubungkan pemicu event TikTok ke Interaksi yang telah dibuat:
    - Event pemicu: Gift tertentu (misal: Mawar, Donat), Semua Gift, Rentang Koin (misal: Koin >= 50), Tap Like, Follow, Share, atau Kata Kunci Chat.
    - Opsi Combo Gift: Hanya picu saat streak combo selesai (*Streak Ended*).
    - Tagging Rank: Pilihan set ke `Top Rank A` atau `Top Rank B` untuk leaderboard terpisah.
    - Tombol aksi: `[Tes Trigger]`, `[Edit]`, `[Hapus]`.

---

### 4.5 Sound Board
- **Header**: Judul "Sound Board", sub-deskripsi kontrol audio instan, tombol darurat `[🛑 Hentikan Semua Suara]` (Panic Button), dan tombol `[+ Tambah Tombol Suara]`.
- **Toolbar**:
  - Input pencarian tombol suara.
  - Checkbox toggle: `[✓] Hotkey Global (Background)` (memungkinkan hotkey keyboard tetap aktif saat streamer sedang bermain game layar penuh).
  - Tombol `[🔗 Link Overlay Soundboard]` untuk menyalin tautan browser source OBS jika tombol suara memiliki media video/gambar terkait.
- **Soundboard Grid (Papan Tombol Interaktif)**:
  - Kartu tombol audio bergaya launchpad DJ / Stream Deck:
    - Judul suara (misal: *Airhorn*, *Ketawa Kunti*, *Victory Trumpet*).
    - Badge Hotkey keyboard yang terikat (misal: `NUMPAD 1`, `F9`, `CTRL+ALT+S`).
    - Mini play/stop icon button dengan status animasi gelombang saat sedang berbunyi.
    - Slider volume mandiri per tombol suara.
    - Menu elipsis `[...]` untuk konfigurasi file audio, media popup, atau hapus tombol.

---

### 4.6 Goals (Crowdfunding & Milestone Overlays)
Menampilkan bilah progres donasi/milestone dinamis yang siap dipasang sebagai Browser Source di OBS:
- **Kategori 6 Goal Cards**:
  1. **Likes Goal**: Target jumlah tap-tap like dari penonton.
  2. **New Followers Goal**: Target penambahan follower baru.
  3. **Shares Goal**: Target pembagian tautan siaran langsung.
  4. **New Subscribers Goal**: Target langganan VIP / Member.
  5. **Coins / Diamond Goal**: Target donasi koin/saweran TikTok.
  6. **Viewer Count Goal**: Target puncak jumlah penonton serentak.
- **Komponen Tiap Goal Card**:
  - Avatar & icon target dengan judul kategori.
  - Tombol simulasi cepat: `[+50]` atau `[+1]` untuk uji coba kenaikan progress.
  - Tombol `[Reset]` progress ke angka 0.
  - **Live Preview Widget**: Bilah visual progres horizontal dengan persentase (`75%`), icon mahkota, target teks saat ini vs tujuan (`750 / 1,000 Coins`).
  - Baris input URL overlay goal khusus dengan tombol `[Salin]`, tombol `[Customize]` (buka modal kustomisasi warna, tema, efek kembang api/celebration), dan tombol `[Buka di Browser]`.

---

### 4.7 Overlay Browser Source (OBS & TikTok LIVE Studio)
Pusat kendali dan panduan tautan URL Browser Source untuk software penyiaran (Localhost port 8642).

- **Panel Status Server Localhost**:
  - Indikator hijau aktif: `http://localhost:8642`.
  - Tombol `[🌐 Buka di Browser]` untuk verifikasi instan.
  - Keterangan latensi 0ms & efisiensi pemakaian CPU/GPU.
- **Daftar Kartu Overlay Khusus**:
  1. **Overlay Soundboard (Video & Gambar)**: Popup media saat hotkey soundboard ditekan (`/overlay/soundboard`).
  2. **Overlay Khusus Chat**: Tampilan chat transparan di samping gameplay (`/overlay/chat`). Tombol `[Edit CSS]` mandiri.
  3. **Overlay Gift A (Top Rank A)**: Leaderboard khusus donatur tim/kategori A (`/overlay/ranka`).
  4. **Overlay Gift B (Top Rank B)**: Leaderboard khusus donatur tim/kategori B (`/overlay/rankb`).
  5. **Overlay Gift Alert & Notifikasi Sosial**: Notifikasi pop-up pop-art realtime saat gift masuk, viewer join, follow, dan share (`/overlay/gift`).
  6. **Overlay Top 10 Gifter Leaderboard**: Papan peringkat donatur teratas dengan medali dan animasi salip menyalip (`/overlay/topgift`).
     - **Pengaturan Tampilan Top Gifter Realtime**: Checkbox toggle untuk: *Rata Kanan*, *Tampilkan Rank*, *Tampilkan Crown*, *Tampilkan Trophy*, *Tampilkan Koin*, *Hilangkan Background*, *Hilangkan Border*, *Sembunyikan Avatar*, *Mode Kompak*.
  7. **Overlay Top 10 Tap-Tap**: Papan peringkat penonton pemberi like terbanyak.
  8. **Overlay Viewer Bergabung**: Animasi sambutan nama penonton yang baru masuk room.
  9. **Overlay Follower Baru**: Animasi popup follower baru.
  10. **Overlay Share Live**: Animasi perayaan penonton membagikan siaran.

---

### 4.8 YouTube Music & Song Request
Modul terintegrasi pemutar musik latar belakang dengan integrasi permintaan lagu penonton TikTok:

- **Switch Sub-Menu**: `[Pengaturan]` | `[Antrian & Riwayat]`.
- **Bilah Pencarian & Uji Coba Cepat**:
  - Kolom input pencarian lagu (contoh: *Superman Is Dead - Jadilah Legenda*).
  - Tombol `[Buka di Brave Browser]` (opsi putar musik 100% bebas iklan di browser terpisah).
  - Tombol `[Buka Browser Player]` (buka BrowserWindow YouTube bawaan).
  - Tombol `[Putar Lagu]`.
- **Now Playing Hero Card**:
  - Thumbnail cover lagu resmi YouTube.
  - Animasi equalizer hijau Spotify-style (`.yt-eq-bar`) yang bergerak mengikuti alunan lagu.
  - Judul lagu, penyanyi/channel, dan tag nama penonton yang meminta lagu tersebut.
  - Scrubber bar progress durasi lagu (waktu berjalan / total durasi).
  - Kontrol pemutar: Tombol `[Play/Pause]`, `[Skip ke Lagu Berikutnya]`, slider volume musik.
- **Song Request Rules Config**:
  - Toggle aktifkan perintah chat TikTok: `!play <judul>`, `!req <judul>`, `!skip`, `!revoke`.
  - Pengaturan biaya request: Gratis (via Chat) atau Bayar (hanya penonton yang mengirim gift minimal sekian koin).
  - Batas durasi maksimal lagu (misal: 5 menit) untuk mencegah penonton memutar video 10 jam.
  - Maksimal antrean per penonton (misal: 2 lagu per orang).
  - Filter blacklist kata kunci / judul lagu terlarang.
- **Antrean Lagu (Queue List)**:
  - Daftar tunggu lagu dengan urutan pemutaran, requester info, durasi, dan tombol hapus dari antrean.

---

### 4.9 TTS Chat (Edge Neural Reader)
Sistem pembacaan komentar otomatis dengan kecerdasan buatan Microsoft Edge Neural:

- **Master Toggle**: Sakelar ON/OFF besar di sudut kanan atas dengan badge status `[AKTIF]` (Hijau) / `[NONAKTIF]` (Abu-abu).
- **Karakter Suara & Kontrol Audio**:
  - Pilihan Voice AI:
    - 🇮🇩 Indonesia - Cewek (`id-ID-GadisNeural` / Natural Jernih)
    - 🇮🇩 Indonesia - Cowok (`id-ID-ArdiNeural` / Suara Bass Pria Natural)
    - Multilingual options.
  - Slider Kecepatan Bicara (*Speed Rate*): `0.5x` hingga `2.0x` (default `1.0x`).
  - Slider Nada Bicara (*Pitch*): `0.5x` hingga `1.5x`.
  - Slider Volume Suara: `0%` hingga `100%`.
- **Normalisasi Bahasa Gaul & Slang Indonesia**:
  - Filter otomatis yang mengubah singkatan percakapan menjadi pengucapan kata yang benar:
    - *wkwk* → tertawa santai
    - *bgt* → banget
    - *yg* → yang
    - *gk / gak* → tidak
    - Pengucapan angka, nominal koin, dan mata uang Rupiah yang teratur.
- **Filter Kata Kasar & Sensor (Blacklist)**:
  - Input teks kata-kata yang disensor (dipisahkan tanda koma). Pesan yang memuat kata kasar akan otomatis dilewati atau disensor (*bip*).
- **Pilihan Event yang Dibaca**:
  - Checkbox: `[✓] Baca Komentar Biasa`
  - Checkbox: `[✓] Baca Khusus Member / Subscriber`
  - Checkbox: `[✓] Baca Pengirim Gift` (dengan input minimal koin untuk dibaca, misal: minimal 5 koin)
  - Checkbox: `[✓] Baca Follower Baru`
  - Checkbox: `[✓] Baca Share Live`
- **Format Template Kalimat**:
  - Contoh: `"{user} mengirim {gift} sebanyak {count} koin! Terima kasih!"`
- **Tombol Uji Coba Audio TTS**: Tombol `[Tes Suara Sekarang]` untuk mendengarkan hasil sintesis suara secara instan tanpa perlu siaran live.

---

### 4.10 Pengaturan & Manajemen Preset (Aset Lokal)
Pusat manajemen penyimpanan aset dan backup konfigurasi aplikasi:

- **Folder Direktori Aset Lokal**:
  - **Folder Audio (Sound)**:
    - Badge hitungan file terdeteksi (`X audio`).
    - Input readonly path direktori folder audio di komputer.
    - Tombol `[📁 Pilih Folder]`, `[Refresh / Scan]`, `[Tambah File]`, `[Buka Folder di Windows Explorer]`.
    - Daftar cepat audio dengan kolom cari instan dan tombol preview dengar.
  - **Folder Media (Gambar / Video)**:
    - Badge hitungan file media terdeteksi (`X media`).
    - Input readonly path folder media.
    - Tombol pemilih folder dan tombol buka di Windows Explorer.
    - Daftar cepat aset visual dengan thumbnail preview.
- **Manajemen Preset Konfigurasi**:
  - Input simpan preset baru: Beri nama preset (misal: *Mode Game Horror*, *Mode Live Santai PK*).
  - Tombol `[Simpan Preset]`.
  - Dropdown daftar preset yang sudah tersimpan.
  - Tombol aksi: `[Terapkan Preset Ini]`, `[Ekspor JSON]`, `[Impor Preset JSON]`, `[Ekspor Semua]`, `[Hapus]`.
  - Tombol darurat: `[Reset Default (Kosong Murni)]` untuk mengembalikan aplikasi seperti baru di-install.

---

### 4.11 Battle Arena (PK Mode)
Layar khusus pengelolaan pertandingan battle antar streamer (PK):
- Bilah visual skor pertarungan Host vs Rival (Kiri vs Kanan).
- Timer hitung mundur durasi duel.
- Daftar top gifter untuk masing-masing sisi kubu.
- Tautan overlay OBS browser source khusus PK Arena (`/overlay/battle`).

---

### 4.12 Log Aktivitas & Debug
- **Header**: Judul "Log Aktivitas" dan tombol `[Bersihkan & Hapus File Log]`.
- **Feed Terminal Log** (`#logFeed`):
  - Area console monospaced dengan baris bertanggal dan bertanda warna:
    - 🟢 `[INFO]`: Sukses terhubung ke server, audio diputar, trigger aktif.
    - 🟡 `[WARN]`: Reconnecting, audio file tidak ditemukan, rate limiting.
    - 🔴 `[ERROR]`: Masalah koneksi socket, izin hotkey driver, parsing data.

---

### 4.13 License Verification Window
Jendela otentikasi lisensi hardware ID (`renderer/license.html`):
- Background animasi bola cahaya glowing (*ambient backdrop*).
- Glass container card mewah di tengah layar.
- Logo brand `nurearn Live Toolkit`.
- Form aktivasi:
  - Input kode lisensi format mask: `XXXX-XXXX-XXXX-XXXX`.
  - Validasi realtime Hardware ID (`node-machine-id`) ke server cloud.
  - Indikator icon status & pesan validasi kesalahan (*error message box*).
  - Tombol `[Activate]` dengan animasi loading spinner.

---

## 5. Spesifikasi Modal & Dialog Interaktif

Aplikasi memiliki modal dialog popup dengan backdrop gelap transparan (`rgba(0, 0, 0, 0.75)`) dan animasi pop-in halus:

1. **`giftModal` (Katalog & Penambahan Gift)**:
   - Pencarian gift berdasarkan nama atau koin.
   - Grid katalog gift dengan foto, nama, koin, dan tombol pilih.
   - Sub-form penambahan gift baru (ID Gift, Nama Gift, Koin, URL Ikon).
2. **`interactionModal` (Formulir Buat/Edit Interaksi)**:
   - Input Nama Interaksi.
   - Pilihan Jenis Aksi: Tombol Keyboard / SFX Audio / Media Overlay.
   - Konfigurasi Tombol Keyboard (Perekam tombol langsung saat tombol ditekan di keyboard).
   - Pemilih File Audio + Slider Volume + Checkbox Overlap.
   - Pemilih File Media Gambar/Video + Durasi Detik + Posisi Layar.
3. **`activityModal` (Formulir Pemetaan Aktivitas ke Event TikTok)**:
   - Dropdown Jenis Event (Gift, Like, Follow, Share, Chat).
   - Pemilih Gift TikTok dari katalog resmi.
   - Input Ambang Batas Minimal Koin atau Combo Streak.
   - Dropdown Interaksi yang akan dipicu.
   - Pilihan Tag Rank: `Top Rank A` atau `Top Rank B`.
4. **`soundboardModal` (Formulir Tombol Soundboard)**:
   - Nama Tombol Suara.
   - Pemilih File Audio Lokal.
   - Slider Volume Suara per tombol.
   - Perekam Hotkey Keyboard Global.
   - Opsi tumpuk suara (*Allow Overlap*).
5. **`customCssModal` (Editor Custom CSS Overlay OBS)**:
   - Editor kode monospace untuk menyisipkan styling CSS khusus pada setiap overlay OBS.
   - Tombol simpan realtime dan reset ke styling default.
6. **`goalCustomizeModal` (Kustomisasi Goal Bar)**:
   - Pengaturan Judul Goal, Target Angka, dan Hitungan Awal.
   - Pemilihan Tema Tampilan: Warna gradien bilah, bentuk sudut (*Rounded / Sharp / Pill*), icon mahkota.
   - Pengaturan Efek Kemenangan: Putar audio perayaan dan letupan confetti kembang api saat target 100% tercapai.
7. **`modalAssetAudioPicker` & `modalAssetMediaPicker`**:
   - Dialog pemilih file dari folder aset lokal lengkap dengan preview dengar suara dan thumbnail gambar/video.
8. **`customConfirmModal`**:
   - Dialog konfirmasi aksi berbahaya (seperti Reset Database, Hapus Preset, atau Hapus Seluruh Interaksi) dengan tombol Batal dan tombol Ya Konfirmasi (Merah).

---

## 6. OBS Transparent Overlays (Browser Source Views)

Seluruh overlay berjalan pada port lokal `http://localhost:8642` dengan background transparan (`rgba(0, 0, 0, 0)`) tanpa scrollbar:

1. **Overlay Chat Box** (`/overlay/chat`): Bubble komentar melayang dengan animasi slide-in dari bawah atau samping, nama pengirim warna emas, dan lencana pendukung.
2. **Overlay Alerts & Popups** (`/overlay/gift`, `/overlay/join`, `/overlay/follow`, `/overlay/share`): Notifikasi pop-up animasi halus dengan efek cahaya emas saat donatur mengirim gift besar atau viewer baru masuk.
3. **Overlay Top 10 Gifter Leaderboard** (`/overlay/topgift`): Papan peringkat dinamis dengan mahkota di nomor 1, avatar bundar bercahaya, total koin, serta animasi salip posisi realtime.
4. **Overlay Custom Rank A & Rank B** (`/overlay/ranka`, `/overlay/rankb`): Leaderboard khusus untuk dua kategori donasi yang dipisahkan streamer (misal: Tim Biru vs Tim Merah).
5. **Overlay Goal Bar** (`/overlay/goal`): Progress bar horizontal modern dengan angka persentase, penghitung jumlah saat ini terhadap target, dan efek konfeti perayaan saat 100%.
6. **Overlay YouTube Music Player** (`/overlay/player`): Widget pemutar lagu di pojok layar menampilkan thumbnail album melingkar berputar, visual equalizer bar hijau, judul lagu, dan requester username penonton.

---

## 7. Prompt Siap Copas untuk Google Stitch

Gunakan prompt di bawah ini untuk dimasukkan langsung ke **Google Stitch** atau AI UI Design Generator. Anda dapat memasukkan Master Prompt secara keseluruhan atau per modul yang ingin Anda rapikan.

---

### 📋 PROMPT 1: Master Theme & App Shell (Google Stitch)
```markdown
Create a ultra-premium desktop application interface for "nurearn", a TikTok LIVE Streamer Companion and Interactive Automation Studio built with Electron.

Visual Style & Aesthetic:
- Dark Luxury Obsidian & Cyber Gold Theme.
- Primary Background: #000000 (Pure OLED Black) and #0A0A0A (Sidebar/Header).
- Surface/Cards: #111111 with subtle 1px border (#1F1F1F) and soft golden glow highlights (rgba(255, 215, 0, 0.15)).
- Accent Colors: Luxury Gold (#FFD700), Neon Cyan (#38bdf8), Rose Pink (#f472b6), Emerald Green (#10B981), Amber (#F59E0B), and Crimson Red (#EF4444).
- Typography: Poppins/Montserrat for bold modern titles, Inter for clean UI data, Consolas for technical links/hotkeys.
- Glassmorphism: Frosted glass panels with backdrop blur and smooth pill badges.

App Shell Layout:
1. Top Banner: An alert bar for auto-updates with gold gradient border, rocket emoji, and "Download Update" CTA.
2. Left Sidebar (Collapsible, width 260px):
   - Collapse/Expand toggle icon.
   - TikTok LIVE Connector Box: Input for TikTok username, "Save Username" checkbox, Gold [Connect] button, Ghost [Disconnect] button, and a pulsing status dot with label "Connected / Disconnected".
   - Grouped Tab Navigation:
     * Group 1 (Live & Primary): Dashboard, Chat, Gifts.
     * Group 2 (Interactive & Overlays): Interaksi (Triggers), Sound Board, Goals, Overlay Browser Sources, YouTube Music, TTS Chat.
     * Group 3 (System & Management): Pengaturan (Presets & Asset Folders), Logs.
   - Sidebar Footer: Sleek gold "nurearn" logo and version badge.
3. Main Content Stage: Card grid layout with header bars, search boxes, pill counters, and modal overlays.
```

---

### 📋 PROMPT 2: Dashboard & Live Stats Screen (Google Stitch)
```markdown
Design the "Dashboard" screen for the nurearn TikTok LIVE companion desktop app.

Requirements:
1. Header Bar: Title "Dashboard", subtitle "Statistik perolehan koin & interaksi live stream secara realtime", and a danger-ghost button "Reset Statistik" with trash/refresh icon.
2. 4-Column Stat Metric Cards Grid:
   - Card 1 (Total Koin): 3D TikTok gold coin icon, huge bold number "14,850", label "Total Koin", luxury gold gradient card glow.
   - Card 2 (Total Komentar): Blue chat bubble icon, bold number "1,248", label "Total Komentar".
   - Card 3 (Total Like / Tap-Tap): Red/Pink heart icon, bold number "35,420", label "Total Like".
   - Card 4 (Follower Baru): Purple user-plus icon, bold number "+142", label "Follower Baru".
3. Realtime Leaderboard Widget:
   - Header with switcher buttons: [Top 10 Gifter] (Active Gold), [Top 10 Gift], [Top 10 Tap-Tap].
   - Ordered list of top supporters:
     * Rank 1: Golden glowing border, Crown badge, viewer avatar, username, total diamonds sent.
     * Rank 2: Silver accent badge.
     * Rank 3: Bronze accent badge.
     * Ranks 4 to 10: Clean dark cards with follower count & coin indicators.
```

---

### 📋 PROMPT 3: Interaksi & Aktivitas (Trigger Engine) Screen
```markdown
Design the "Interaksi & Aktivitas" (Automation Trigger Engine) screen for the nurearn streaming studio app.

Layout Structure:
1. Header: Title "Interaksi & Aktivitas", subtitle explaining the connection between TikTok events and computer actions, plus a "Reset Interaksi & Aktivitas" button.
2. Section 1 - Interaksi (Action Library):
   - Subheader with badge count (e.g., "12 Interaksi"), quick search input, and button [+ Tambah Interaksi].
   - List of Action Cards:
     * Card A (Keyboard Action): Shows hotkey badge (e.g., "SPACE" or "CTRL + SHIFT + 1"), action name (e.g., "Karakter Lompat"), test action button, edit, and delete.
     * Card B (Audio SFX Action): Shows audio file name, volume slider (80%), overlap mode pill, mini preview play button.
     * Card C (Overlay Media Action): Video/Image thumbnail, duration pill (e.g., "3s"), screen animation tag.
3. Section 2 - Aktivitas (Event Mapping):
   - Subheader with badge count, search bar, and button [+ Tambah Aktivitas].
   - Mapping Cards linking TikTok live events to actions:
     * Card 1: Gift "Mawar (1 Koin)" -> Triggers Action "Suara Mawar Sound" + Hotkey "F1". Includes combo streak badge "Streak Ended Only".
     * Card 2: Gift "Paus (2150 Koin)" -> Triggers Action "Layar Goyang Video" + Custom Rank tag "Top Rank A".
     * Card 3: Event "Setiap 500 Tap Like" -> Triggers Action "Efek Love Confetti".
     * Includes [Test Trigger] button on every card.
```

---

### 📋 PROMPT 4: Soundboard Grid Screen (Google Stitch)
```markdown
Design a modern Launchpad / Stream Deck style "Sound Board" UI screen for nurearn desktop app.

Components:
1. Header:
   - Title "Sound Board" with music icon.
   - Panic Button [🛑 Hentikan Semua Suara] in bold ghost red.
   - Primary button [+ Tambah Tombol Suara] in luxury gold.
2. Soundboard Toolbar:
   - Search box with magnifying glass.
   - Global Hotkey Toggle: Checkbox "[✓] Hotkey Global (Background)" so hotkeys trigger while streaming fullscreen games.
   - Copy OBS Overlay Link button for video/image popups associated with sound buttons.
   - Badge counter showing total loaded sounds.
3. Soundboard Interactive Button Grid (4x4 or responsive grid):
   - Each sound card features:
     * Sound name (e.g., "Ketawa Kunti", "Airhorn Bass", "Victory Horn").
     * Assigned keyboard hotkey pill badge (e.g., "NUMPAD 0", "F5", "ALT+Z") in neon cyan.
     * Mini Play/Stop button with waveform animation state.
     * Compact volume slider with percentage tooltip.
     * Context menu button for editing audio file path and overlay popup image.
```

---

### 📋 PROMPT 5: Goals (Crowdfunding Progress Overlays) Screen
```markdown
Design the "Goals" management screen for stream donation targets in the nurearn toolkit.

Features:
1. Header: Title "Goal Overlay", description for OBS browser sources with interactive themes.
2. Goal Cards Grid displaying 6 goal widgets:
   - Likes Goal
   - New Followers Goal
   - Shares Goal
   - New Subscribers Goal
   - Coins / Diamonds Goal
   - Viewer Count Goal
3. Inside each Goal Card:
   - Left Header: Category icon with gold glow, Goal Name, and subtitle tag.
   - Right Header: Quick test buttons [+50], [+1], and [Reset Progress].
   - Visual Progress Bar Preview:
     * Crown icon at the head.
     * Custom goal title (e.g., "TARGET BELI KAMERA BARU").
     * Counter text (e.g., "750 / 1,000 Coins").
     * Rounded sleek progress bar fill with animated gradient and glowing percentage pill "75%".
   - Card Footer:
     * Readonly input containing the OBS browser source URL (e.g., "http://localhost:8642/overlay/goal?type=coins").
     * Button [Salin Link] with clipboard icon.
     * Button [Customize] (opens modal for colors, bar shape, celebration confetti effect).
     * Button [Buka di Browser].
```

---

### 📋 PROMPT 6: OBS Overlay Management & Live Customizer Screen
```markdown
Design the "Overlay Browser Source" screen for configuring OBS Studio and TikTok LIVE Studio sources.

Layout:
1. Top Notice Panel:
   - Server status badge: "🟢 Server Localhost Aktif: http://localhost:8642".
   - Zero-latency indicator and "Buka di Browser" test button.
2. Grid of Overlay Cards:
   - Overlay 1: Soundboard Media Overlay (Images & Videos).
   - Overlay 2: Live Chat Overlay with Custom CSS editor button.
   - Overlay 3: Custom Rank A Leaderboard Overlay.
   - Overlay 4: Custom Rank B Leaderboard Overlay.
   - Overlay 5: Gift & Social Notification Alerts (Pop-ups for Gift, Join, Follow, Share).
   - Overlay 6: Top 10 Gifter Leaderboard with live customization switches:
     * Checkbox toggles: Rata Kanan, Tampilkan Rank, Tampilkan Crown, Tampilkan Trophy, Tampilkan Koin, Hilangkan Background, Hilangkan Border, Sembunyikan Avatar, Mode Kompak.
3. Card Actions:
   - Readonly URL input box.
   - [Copy Link] button.
   - [Edit CSS] button opening a syntax-highlighted modal.
   - [Buka di Browser] button.
```

---

### 📋 PROMPT 7: YouTube Music & TTS Chat Modules Screen
```markdown
Design the dual audio engines screen for nurearn: YouTube Music Song Request and Edge Neural Text-to-Speech.

Module 1: YouTube Music (Song Request):
- Tab switch: [Pengaturan] | [Antrian & Riwayat].
- Quick Search & Play Box: Input for searching song titles, [Putar Lagu] button, and a shortcut button [Buka di Brave Browser (Bebas Iklan)].
- Now Playing Card: YouTube album thumbnail, live animated Spotify-style audio equalizer bars, song title, channel name, requester username, duration progress scrubber bar, play/pause/skip buttons, and volume slider.
- Request Rules: Enable TikTok chat commands (!play, !req, !skip), set minimum coin gift requirement, max song length, and artist blacklist.

Module 2: Edge Neural TTS (Komentar & Gift Reader):
- Master Switch: Toggle ON/OFF with live green badge "AKTIF".
- Voice Selector: Microsoft Edge Neural voices (Indonesian Gadis - Cewek Natural, Ardi - Cowok Bass).
- Sliders: Speed Rate (1.0x), Pitch (1.0x), Volume (100%).
- Indonesian Slang Normalizer: Toggles to convert words like "wkwk", "bgt", "yg", "gk" into clean Indonesian speech.
- Filter Kata Kasar: Comma-separated blacklist text input for bad words.
- Event Checkboxes: Read Chat, Read Members Only, Read Gifts (with min coin input), Read Followers, Read Shares.
- Button: [Tes Suara Sekarang] with instant speech synthesis.
```

---

### 📋 PROMPT 8: Modal Dialogs & License Activation System
```markdown
Design the Modal Dialogs and the License Verification screen for the nurearn streaming studio desktop app.

1. License Verification Glass Card (renderer/license.html):
   - Center floating frosted glass card with glowing animated background orbs.
   - Logo: "nurearn Live Toolkit".
   - Masked input field: "XXXX-XXXX-XXXX-XXXX" with hardware ID detection indicator.
   - Golden [Activate] button with loading spinner state.
   - Status/error message badge below input.

2. Modal Dialog Components:
   - Backdrop: Darkened overlay with smooth fade-in.
   - Add/Edit Interaction Modal: Action builder with tabbed inputs for Keystrokes, Audio files, and Media popups.
   - Asset Picker Dialog: Visual file picker showing local audio/video assets with search bar, instant preview play button, and file size badge.
   - Confirmation Dialog: Danger modal for clearing logs or resetting configurations with Cancel (Ghost) and Confirm (Red Primary) buttons.
```

---

## 8. Ringkasan File Terkait dalam Repositori

Untuk referensi kode sumber asli saat implementasi:
- **Halaman Utama Renderer**: [`renderer/index.html`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/renderer/index.html)
- **Tema & CSS Utama**: [`renderer/css/style.css`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/renderer/css/style.css)
- **Aktivasi Lisensi**: [`renderer/license.html`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/renderer/license.html) & [`renderer/license.css`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/renderer/license.css)
- **Template Overlay OBS**:
  - All-in-One: [`overlay/index.html`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/overlay/index.html)
  - Pemutar Musik: [`overlay/player.html`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/overlay/player.html)
  - Goal Progress: [`overlay/goal.html`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/overlay/goal.html)
  - Battle Arena PK: [`overlay/battle.html`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/overlay/battle.html)
  - Custom Rank A: [`overlay/rankA.html`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/overlay/rankA.html)
  - Custom Rank B: [`overlay/rankB.html`](file:///c:/Users/Rian/Downloads/tiktok-live-toolkit%20(2)/xumuid-studio/overlay/rankB.html)
