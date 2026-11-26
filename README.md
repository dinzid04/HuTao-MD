# HuTao - MD — Multi-Device WhatsApp Bot

Base bot WhatsApp modular yang rapi, mudah dipahami pemula, dan menggunakan **1 file database terpadu** (`data/database.json`).

## Struktur Folder

```text
.
├── index.js                 # Entry point utama (auto-install modul + start bot)
├── settings.js              # Konfigurasi bot (owner, nama bot, media, payment, API)
├── data/
│   └── database.json        # Satu-satunya file database untuk semua data bot & jadibot
├── assets/
│   └── media/               # Media bawaan (menu.jpg, menu.ogg, qris.jpg)
└── src/
    ├── core/                # Mesin inti bot
    │   ├── bot.js           # Koneksi Baileys, pairing code / QR, reconnect, event grup
    │   ├── context.js       # Database terpadu & isolasi konteks main bot / jadibot
    │   ├── database.js      # Wrapper baca/tulis data/database.json + sinkron MongoDB
    │   ├── message.js       # Serialize pesan, LoadDataBase, MessagesUpsert
    │   ├── mongo.js         # Koneksi opsional MongoDB Cloud (anti-reset saat restart/pindah panel)
    │   ├── mongo-auth.js    # Session login WA ke MongoDB (anti pairing ulang saat redeploy)
    │   ├── plugins.js       # Auto-loader plugin per fitur & folder kategori (O(1) lookup + hot-reload)
    │   ├── prefix.js        # Pengatur mode prefix (1 prefix / multi / noprefix) tersimpan di DB
    │   ├── scheduler.js     # Tugas berkala (sewa grup, auto open/close, cleaner, cpanel)
    │   └── session.js       # Pembersih cache session & folder tmp
    ├── handlers/            # Router utama, menu & clone jadibot
    │   ├── command.js       # Router command & helper bersama
    │   ├── menu.js          # Teks tampilan menu
    │   └── jadibot.js       # Multi-session clone jadibot
    ├── plugins/             # Semua fitur dipecah rapi per folder kategori -> 1 fitur = 1 file (29 folder, 636 fitur!)
    │   ├── ai/              # ai.js, chatgpt.js, deepseek.js, fluxai.js, grok.js, bananaai.js, dll
    │   ├── setup/           # Rename & konfigurasi bot utama (setbotname, setowner, setthumb, setpay, setaudiomenu, dll)
    │   ├── cloner/          # Setup & rename terisolasi khusus jadibot/cloner (clonebotname, clonethumb, clonepay, dll)
    │   ├── downloader/      # tiktok.js, instagram.js, play.js, ytmp3.js, ytmp4.js, spotify.js, dll
    │   ├── group/           # on.js, kick.js, open.js, close.js, hidetag.js, giveaway.js, absen.js, dll
    │   ├── owner/           # backup.js, getcase.js, delcase.js, setprefix.js, addprem.js, dll
    │   └── ...              # am/, broadcast/, call/, clan/, cpanel/, ephoto/, extras/, fun/, game/,
    │                        # inspector/, islami/, jadibot/, maker/, menu/, obfuscator/, primbon/,
    │                        # richgame/, rpg/, search/, stalk/, sticker/, store/, tools/
    ├── services/            # Modul fitur + folder scrapers/ (12 scraper zero-dependency terverifikasi)
    └── utils/               # Utilitas (converter.js, exif.js, formatter.js, helpers.js)
```

## Cara Menjalankan

1. Edit pengaturan di `settings.js` (nomor owner, nama bot, payment, dll.).
2. Jalankan bot:
   ```bash
   npm install
   npm start
   ```
3. Pilih metode login di terminal (**1. Pairing Code** atau **2. Scan QR**).

## Struktur `data/database.json` & Sinkronisasi MongoDB

Seluruh data yang sebelumnya terpecah menjadi banyak file `.json` sekarang digabung rapi ke dalam satu file `data/database.json`:
- `users`, `groups`, `database`, `settings`, `cpanel`
- `store`: `owner`, `premium`, `lists`, `list_settings`, `welcome`, `left`, `badwords`, `sewagrup`, `sewa_notified`, `sistemsewa`, `afk`, `claim`, `limit_config`, `limit_usage`, `limit_bonus`, `amroles`
- `jadibot`: `registry` dan `clones` (database terisolasi tiap clone jadibot)

### Agar Progres Tidak Hilang Saat Restart / Ganti Panel (MongoDB Atlas Gratis)

Secara bawaan bot menyimpan progres otomatis setiap 10 detik + langsung flush saat stop/restart (`SIGINT`/`SIGTERM`/`.restart`). Agar progres tetap aman **100% walaupun disk panel ter-reset atau pindah server**, isi `global.mongoUri` di `settings.js`:

```js
global.mongoUri = 'mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority';
global.mongoDbName = 'shiki_ai';
```

Saat pertama kali aktif, progres lama di `data/database.json` akan otomatis di-upload ke MongoDB dan tersinkronisasi secara otomatis.
