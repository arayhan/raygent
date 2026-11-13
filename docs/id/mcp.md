# Server MCP

Saat `raygent init`, setelah checklist skill, checklist kedua menawarkan server MCP untuk proyek baru. Pilihanmu masuk ke `.mcp.json` proyek itu.

Bayangkan memasang aksesori ke meja kerja baru sebelum pekerjaan pertama: agent menemukannya sudah tersambung.

## Mulai cepat

Jalankan `raygent init` dan centang server yang kamu mau saat checklist MCP muncul. Di init spec, cantumkan di bagian MCP supaya checklist tidak ditampilkan. Lihat [Init](init.md).

## Server yang tersedia

| Id | Yang didapat agent |
|---|---|
| `context7` | dokumentasi library terbaru di dalam konteks (`npx -y @upstash/context7-mcp`) |

## Cara kerja

```
pilihan checklist
   │
   ▼
baca .mcp.json yang sudah ada (kalau ada)
   │
   ▼
gabung: tambah server baru, entri lama tidak disentuh
   │
   ▼
tulis .mcp.json
```

**Secret tidak pernah ditulis.** Server yang butuh key mendapat placeholder `${VAR_NAME}`, dan Claude Code membaca nilainya dari shell saat mulai.

## File

| Path | Isi |
|---|---|
| `<project>/.mcp.json` | server MCP untuk proyek itu |

## Pemecahan masalah

- **Server gagal start.** Pastikan env var yang disebut di placeholder `${VAR_NAME}` sudah di-set di shell.
- **Entri yang kamu tulis manual berubah.** Seharusnya tidak: entri lama tidak pernah disentuh. Laporkan sebagai bug.
