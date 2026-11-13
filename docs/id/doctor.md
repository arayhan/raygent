# Doctor

`raygent doctor` mengecek bahwa semua yang dibutuhkan raygent sudah ada dan mencetak satu baris per cek. Jalankan pertama kali di mesin baru, dan setiap kali ada kegagalan yang tidak kamu pahami.

Bayangkan checklist sebelum terbang: baris yang gagal di darat lebih murah daripada kegagalan di udara.

## Mulai cepat

```bash
raygent doctor
```

```
ok   node             v24.1.0
ok   pnpm             10.12.1
ok   git              git version 2.45.0
ok   scaffolder       .../vendor/scaffolder/bin/create.mjs
ok   personal skills  ~/.raygent/skills
ok   global skills    ~/.agents/skills
ok   ai               not configured (AI steps stay off) -- raygent config set ai.baseUrl ...
ok   accounts         3 accounts, policies for 2 projects
ok   sync             last run 11/13/2026, 11:00 PM ok
```

## Daftar cek

| Cek | Lulus kalau | Kalau gagal |
|---|---|---|
| `node` | Node.js versi 20 atau lebih baru | upgrade Node |
| `pnpm` | `pnpm` ada di PATH | pasang pnpm; proyek web yang dihasilkan memakainya |
| `git` | `git` ada di PATH | pasang git |
| `scaffolder` | script scaffolder ada | pasang ulang raygent, atau set `RAYGENT_CCP_PATH`; tanpa itu kamu hanya dapat dokumen stub |
| `personal skills` | selalu (informasi): menampilkan `~/.raygent/skills` atau "not created yet" | buat foldernya untuk menambah skill sendiri |
| `global skills` | selalu (informasi): menampilkan folder skill agent global atau "not found" | tidak ada yang perlu diperbaiki |
| `ai` | belum dikonfigurasi, atau `<baseUrl>/models` menjawab dalam 5 detik | perbaiki `ai.baseUrl`, `ai.apiKey`, `ai.model`. Lihat [Config](config.md) |
| `accounts` | informasi: jumlah akun dan kebijakan | lihat [Akun](accounts.md) |
| `sync` | informasi: apakah sync sudah disiapkan dan hasil run terakhir | lihat [Sync](sync.md) |

"Not configured" dianggap lulus untuk `ai`: langkah AI cukup tetap mati.

## Pemecahan masalah

- **`scaffolder … missing`.** Arahkan `RAYGENT_CCP_PATH` ke `bin/create.mjs` dari raygent-scaffolds, atau pasang ulang raygent.
- **`ai` gagal dengan error jaringan.** Endpoint mati atau URL-nya salah. `raygent init` tetap jalan; hanya langkah AI yang dilewati.
