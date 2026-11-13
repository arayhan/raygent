# Akun

`raygent accounts` mendaftarkan akun AI kamu dan menentukan, per proyek, akun mana yang boleh dipakai dan dengan urutan cadangan seperti apa. `raygent claude` dan `raygent gemini` lalu menjalankan agent dengan akun pertama yang diizinkan dan tidak sedang kena limit.

Bayangkan lemari kunci dengan kartu aturan di setiap pintu: kunci kantor hanya membuka proyek kantor, dan kalau satu kunci sudah habis dipakai hari ini, kamu ambil kunci berikutnya di kartu.

Tidak ada token yang disimpan. Akun Claude adalah folder `CLAUDE_CONFIG_DIR` yang sudah login. Akun Gemini adalah nama sebuah env var.

## Mulai cepat

```bash
raygent accounts discover            # daftarkan semua Claude Code yang sudah login
raygent accounts allow personal work # di proyek: personal dulu, work sebagai cadangan
raygent claude                       # jalan dengan akun pertama yang diizinkan dan tidak kena limit
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `raygent accounts discover` | daftarkan semua config dir Claude Code yang sudah login (profil Orca dan `~/.claude`) |
| `raygent accounts add <id>` | daftarkan satu secara manual: `--provider claude\|gemini`, `--config-dir <dir>`, `--env KEY=$VAR` |
| `raygent accounts remove <id>` | lupakan akun dan hapus dari semua kebijakan |
| `raygent accounts list` | tampilkan akun terdaftar |
| `raygent accounts allow <id...>` | set akun yang boleh dipakai proyek ini, sesuai urutan cadangan (`--project <path>`) |
| `raygent accounts policy` | tampilkan kebijakan proyek ini (`--project <path>`) |
| `raygent accounts limit <id>` | tandai akun kena limit, default 5 jam (`--until 7:30pm` atau waktu ISO, `--clear`) |
| `raygent accounts check` | laporkan apakah akun sesi ini diizinkan (`--hook` untuk peringatan singkat) |
| `raygent accounts observe` | target hook: mencatat limit pemakaian yang terlihat di transkrip |
| `raygent accounts install-hooks` | tambahkan hook `check` dan `observe` ke semua akun Claude terdaftar |
| `raygent claude [args]` | jalankan `claude` dengan akun yang terpilih (`--account <id>` untuk memaksa satu) |
| `raygent gemini [args]` | jalankan `gemini` dengan cara yang sama |

Nilai `--env` yang diawali `$` dibaca dari environment saat dijalankan, tidak pernah disimpan.

## Cara akun dipilih

```
raygent claude di sebuah proyek
   │
   ▼
ada kebijakan untuk proyek ini? ── tidak ── semua akun terdaftar boleh jalan
   │ ya
   ▼
telusuri daftar yang diizinkan sesuai urutan
   │
   ▼
lewati akun yang ditandai limit (sampai waktu reset-nya)
   │
   ▼
yang pertama tersisa ── jalankan dengan CLAUDE_CONFIG_DIR-nya
(semua kena limit ── jalan di yang pertama; Claude menampilkan pesan limit sendiri)
```

**Limit tercatat sendiri.** Saat Claude Code mencetak `Usage limit reached`, hook `observe` menandai akun itu sampai waktu reset, dan peluncuran berikutnya melewatinya.

**Peringatan, bukan blokir.** Hook `check` memberi peringatan saat sesi dimulai dengan akun yang tidak diizinkan proyek. Sesi tidak pernah dihentikan.

**Memaksa satu akun.** `raygent claude --account work` menjalankan akun itu walaupun kebijakan tidak mencantumkannya, dan memberi peringatan.

## File

| Path | Isi |
|---|---|
| `~/.raygent/accounts.json` | akun, limit dan kebijakan per path proyek |
| `<config dir>/settings.json` | hook yang ditambahkan `install-hooks` |

Di beberapa laptop, [Sync](sync.md) membagikan kebijakan lewat slug proyek, dan [plugin Orca](orca.md) menampilkan serta mengubahnya.

## Pemecahan masalah

- **"no gemini account allowed for …".** Kebijakan proyek tidak mencantumkan akun Gemini. Tambahkan lewat `raygent accounts allow`.
- **Akun dilewati padahal sudah normal lagi.** Jalankan `raygent accounts limit <id> --clear`.
- **Profil Orca baru tidak muncul.** Login dulu, lalu jalankan `raygent accounts discover` lagi.
- **Sesi yang sudah terbuka tetap memakai akunnya.** Ganti akun berarti sesi baru; `--continue` hanya menemukan sesi di folder akun yang sama.
