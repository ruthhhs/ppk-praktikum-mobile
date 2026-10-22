# SIP! : Sistem Informasi Praktikum

Aplikasi mobile (React Native + Expo) untuk presensi praktikum. Sprint 1 memakai data dummy lokal, tanpa database.

README ini memandu kamu dari **clone repo sampai punya APK sendiri di HP** lewat **EAS Build** (tanpa Expo Go).

---

## 0. Yang perlu disiapkan

| Kebutuhan | Keterangan |
|---|---|
| Node.js (LTS) | Cek versi: `node -v`. Gunakan versi yang sama dengan tim: **(isi versi, misal 20.x)** |
| Git | `git --version` |
| Akun Expo pribadi | Daftar di https://expo.dev jika belum punya |
| HP Android | Aktifkan izin **install dari sumber tidak dikenal** untuk browser/file manager yang dipakai |
| Editor | VS Code (disarankan) |

> iOS tidak termasuk Sprint 1. Semua build hanya untuk **Android (APK)**.

---

## 1. Gabung ke organisasi Expo

1. PM akan mengundang email akun Expo kamu ke organisasi **`ppk6-d1`**.
2. Buka email undangan dari Expo, klik **Accept**.
3. Login ke https://expo.dev dan pastikan `ppk6-d1` muncul di pemilih akun (pojok kiri atas).

Kalau undangan belum masuk, kabari PM dan sebutkan email akun Expo-mu.

---

## 2. Clone dan install dependensi

```bash
git clone https://github.com/ruthhhs/ppk-praktikum-mobile
cd ppk-praktikum-mobile
npm install
```

Gunakan `npm install` (bukan yarn/pnpm) agar sama dengan `package-lock.json` di repo.

Untuk menambah library, selalu pakai:

```bash
npx expo install <nama-paket>
```

Jangan `npm install <paket>` biasa, karena versinya bisa tidak cocok dengan SDK Expo. Jangan menambah library yang butuh kode native tanpa konfirmasi PM.

---

## 3. Install EAS CLI dan login

```bash
npm install -g eas-cli
eas login
```

Login dengan **akun Expo pribadimu**. Organisasi tidak punya password sendiri; aksesmu didapat dari keanggotaan tadi.

Cek:

```bash
eas whoami
```

Hasilnya harus menampilkan username-mu dan organisasi `ppk6-d1`.

Lalu cek proyek:

```bash
eas project:info
```

Pastikan **owner = `ppk6-d1`**. Kalau owner masih akun pribadi PM atau muncul error "not authorized", berhenti dan hubungi PM.

> **JANGAN jalankan `eas init`.** Proyek sudah terhubung (`projectId` ada di `app.json`). Menjalankannya bisa membuat proyek baru yang salah.

---

## 4. Build APK sendiri (profil `preview`)

```bash
eas build --platform android --profile preview
```

Hal yang akan terjadi:

1. EAS mengunggah kode ke server Expo dan membuat antrean build.
2. Kalau ditanya soal **keystore (Android credentials)**, pilih **gunakan yang sudah ada**. **Jangan generate keystore baru.** Keystore dibuat sekali oleh PM dan dipakai bersama supaya APK dari semua orang bisa saling menimpa saat update.
3. Tunggu sampai selesai. Antrean bisa cukup lama di paket gratis (bisa belasan menit atau lebih). Pantau di https://expo.dev, menu **Builds**, atau di terminal.
4. Setelah selesai, terminal menampilkan **link dan QR** untuk mengunduh APK.

### Pasang di HP

1. Buka link/QR tadi **di HP**, unduh file `.apk`.
2. Buka file, izinkan instalasi dari sumber tidak dikenal bila diminta, lalu **Install**.
3. Buka aplikasi **SIP!**.

Kalau instalasi gagal dengan pesan konflik/tanda tangan, uninstall aplikasi SIP! versi lama dulu, lalu pasang ulang. Itu biasanya terjadi karena APK lama dibuat dengan `android.package` atau keystore yang berbeda.

### Aturan hemat kuota build

Kuota build di paket gratis terbatas dan dipakai bersama satu organisasi. Karena itu:

- **Jangan build setiap habis mengubah kode.** Build `preview` dipakai untuk: uji fitur yang sudah matang, uji sebelum merge penting, dan jadwal build tim (percobaan Hari 3, final Hari 4).
- Untuk coding harian, pakai **development build** (bagian 5), yang hanya perlu dibuat sekali.
- Sebelum build, pastikan `git pull` terbaru dan kode berjalan tanpa error.

---

## 5. Coding harian tanpa build ulang (development build)

Tanpa Expo Go, perubahan kode **tidak muncul** di APK `preview` sebelum build ulang. Supaya tidak menunggu antrean tiap perubahan, gunakan **development build**: APK khusus yang dibuat **sekali**, lalu terhubung ke laptop dan menampilkan perubahan kode secara langsung (hot reload).

> Prasyarat (disiapkan PM/Dev A di repo): paket `expo-dev-client` terpasang dan `eas.json` punya profil `development` dengan `"developmentClient": true`. Kalau belum ada, tanyakan sebelum lanjut.

