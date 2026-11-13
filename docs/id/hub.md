# Agent Hub

`raygent hub` adalah server kecil, biasanya di VPS kamu, yang mengenal setiap agent yang kamu buat: perannya, akun AI yang dipakai, proyek tempat ia bekerja, dan apa yang sedang dikerjakan setiap sesinya saat ini. Laptop melapor ke hub lewat hook Claude Code; kamu membacanya dengan `raygent hub status`.

Bayangkan papan di lobi kantor. Setiap karyawan punya papan nama, meja dan lampu status, dan siapa pun yang punya kartu akses bisa melihatnya.

## Mulai cepat

Di server (sekali saja):

```bash
git clone https://github.com/arayhan/raygent ~/raygent && cd ~/raygent && npm ci && npx tsc -p tsconfig.json
mkdir -p ~/.raygent/hub && openssl rand -hex 32 > ~/.raygent/hub/token && chmod 600 ~/.raygent/hub/token
pm2 start "node dist/cli.js hub serve --port 3300" --name raygent-hub && pm2 save
```

Pasang nginx dengan TLS di depan `127.0.0.1:3300` (lihat "Cara kerja" di bawah).

Di setiap laptop:

```bash
ssh user@your-vps cat ~/.raygent/hub/token | raygent hub login https://hub.example.com
raygent hub install-hooks
raygent hub agent add kage --account personal --role "backend dev" --project my-app --class ninja
raygent hub status
```

Token lewat pipe, jadi tidak pernah muncul di terminal atau di chat.

## Perintah

| Perintah | Fungsi |
|---|---|
| `raygent hub serve` | jalankan server: `--port` (3300), `--host` (127.0.0.1), `--data` (`~/.raygent/hub`). Token dari `RAYGENT_HUB_TOKEN` atau `<data>/token` |
| `raygent hub login <url>` | simpan URL hub dan token di laptop ini; token dibaca dari stdin atau prompt tersamar, dan dicek dulu |
| `raygent hub status` | semua agent dan sesi aktifnya, plus sesi yang tidak diklaim agent mana pun (`--json` untuk data mentah) |
| `raygent hub agent add <id>` | buat atau ubah agent: `--account` (wajib), `--role`, `--project` (ulangi untuk lebih dari satu), `--class` |
| `raygent hub agent list` | tampilkan daftar agent |
| `raygent hub agent remove <id>` | hapus agent; sesinya tampil sebagai unassigned |
| `raygent hub watch` | cetak event secara langsung saat masuk |
| `raygent hub install-hooks` | tambahkan `raygent hub emit` ke hook sesi semua akun Claude terdaftar |
| `raygent hub emit` | target hook; kamu tidak perlu menjalankannya sendiri |

```
AGENT         ROLE         ACCOUNT    STATUS   PROJECT  HOST      SINCE  TASK
kage          backend dev  personal   working  my-app   LAPTOP-A  2m     fix the login redirect
ryu           designer     work       offline
(unassigned)               office     idle     client   LAPTOP-B  14m
```

## Cara kerja

```
hook Claude Code ── raygent hub emit ── POST terpisah ──┐
raygent gemini (start/end) ─────────────────────────────┤
                                                        ▼
                      nginx (TLS) ── raygent hub serve ── agents.json
                                                      └── events.jsonl
raygent hub status / watch ◀── /api/status, /api/stream
```

**Yang dilaporkan sebuah sesi.**

| Hook Claude Code | Status |
|---|---|
| SessionStart | `idle`, menunggu prompt pertamamu |
| UserPromptSubmit | `working`, dengan 120 karakter pertama prompt sebagai task |
| Notification | `waiting`: butuh kamu di tengah giliran kerja |
| Stop | `idle`: giliran selesai |
| SessionEnd | `ended` |

- Sesi `working` tanpa event selama 30 menit tampil sebagai `stale` (laptopnya mungkin sleep).
- Sesi yang sudah berakhir tetap terlihat 10 menit; sesi yang diam 12 jam hilang dari status.
- Gemini tidak punya hook, jadi `raygent gemini` hanya melaporkan start dan end.

