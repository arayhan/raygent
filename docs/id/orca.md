# Plugin Orca

[raygent-orca](https://github.com/arayhan/raygent-orca) adalah plugin untuk [Orca](https://orca.app) yang menampilkan dan mengubah kebijakan akun raygent untuk workspace yang sedang aktif. Plugin ini juga memilih akun yang tepat saat Orca menjalankan Claude.

Bayangkan kartu aturan dari [Akun](accounts.md), ditempel di sisi setiap workspace supaya kamu tidak perlu mencarinya.

## Yang terlihat

Panel **Raygent Accounts** di sidebar kanan menampilkan semua akun terdaftar:

- yang diizinkan lebih dulu, sesuai urutan cadangan, lalu sisanya;
- mana yang sedang kena limit;
- mana yang jadi akun aktif Orca;
- mana yang dipakai peluncuran berikutnya, ditandai `next`.

Item di status bar membawa ringkasan yang sama. Menekannya akan me-refresh.

## Mulai cepat

```bash
npm i -g raygent
raygent accounts discover          # daftarkan login sekali
raygent accounts allow personal    # di proyek: siapa yang boleh jalan di sini
```

Lalu buka panel Raygent Accounts di Orca.

## Mengubah kebijakan

| Tombol | Fungsi |
|---|---|
| Allow | tambahkan akun di akhir daftar |
| Remove | keluarkan dari daftar |
| Panah | naikkan satu posisi |
| Clear policy | biarkan proyek memakai akun mana pun lagi |
| Allow only this | mulai kebijakan di proyek yang belum punya |

Plugin menulis entri `projects` yang sama dengan `raygent accounts allow`, dan tidak menyentuh bagian lain dari file.

## Berganti akun

```
Orca menjalankan Claude di workspace yang punya kebijakan
   │
   ▼
hook agent.launch.before
   │
   ▼
ditulis ulang jadi: raygent claude --account <next> …
```

- **Per peluncuran, otomatis.** Peluncuran memakai akun pertama yang diizinkan dan tidak kena limit, apa pun akun yang aktif di Orca. Kalau semua akun yang diizinkan kena limit, tetap jalan di yang pertama. Matikan lewat setting *Pick the account per workspace policy*; kebijakan lalu hanya ditampilkan.
- **Make active.** Tombol di setiap baris menjalankan `orca account select --agent claude --account <id>`, jadi akun aktif Orca berubah untuk semua peluncuran berikutnya. Hanya akun yang dikelola Orca yang punya tombol ini.

Sesi Claude yang sudah terbuka tetap memakai akunnya. Ganti akun berarti tab baru.

## Izin

| Izin | Alasan |
|---|---|
| `workspace:read` | mengetahui workspace yang aktif dan memetakan peluncuran ke proyek |
| `terminal:send` | tombol yang membuka terminal berisi `raygent claude` atau `raygent gemini` |
| `settings:own` | toggle penegakan kebijakan |

`raygent` dan `orca` harus ada di PATH mesin tempat Orca berjalan.

## File

Plugin membaca `~/.raygent/accounts.json` dan tidak pernah melihat token. Panel diperbarui saat fokus berpindah atau file berubah, baik ditulis ulang oleh CLI maupun oleh hook Claude Code.

## Pemecahan masalah

- **Panel kosong.** Belum ada akun terdaftar. Jalankan `raygent accounts discover`.
- **Peluncuran memakai akun yang salah.** Pastikan setting penegakan aktif dan `raygent` ada di PATH Orca.