**Langkah:**

```bash
# 1) Buat development build (cukup sekali, atau saat ada perubahan native)
eas build --platform android --profile development

# 2) Pasang APK-nya di HP (cara sama seperti bagian 4)

# 3) Jalankan server development di laptop
npx expo start --dev-client
```

Buka aplikasi **SIP! (development)** di HP, lalu pilih server yang muncul atau scan QR dari terminal. Laptop dan HP harus **satu Wi-Fi**. Kalau jaringan memblokir koneksi:

```bash
npx expo start --dev-client --tunnel
```

Selama kamu hanya mengubah kode JavaScript/TypeScript, **tidak perlu build ulang**. Build ulang hanya perlu bila menambah library native atau mengubah konfigurasi native (`app.json` bagian plugin, `android.package`, dsb).

---

## 6. Alur ngoding harian

Bagian ini menjawab pertanyaan yang paling sering muncul: **kapan perlu build, kapan tidak**.

### Prinsip dasar

- **Push ke GitHub tidak memicu build.** Tidak ada build otomatis. GitHub hanya menyimpan kode.
- **Build EAS hanya terjadi kalau kamu menjalankan `eas build` sendiri.**
- Selama kamu memakai development build (bagian 5), **mengubah kode JS/TS tidak perlu build ulang**. Cukup simpan file, perubahan langsung muncul di HP.

### Rutinitas satu hari

**A. Awal hari (atau sebelum mulai tugas baru)**

```bash
git checkout main
git pull                          # ambil kode terbaru tim
npm install                       # jalankan jika package.json / package-lock.json berubah (aman dijalankan tiap kali)
git checkout feat/<ID>-<nama>     # pindah ke branch tugasmu (atau buat baru: git checkout -b feat/<ID>-<nama>)
git merge main                    # bawa perubahan terbaru main ke branch-mu
npx expo start --dev-client       # jalankan server development
```

Buka aplikasi **SIP! (development)** di HP, sambungkan ke server yang muncul. Tidak perlu build.

**B. Saat ngoding**

1. Edit kode di VS Code, lalu **simpan (Ctrl+S)**.
2. Perubahan tampil otomatis di HP (Fast Refresh). Tidak perlu build, tidak perlu install ulang APK.
3. Kalau tampilan tidak berubah atau terasa aneh: tekan **`r`** di terminal Metro untuk reload, atau goyangkan HP dan pilih **Reload**.
4. Kalau masih aneh: hentikan server (Ctrl+C), lalu jalankan `npx expo start --dev-client -c` (`-c` membersihkan cache).

Catatan: karena data masih dummy di state, **data kembali ke awal setiap kali aplikasi di-reload**. Itu normal di Sprint 1.

**C. Menyimpan pekerjaan (commit dan push)**

```bash
git status
git add .
git commit -m "feat: deskripsi singkat perubahan"
git push -u origin feat/<ID>-<nama>     # pertama kali; selanjutnya cukup: git push
```

- Commit **sering** (tiap bagian kecil selesai), push minimal **sekali sehari**.
- Push **tidak butuh build** dan tidak mengubah apa pun di HP-mu.
- Jangan push ke `main`. Selesai satu tugas, buka Pull Request.

**D. Setelah PR-mu atau PR teman ter-merge**

```bash
git checkout main
git pull
npm install
# lalu kembali ke branch-mu dan: git merge main
```

Kalau server development sedang jalan, restart (Ctrl+C lalu `npx expo start --dev-client`).

### Kapan perlu apa? (cek setelah pull atau sebelum coding)

| Yang berubah | Tindakan | Build ulang? |
|---|---|---|
| Kamu mengubah file `.js/.jsx/.ts/.tsx`, style, teks, layout | Simpan file | **Tidak** |
| Kamu mengubah gambar/aset yang di-import dari folder proyek | Simpan, reload (`r`) | **Tidak** |
| `git pull` membawa perubahan kode saja | Restart server, buka lagi di HP | **Tidak** |
| `git pull` mengubah `package.json` / `package-lock.json` (ada paket baru atau versi baru) | `npm install`, lalu restart server dengan `-c` | **Biasanya tidak**, kecuali paket itu butuh kode native (lihat baris berikut) |
| Muncul error seperti *"Cannot find native module ..."* atau *"... not found in the app"* setelah menambah paket | Paket itu butuh kode native yang belum ada di APK dev-mu | **Ya**, build development ulang |
| `app.json` berubah di bagian `plugins`, ikon, splash, `android.package`, izin (permissions) | Tarik perubahan | **Ya**, build development ulang |
| `eas.json` berubah | Tarik perubahan | Tidak otomatis. Build ulang hanya bila profil yang kamu pakai ikut berubah, dan PM akan memberi tahu |
| Kamu ingin menguji versi standalone / mendekati demo | Build preview (atas izin PM/jadwal tim) | **Ya**, preview, bukan development |
| Pindah ke laptop lain atau HP lain | Clone ulang, `npm install`, `npx expo start --dev-client` | **Tidak**, cukup pasang APK dev yang sudah ada |

