# Ringkasan

raygent adalah alat command-line yang membawa ide mentah menjadi repo yang bisa langsung dijalankan dan sudah dipahami oleh coding agent kamu. Di sekitar inti itu, raygent juga mengelola skill agent, akun AI, serta memori dan sesi yang kamu bawa antar laptop.

Bayangkan mandor proyek. Ia tidak memasang setiap bata, tapi ia memberi setiap tim (Claude Code, opencode, Antigravity) gambar kerja, aturan dan perintah kerja pertama sebelum mereka mulai.

## Instalasi

```bash
npm install -g raygent
raygent doctor          # cek environment dulu
raygent skill install   # skill raygent, sekali per mesin
```

raygent butuh Node.js 20 atau lebih baru. Lalu, di folder kosong, ketik `/raygent init` di coding agent kamu.

## Layanan

| Layanan | Perintah | Untuk apa |
|---|---|---|
| [Skills](skills.md) | `raygent skill` | Pasang, lihat dan hapus skill agent, termasuk `/raygent init` milik raygent |
| [Init](init.md) | `raygent init` | Membuat proyek: scaffold, dokumen, aturan coding, lapisan agent, task Phase 0 |
| [Wawancara dan review AI](interview.md) | `raygent init --mode guided`, `raygent brief` | Mengubah jawabanmu jadi dokumen produk yang sudah terisi, dengan kritik AI opsional |
| [Config dan preset](config.md) | `raygent config` | Menyimpan default, preset dan endpoint AI |
| [Server MCP](mcp.md) | bagian dari `raygent init` | Menulis server MCP ke `.mcp.json` proyek baru |
| [Dashboard](dashboard.md) | `raygent dashboard`, `product`, `finance` | Memantau event, signup dan pendapatan dari yang kamu rilis |
| [Akun](accounts.md) | `raygent accounts`, `raygent claude`, `raygent gemini` | Menentukan akun AI mana yang boleh dipakai tiap proyek, dan melewati akun yang kena limit |
| [Sync](sync.md) | `raygent sync` | Membawa memori, kebijakan akun dan sesi Claude Code antar laptop |
| [Doctor](doctor.md) | `raygent doctor` | Mengecek bahwa semua yang dibutuhkan raygent sudah ada |
| [Plugin Orca](orca.md) | raygent-orca | Melihat dan mengubah kebijakan akun langsung di Orca |

## Dari ide ke phase 1

```
 ide, atau dokumen yang sudah kamu punya
   │
   ▼
 /raygent init ── wawancara, bantahan, potong phase 1, stack beserta alasannya
   │
   ▼
 docs/raygent-init.json ── ditunjukkan ke kamu untuk disetujui
   │  setuju
   ▼
 raygent init --from ── repo jalan + AGENTS.md + docs/ + aturan + .claude/
   │
   ▼
 /bootstrap-project ── mengisi celah TODO(content)
   │
   ▼
 task ── build ── /verify ── code review
   │
   ▼
 raygent dashboard ── pantau setelah live
```

raygent berhenti di phase 1 yang sudah dibangun dan diverifikasi. Deploy adalah urusanmu.

## Tempat raygent menyimpan file

| Path | Isi |
|---|---|
| `~/.raygent/config.json` | config dan preset ([Config](config.md)) |
| `~/.raygent/skills/` | skill milikmu sendiri ([Skills](skills.md)) |
| `~/.raygent/accounts.json` | akun AI dan kebijakan proyek ([Akun](accounts.md)) |
| `~/.raygent/products.json`, `finance.jsonl`, `analytics/` | data dashboard ([Dashboard](dashboard.md)) |
| `~/.raygent/sync-state.json`, `sync.lock` | catatan sync ([Sync](sync.md)) |
