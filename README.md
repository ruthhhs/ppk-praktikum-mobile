# SIP! : Sistem Informasi Praktikum

Aplikasi mobile (React Native + Expo) untuk presensi praktikum. Sprint 1 memakai data dummy lokal, tanpa database.

README ini memandu kamu sebagai programmer dari **clone repo sampai punya APK sendiri di HP** lewat **EAS Build** (tanpa Expo Go).

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

## 3. EAS CLI (hanya untuk yang membuat build)

> **Bagian ini hanya untuk PM/Dev A.** Programmer lain cukup memasang APK dari halaman Builds (bagian 4) dan boleh melewati bagian ini. Kalau suatu saat kamu perlu build sendiri, ikuti langkah di bawah.

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

## 4. Pasang aplikasi di HP

Kamu **tidak perlu build sendiri**. APK dibuat satu kali oleh PM/Dev A di organisasi, lalu semua orang memakai APK yang sama.

1. Buka https://expo.dev dari **HP Android**, login, pilih organisasi `ppk6-d1`.
2. Buka proyek, lalu menu **Builds**.
3. Pilih build profil **development** terbaru dengan status **Finished**.
4. Tekan **Install** (atau scan QR di halaman itu) untuk mengunduh file `.apk`.
5. Buka file `.apk`, izinkan instalasi dari sumber tidak dikenal bila diminta, lalu **Install**.

Buka aplikasinya. Layar yang muncul adalah pemilih server, karena aplikasi menunggu terhubung ke laptopmu. Lanjut ke bagian 5.

**Dua jenis APK, jangan tertukar:**

| Profil | Untuk apa | Butuh laptop? | Perubahan kode muncul? |
|---|---|---|---|
| `development` | Coding harian (**ini yang kamu pasang**) | Ya, server harus menyala | Langsung, tanpa build |
| `preview` | Demo, uji PM, dibagikan ke asisten | Tidak | Hanya setelah build ulang |

Kalau gagal memasang (konflik versi atau tanda tangan), **uninstall** aplikasi SIP! yang lama dulu. iPhone tidak bisa memasang APK.

---

## 5. Rutinitas coding harian

Dua hal yang perlu diingat:

- **Mengubah kode (`.tsx`, `.ts`, style, teks) tidak perlu build ulang.** Simpan file, perubahan langsung muncul di HP.
- **Push ke GitHub tidak memicu build.** GitHub hanya menyimpan kode.

### Awal hari / sebelum mulai tugas

```bash
git checkout main
git pull                          # ambil kode terbaru tim
npm install                       # aman dijalankan tiap kali
git checkout feat/<ID>-<nama>     # branch tugasmu (cara membuatnya: bagian 7)
git merge main                    # bawa perubahan terbaru ke branch-mu
npx expo start --dev-client       # jalankan server
```

Buka aplikasi SIP! di HP, pilih server yang muncul (atau scan QR di terminal). Laptop dan HP harus **satu Wi-Fi**. Kalau jaringan memblokir:

```bash
npx expo start --dev-client --tunnel
```

### Saat ngoding

1. Edit kode, lalu **simpan (Ctrl+S)**. Perubahan tampil otomatis di HP.
2. Tampilan tidak berubah? Tekan **`r`** di terminal untuk reload.
3. Masih aneh? Hentikan server (Ctrl+C), lalu `npx expo start --dev-client -c` (membersihkan cache).

Data masih dummy di state, jadi data kembali ke awal setiap kali aplikasi di-reload. Itu normal di Sprint 1.

### Simpan pekerjaan

```bash
git add .
git commit -m "feat: deskripsi singkat"
git push                          # pertama kali: git push -u origin feat/<ID>-<nama>
```

Commit sering, push minimal sekali sehari. Selesai satu tugas, buka Pull Request (aturannya di bagian 7).

### Setelah ada PR yang ter-merge

```bash
git checkout main && git pull && npm install
```

Lalu kembali ke branch-mu, `git merge main`, dan restart server.

---

## 6. Kapan perlu build ulang?

Cek tabel ini setiap kali ragu, terutama setelah `git pull`.

| Yang berubah | Tindakan | Build ulang? |
|---|---|---|
| Kode `.ts/.tsx`, style, teks, layout | Simpan file | **Tidak** |
| Gambar/aset yang di-import dari proyek | Simpan, tekan `r` | **Tidak** |
| `git pull` membawa perubahan kode | Restart server | **Tidak** |
| `package.json` / `package-lock.json` berubah | `npm install`, restart dengan `-c` | **Biasanya tidak** |
| Error *"Cannot find native module ..."* setelah menambah paket | Paket butuh kode native | **Ya**, build `development` ulang |
| `app.json` berubah di `plugins`, ikon, splash, izin, `android.package` | Tarik perubahan | **Ya**, build `development` ulang |
| Mau uji versi standalone untuk demo | Minta PM | **Ya**, build `preview` |

**Aturan praktis:** kalau hanya kode tampilan dan logika yang berubah, **jangan build**. Kalau muncul error aneh setelah pull, urutannya: `npm install` → `npx expo start --dev-client -c` → baru curiga perlu build ulang, dan tanya grup dulu.

### Siapa yang build?

Hanya **PM atau Dev A**. Kuota build gratis terbatas dan dipakai bersama satu organisasi, jadi programmer lain tidak perlu menjalankan `eas build`. Perintahnya (untuk yang membuat build, setelah `eas login` di bagian 3):

```bash
eas build --platform android --profile development   # APK untuk coding
eas build --platform android --profile preview       # APK demo
```

Setelah build ulang `development`, PM mengumumkan di grup, lalu **semua orang mengunduh APK terbaru** dari halaman Builds (bagian 4).

### Jadwal build `preview`

- **Hari 3:** build percobaan setelah integrasi alur penuh.
- **Hari 4:** build final untuk demo dan untuk dibagikan ke asisten.
- Di luar itu, hanya dengan izin PM.

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

**Semua programmer:**

```bash
git clone <URL-REPO> && cd <nama-folder-repo>
npm install
npx expo start --dev-client          # coding harian
npx expo-doctor                      # cek masalah dependensi
```

**Hanya PM/Dev A (membuat build):**

```bash
npm install -g eas-cli
eas login && eas whoami
eas project:info
eas build --platform android --profile development   # APK coding
eas build --platform android --profile preview       # APK demo
```

Pertanyaan atau kendala: tanyakan di grup tim atau langsung ke PM.