**Sesi milik agent yang mana.** Sesi dicocokkan lewat akun dan proyeknya. Agent yang menyebut proyek itu menang atas agent tanpa daftar proyek, yang mencakup semua proyek akunnya. Sesi yang tidak diklaim agent mana pun tampil sebagai `(unassigned)`. Pencocokan dilakukan saat status dibaca, jadi agent baru langsung mengklaim sesi yang sedang berjalan.

**Proyek** diberi nama sesuai slug di repo brain [Sync](sync.md) (`hosts/<COMPUTERNAME>.json`), jadi satu proyek punya satu nama di semua laptop. Tanpa slug, nama folder yang dipakai.

**Hook tidak pernah memperlambat sesi.** `hub emit` tidak mencetak apa pun, tidak pernah gagal, dan menyerahkan panggilan jaringan ke proses terpisah. Saat hub mati, hook tetap selesai kira-kira secepat Node mulai.

**Di belakang nginx.** Server hanya mendengarkan di `127.0.0.1` dan semua route-nya ada di bawah `/api/`. Arahkan hanya `/api/` ke server, supaya root domain tetap bebas untuk situs agent; matikan buffering untuk `/api/stream` (`proxy_buffering off`, `proxy_read_timeout` yang panjang), dan pasang TLS dengan certbot. Contoh file site yang sudah jalan ada di `deploy/agents.arayhan.com/` di repo raygent.

## API

Semua route kecuali `/api/health` dan login butuh `Authorization: Bearer <token>` atau cookie sesi browser.

| Route | Fungsi |
|---|---|
| `POST /api/events` | catat satu event |
| `GET /api/status` | agent beserta sesi aktifnya, plus sesi unassigned |
| `GET /api/agents`, `PUT /api/agents/<id>`, `DELETE /api/agents/<id>` | daftar agent |
| `GET /api/stream` | server-sent events: setiap event saat masuk |
| `GET /api/health` | `ok` |
| `POST /api/session` | login browser: `{"token": "..."}` memasang cookie sesi |
| `GET /api/session` | `{"ok": true}` kalau sudah login, selain itu 401 |
| `DELETE /api/session` | logout: menghapus cookie |

## Login browser

Halaman web (Agent Office) tidak boleh memegang token, jadi token ditukar sekali:

1. Halaman mengirim token ke `POST /api/session`.
2. Hub membalas dengan cookie `raygent_hub`: `HttpOnly` (script halaman tidak bisa membacanya), `Secure` di belakang TLS, `SameSite=Strict` (situs lain tidak bisa memakainya), terbatas ke `/api`, berlaku 30 hari.
3. Semua request berikutnya, termasuk stream live, otomatis membawa cookie itu.

Cookie berisi waktu kedaluwarsa yang ditandatangani dengan token, jadi hub tidak menyimpan apa pun. Untuk me-logout semua browser, ganti token di `~/.raygent/hub/token` lalu restart hub; setelah itu login ulang di laptop.

## File

| Path | Lokasi | Isi |
|---|---|---|
| `~/.raygent/hub/token` | server | token (mode 600) |
| `~/.raygent/hub/agents.json` | server | daftar agent |
| `~/.raygent/hub/events.jsonl` | server | semua event; 24 jam terakhir membangun ulang status saat restart |
| `~/.raygent/hub.json` | laptop | URL hub dan token (mode 600) |
| `<config dir>/settings.json` | laptop | hook yang ditambahkan `install-hooks` |

## Privasi

Awal setiap prompt (120 karakter) disimpan di server sebagai judul task. Jangan menempel secret di awal prompt. Siapa pun yang punya token bisa membaca semua status dan mengubah agent, jadi perlakukan token seperti password.

## Pemecahan masalah

- **`status` bilang tidak bisa menjangkau hub.** Cek `raygent doctor`, lalu `curl https://<hub>/api/health`.
- **"the hub refused this token".** Token di pipe tidak cocok dengan milik server. Baca lagi dari `~/.raygent/hub/token`.
- **Sesi tampil sebagai unassigned.** Belum ada agent dengan akun itu, atau agent-nya mencantumkan proyek lain. Cek `raygent hub agent list`.
- **Tidak ada yang tampil sama sekali.** Jalankan `raygent hub install-hooks`, lalu mulai sesi baru; sesi yang sudah terbuka tetap memakai hook lamanya.
