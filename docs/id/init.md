# Init

`raygent init` membuat proyek baru: scaffold yang bisa dijalankan, dokumen produk, aturan coding, lapisan agent dan rencana task Phase 0. Setiap jawaban yang belum ada akan ditanyakan; setiap jawaban juga bisa datang dari flag, preset atau spec JSON.

Bayangkan pengiriman rumah knock-down. Rangka, rencana instalasi dan perintah kerja minggu pertama datang bersamaan, jadi tukang langsung membangun alih-alih mengukur.

## Mulai cepat

```bash
raygent init my-app                          # menanyakan semuanya
raygent init my-app --platform web --framework nextjs --type product
mkdir my-app && cd my-app && raygent init --here
```

Kebanyakan orang tidak pernah menjalankannya manual: `/raygent init` di agent menjalankan `raygent init --from` untukmu setelah percakapan. Lihat [Skills](skills.md).

## Opsi

| Flag | Nilai |
|---|---|
| `--platform` | `web`, `mobile`, `cli`, `desktop`, `agent-skills` |
| `--framework` | framework yang valid untuk platform itu (tabel di bawah) |
| `--kind` | khusus web: `app` (default) atau `landing` |
| `--target` | khusus web: `frontend` (default), `backend`, `fullstack` |
| `--backend` | khusus web: `express`, `hono`, `nestjs` |
| `--monorepo` | khusus web fullstack: pakai Turborepo |
| `--type` | `product` atau `client` |
| `--mode` | `guided` (wawancara) atau `quick` (dokumen stub). Lihat [Wawancara](interview.md) |
| `--agents` | daftar dipisah koma: `claude-code`, `opencode`, `antigravity` |
| `--rules` | daftar file `docs/rules` dipisah koma (default: semua yang berlaku) |
| `--comments` | `none`, `minimal`, `full` |
| `--build-focus` | `ui-first` atau `end-to-end` |
| `--viewport` | `mobile-first` atau `web-first` |
| `--brand` | nama tampilan (default: nama proyek, huruf kapital di awal kata) |
| `--here` | buat di folder saat ini |
| `--preset <name>` | pakai preset. Lihat [Config](config.md) |
| `--from <file>` | baca semua jawaban dari init spec, tanpa pertanyaan |
| `--template` | cetak init spec yang bisa diisi lalu keluar |
| `--fill-gaps` | dengan `--from`: tanyakan field yang kosong alih-alih gagal |
| `-f, --force` | timpa file dokumen yang sudah ada |

| Platform | Framework |
|---|---|
| web | `nextjs`, `vite-react`, `tanstack-start`, `remix` |
| mobile | `react-native` |
| cli | `node`, `python`, `rust` |
| desktop | `electron` |
| agent-skills | `claude-code` |

## Init spec: tanpa pertanyaan

Init spec adalah satu file JSON berisi semua jawaban: identitas, stack, add-on, agent, aturan, jawaban wawancara, serta checklist skill dan MCP.

```bash
raygent init --template > acme.json   # bisa diisi, lengkap dengan komentar
raygent init --from acme.json         # tidak menanyakan apa pun
```

Kamu tidak perlu menulis yang pertama. Setiap init mencatat jawabannya sendiri di `docs/raygent-init.json`. Salin file itu, ganti namanya, dan `--from` mengulang setup yang sama.

**Urutan prioritas:** flag eksplisit > spec > preset > pertanyaan > default.

Spec yang salah gagal sebelum apa pun ditulis, dan menampilkan semua masalah sekaligus:

```
acme.json has 3 problems:
  project.name     "Acme Landing Page" cannot be a folder name ...
  stack.framework  "nextjs14" is not valid (...). Did you mean "nextjs"?
  rules[1]         "style" is not valid (...). Did you mean "code-style"?

Nothing was generated.
```

`--fill-gaps` menanyakan field yang tidak ada di spec. Nilai yang salah tidak pernah diubah jadi pertanyaan: salah ketik harus gagal.

## Cara kerja

```
jawaban (flag > spec > preset > pertanyaan)
   │
   ▼
validasi semuanya ── gagal di sini, belum ada yang ditulis
   │
   ▼
scaffold ── scaffolder asli untuk stack yang didukung, dokumen stub untuk sisanya
   │
   ▼
dokumen + aturan + preferensi proyek + AGENTS.md + .claude/
   │
   ▼
checklist skill dan MCP ── produk didaftarkan untuk dashboard
```

**Scaffold asli.** `web` (`nextjs`, `vite-react`, `tanstack-start`, plus `--kind landing`), `mobile` (`react-native`, Expo) dan `desktop` (`electron`) memakai scaffolder bawaan dari [raygent-scaffolds](https://github.com/arayhan/raygent-scaffolds). Kamu mendapat `package.json` asli, dependency yang sudah terpasang dan layout berbasis fitur. Set `RAYGENT_CCP_PATH` untuk menunjuk salinan lain dari `bin/create.mjs`-nya.

**Dokumen stub.** Kombinasi lain (termasuk `web` + `remix`) mendapat set stub `docs/` milik raygent.

**Dua nama.** Brand adalah yang dibaca pengunjung. Nama proyek adalah yang dibutuhkan npm dan filesystem. Init menanyakan brand lalu menurunkan nama proyek (`Acme Landing Page` menjadi `acme-landing-page`).

**Agent.** `AGENTS.md` ditulis untuk semua agent. Claude Code juga mendapat `CLAUDE.md` dan lapisan `.claude/`: subagent, skill, hook dan setting.

**Aturan coding.** `docs/rules/` berisi satu file per topik (`principles`, `code-style`, `testing`, `git-workflow`, `api-conventions`, `sql-and-data`, `ui-styling`, `security`, `accessibility`), disaring sesuai stack.

**Preferensi proyek.** `docs/rules/project-preferences.md` mencatat `--comments`, `--build-focus` dan `--viewport`. `ui-first` juga mengubah Phase 0: layar dibangun dengan data tiruan dulu lalu disetujui di gate review.

**Add-on stack.** Untuk `nextjs`, `vite-react` dan `tanstack-start`: CSS biasa atau Tailwind, Zustand, Axios, TanStack Query, Table dan Form, React Hook Form, Zod, nuqs, date-fns, design token, paket ikon, dan Storybook untuk stack berbasis Vite.

## Yang dihasilkan

| Artefak | Isi |
|---|---|
| `AGENTS.md` | cara bekerja di repo ini, dibaca semua agent |
| `docs/PRODUCT.md`, `docs/PRD.md` | terisi dari jawabanmu |
| `docs/architecture.md` | peta folder, aturan import, dan alasannya |
| `docs/rules/` | aturan coding untuk stack-mu |
| `docs/tasks/` | task step dan gate Phase 0 |
| `docs/STATE.md` | posisi pekerjaan, untuk `/start` dan `/wrap` |
| `docs/raygent-init.json` | run ini, bisa diulang dengan `--from` |
| `.claude/` | agent, skill, hook (khusus Claude Code) |

## Pemecahan masalah

- **"The target must be empty".** raygent tidak pernah menimpa file yang ada. Pakai folder baru.
- **Dokumen stub, bukan scaffold asli.** Stack itu belum didukung scaffolder, atau `raygent doctor` menunjukkan cek `scaffolder` gagal.
- **Salah ketik di spec.** Baca petunjuk "Did you mean"; belum ada yang dibuat, jadi cukup perbaiki dan jalankan lagi.