**Aturan praktis:** kalau hanya kode tampilan dan logika yang berubah, **jangan build**. Kalau tiba-tiba muncul error aneh setelah pull yang menyangkut paket atau konfigurasi, tanyakan di grup sebelum build, karena kuota build dipakai bersama.

### Hemat kuota: satu build dev untuk semua

APK development tidak berisi kodemu sendiri, hanya "wadah" yang terhubung ke laptop. Artinya **satu APK dev bisa dipakai semua programmer**, selama tidak ada perubahan native. Jadi:

1. Satu orang (PM atau Dev A) menjalankan `eas build --platform android --profile development`.
2. Yang lain mengunduh APK itu dari link di expo.dev (menu **Builds**) dan memasangnya di HP masing-masing.
3. Build ulang dilakukan lagi **hanya** saat ada perubahan native (baris "Ya" di tabel di atas), dan PM mengumumkannya di grup agar semua mengunduh APK baru.

Kalau kamu tetap ingin build sendiri, tidak masalah, tapi pakai seperlunya.

### Kapan build preview dibuat?

Build preview (APK standalone) bukan untuk coding harian. Jadwalnya:

- **Hari 1:** build percobaan untuk memastikan jalur EAS beres (dilakukan PM).
- **Hari 3:** build preview percobaan setelah integrasi alur penuh.
- **Hari 4:** build preview final untuk demo.
- Di luar itu, hanya bila ada alasan jelas dan sudah izin di grup.

### Kebiasaan yang bikin tim lancar

- `git pull` dan `npm install` **sebelum** mulai mengerjakan sesuatu, bukan setelah ada error.
- Kalau aplikasi mendadak error setelah pull, urutan cek: `npm install` → `npx expo start --dev-client -c` → baru curiga perlu build ulang.
- Jangan commit `node_modules`, jangan commit file `.env` atau rahasia apa pun.
- Beri tahu grup bila kamu mengubah `package.json` atau `app.json`, karena itu bisa memaksa orang lain `npm install` atau build ulang.

---

## 7. Alur kerja Git

```
main (stabil, dilindungi)
 └── feat/<ID-tugas>-<deskripsi-singkat>   contoh: feat/B3-form-buka-sesi
```

```bash
git checkout main
git pull
git checkout -b feat/B3-form-buka-sesi

# ...kerjakan...
git add .
git commit -m "feat: form buka sesi dengan validasi kode"
git push -u origin feat/B3-form-buka-sesi
```

Lalu buka **Pull Request** ke `main` di GitHub dan minta review sesuai urutan silang tim. Jangan push langsung ke `main`.

**Kepemilikan folder** (jangan edit folder orang lain tanpa izin):

| Folder | Pemilik |
|---|---|
| navigasi, `context/`, `data/`, `components/common/` | Dev A |
| `screens/asisten/`, `components/asisten/` | Dev B |
| `screens/praktikan/`, `components/praktikan/` | Dev C |

Kontrak data (`types.ts`) tidak boleh diubah sepihak. Usul perubahan lewat PM.

---

## 8. Jangan diubah selama sprint

Nilai berikut **dibekukan** karena mengubahnya memutus build, kredensial, atau instalasi:

- `expo.owner`
- `expo.slug`
- `expo.android.package`
- `extra.eas.projectId`
- keystore (jangan buat baru)

`expo.name` (nama tampilan) sudah final, jangan diubah tanpa izin PM.

---

## 9. Masalah umum

| Masalah | Penyebab / solusi |
|---|---|
| `eas: command not found` | Instalasi global belum jalan. Buka terminal baru atau jalankan ulang `npm install -g eas-cli` |
| Login gagal | Pakai email/username akun Expo, bukan GitHub. Kalau daftar dengan GitHub, atur password dulu di expo.dev |
| `not authorized` / proyek tidak ditemukan | Undangan organisasi belum diterima, atau `owner` di `app.json` salah. Hubungi PM |
| EAS minta membuat keystore baru | **Berhenti.** Jangan setuju, hubungi PM |
| Error slug tidak cocok dengan `projectId` | Jangan ubah slug. Tarik versi terbaru `app.json` dari `main` |
| APK tidak bisa diinstal | Izinkan sumber tidak dikenal, atau uninstall versi lama dulu |
| Dev build tidak bisa terhubung ke laptop | Pastikan satu Wi-Fi, atau pakai `--tunnel` |
| Build gagal di server | Buka log build di expo.dev (menu Builds), salin pesan error ke grup tim |
| `npm install` error dependensi | Samakan versi Node, hapus `node_modules`, jalankan lagi `npm install`. Cek juga `npx expo-doctor` |

---

## 10. Ringkasan perintah

```bash
git clone <URL-REPO> && cd <nama-folder-repo>
npm install
npm install -g eas-cli
eas login
eas whoami
eas project:info
eas build --platform android --profile preview       # APK standalone (di akhir sprint saja oleh PM)
eas build --platform android --profile development   # APK dev (sekali)
npx expo start --dev-client                          # coding harian
npx expo-doctor                                      # cek masalah dependensi
```

Pertanyaan atau kendala: tanyakan di grup tim atau langsung ke PM.