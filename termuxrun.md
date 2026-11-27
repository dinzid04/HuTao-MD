# 📱 Panduan Lengkap Install & Run HuTao - MD di Termux (Untuk Pemula)

Panduan ini dibuat khusus untuk pemula yang baru pertama kali menjalankan bot WhatsApp **HuTao - MD** di HP Android menggunakan **Termux**. Ikuti langkahnya satu per satu secara berurutan.

---

## 1. Persiapan Sebelum Mulai

1. **Install Aplikasi Termux (Wajib versi F-Droid / GitHub)**
   - **JANGAN** download Termux dari Google Play Store (versi Play Store sudah sangat lawas dan sering error).
   - Download Termux terbaru dari **F-Droid**: `https://f-droid.org/packages/com.termux/` atau **GitHub Releases**: `https://github.com/termux/termux-app/releases` (pilih file `.apk` bertuliskan `arm64-v8a` atau `universal`).
2. **Siapkan Nomor WhatsApp untuk Bot**
   - Gunakan nomor WhatsApp aktif (bisa WA Biasa atau WA Bisnis).
   - Format nomor wajib diawali kode negara tanpa `+` atau spasi, contoh: `6281234567890`.
3. **Pastikan Internet Stabil & Penyimpanan Cukup**
   - Sisakan minimal **500 MB** ruang kosong di memori internal HP.

---

## 2. Update Termux & Install Paket Wajib

Buka aplikasi **Termux**, lalu ketik (atau salin-tempel) perintah berikut satu per satu dan tekan **Enter**:

```bash
pkg update && pkg upgrade -y
```
> 💡 **Catatan untuk pemula:** Jika di tengah proses muncul pertanyaan warna putih bertuliskan `(Y/I/N/O/D/Z) [default=N] ?`, cukup tekan **Enter** saja sampai proses selesai.

Setelah selesai, install **Node.js**, **Git**, dan **FFmpeg**:

```bash
pkg install nodejs git ffmpeg -y
```

*(Opsional)* Cek apakah Node.js dan Git sudah terpasang dengan benar:
```bash
node -v && git --version
```
Jika muncul versi seperti `v22.x.x` / `v24.x.x` dan `git version 2.x.x`, artinya siap lanjut!

---

## 3. Download Script (SC) HuTao - MD

> ⚠️ **PENTING:** Selalu taruh folder bot di **home Termux (`~`)**, **JANGAN** jalankan `npm install` di `/sdcard` karena penyimpanan `/sdcard` Android tidak mendukung *symlink* `node_modules` (akan error `EPERM`).

### Cara A — Download Langsung dari GitHub (Disarankan)
```bash
cd ~
git clone https://github.com/dinzid04/HuTao-MD.git
cd HuTao-MD
```

### Cara B — Jika Punya File ZIP di Folder Download HP
1. Berikan izin akses penyimpanan dulu (klik **Izinkan / Allow** di pop-up HP):
   ```bash
   termux-setup-storage
   pkg install unzip -y
   ```
2. Salin & ekstrak file ZIP ke home Termux `~` (ganti `HuTao-MD.zip` sesuai nama file ZIP kamu):
   ```bash
   cd ~
   cp /sdcard/Download/HuTao-MD.zip ~/
   unzip HuTao-MD.zip -d HuTao-MD
   cd HuTao-MD
   ```

---

## 4. Atur Nomor Owner & Identitas Bot (Opsional / Disarankan)

Sebelum menyalakan bot, atur nomor owner dan nama bot kamu di file `settings.js`:

```bash
pkg install nano -y
nano settings.js
```

Di dalam editor `nano`, cari dan ubah bagian berikut:
- `global.owner = '628xxxxxxxxxx';` → ganti dengan **nomor WA kamu** (owner).
- `global.namaOwner = 'NamaKamu';` → ganti dengan nama kamu.
- `global.botname = 'HuTao - MD';` → ganti nama bot sesuka kamu.
- `global.mongoUri = '';` → **kosongkan (`''`)** jika hanya mau pakai database lokal di HP (aman & simple untuk pemula), atau isi URI MongoDB Atlas milik kamu sendiri jika ingin cloud sync.

**Cara menyimpan & keluar dari `nano`:**
1. Tekan **CTRL + O** (di tombol tambahan atas keyboard Termux) lalu tekan **Enter** untuk simpan.
2. Tekan **CTRL + X** untuk keluar.

---

## 5. Jalankan Bot & Install Modul Otomatis

Pastikan kamu sudah berada di dalam folder `HuTao-MD`, lalu jalankan script khusus Termux:

```bash
bash termux-start.sh
```
*(Atau bisa juga pakai `npm run start:termux`).*

Apa yang akan terjadi otomatis:
1. Script akan mengecek kelengkapan paket & `node_modules`.
2. Saat pertama kali jalan, script otomatis menjalankan `npm install` (tunggu sekitar **30–90 detik** tergantung kecepatan internet; jika jaringan sempat putus, script akan otomatis mencoba ulang hingga 3x).
3. `termux-wake-lock` otomatis diaktifkan agar Android tidak mematikan bot saat layar HP mati.

---

## 6. Hubungkan WhatsApp (Pairing Code)

Setelah proses install selesai dan banner bot muncul:
1. Termux akan meminta **Nomor WhatsApp Bot**.
2. Ketik nomor WA bot kamu dengan awalan `62` (contoh: `6285712345678`), lalu tekan **Enter**.
3. Tunggu beberapa detik hingga muncul **Kode Pairing 8 karakter** (contoh: `ABCD-1234`).
4. Buka aplikasi **WhatsApp** di HP yang dipakai untuk nomor bot:
   - Ketuk **Titik Tiga (⋮)** di pojok kanan atas → pilih **Perangkat Tertaut** (*Linked Devices*).
   - Ketuk **Tautkan Perangkat** (*Link a Device*).
   - Pilih **Tautkan dengan nomor telepon saja** (*Link with phone number instead*) di bagian bawah.
   - Masukkan **8 digit kode pairing** yang muncul di Termux.
5. Tunggu beberapa detik sampai muncul tulisan **`● ONLINE HuTao - MD Ready`** di Termux!
6. Coba chat ke nomor bot: `.menu` 🎉

---

## 7. Pengaturan HP Agar Bot Awet Nyala di Background

Supaya bot tidak dimatikan paksa oleh sistem Android saat layar HP terkunci:
1. Buka **Pengaturan HP** → **Aplikasi** → cari **Termux**.
2. Masuk ke menu **Baterai / Penggunaan Baterai**.
3. Pilih **Tidak Dibatasi** (*Unrestricted*) / matikan **Optimasi Baterai**.
4. Di bar notifikasi HP, pastikan notifikasi **Termux (wake lock held)** tidak dihapus paksa.

---

## 8. Perintah Harian yang Sering Dipakai

- **Menghentikan bot:** Tekan **CTRL + C** di keyboard Termux.
- **Menyalakan bot lagi (setelah ditutup/HP restart):**
  ```bash
  cd ~/HuTao-MD && bash termux-start.sh
  ```
- **Ganti nomor WA bot (reset session lama):**
  ```bash
  cd ~/HuTao-MD
  rm -rf session
  bash termux-start.sh
  ```
- **Update SC ke versi terbaru dari GitHub:**
  - Lewat chat WA Owner: ketik `.updatesc`
  - Atau manual lewat Termux:
    ```bash
    cd ~/HuTao-MD
    git pull origin main
    bash termux-start.sh
    ```

---

## 9. Solusi Masalah Umum (Troubleshooting Pemula)

| Masalah | Penyebab & Solusi |
| :--- | :--- |
| **`npm error ETIMEDOUT` / koneksi terputus** | Jaringan seluler kurang stabil saat download modul. Cukup jalankan ulang `bash termux-start.sh` (otomatis melanjutkan & retry) atau pindah ke WiFi. |
| **`EPERM` / error symlink saat install** | Folder bot ditaruh di `/sdcard`. Pindahkan ke home Termux (`cd ~`) lalu clone/ekstrak ulang di sana. |
| **Muncul warning `sharp` / `canvas` tidak terpasang** | **Normal di Android ARM64!** Modul tersebut opsional dan tidak mempengaruhi jalannya bot. Abaikan saja, bot tetap jalan lancar. |
| **Bot tiba-tiba mati saat layar HP dimatikan** | Optimasi baterai HP membunuh Termux. Ubah pengaturan baterai aplikasi Termux ke **Tidak Dibatasi** (*Unrestricted*) dan selalu jalankan pakai `bash termux-start.sh`. |
| **Kode pairing tidak muncul / kadaluarsa** | Tekan **CTRL + C**, hapus folder session (`rm -rf session`), lalu jalankan lagi `bash termux-start.sh`. |
| **Pesan error `Cannot find module '...'`** | Versi v1.4.1 sudah punya fitur **Auto-Install & Auto-Heal** otomatis. Tunggu 10–30 detik hingga bot menginstal modul yang kurang dan restart sendiri, atau jalankan `npm install --allow-git=all --no-audit`. |
