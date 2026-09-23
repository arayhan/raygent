# raygent — upgrade handoff (scope: repo `raygent` doang)

Spec buat dikerjain di Claude Code. **Nggak ada satupun file di
`../raygent-scaffolds/` atau `vendor/` yang disentuh.**

Urutan: WO-1 → WO-2. WO-2 nulis ke file yang dibikin WO-1.
WO-3 dibaca dulu sebelum diputusin — sebagian besar isinya nggak bisa
dikerjain dalam scope ini, dan gw jelasin kenapa.

---

## Kunci yang bikin ini mungkin

raygent **udah** nulis ke folder proyek hasil generate, sesudah scaffolder
selesai. Lihat `src/cli.ts:973`:

```ts
const { filled, missed } = await applyInterviewToScaffoldDocs(targetDir, type, answers);
```

`applyInterviewToScaffoldDocs` (di `src/doc-fill.ts:166`) baca dan nulis file
di `targetDir`. Sekarang dia cuma *ngisi section yang udah ada*. Tapi nggak ada
yang ngelarang raygent **nulis file baru** di situ.

Artinya: `docs/STATE.md`, `.claude/commands/start.md`, `.claude/commands/wrap.md`,
dan work order phase 0 semuanya bisa diterbitkan dari raygent — nggak usah jadi
template handlebars sama sekali.

Malah buat phase 0 ini **lebih bener** di raygent: isinya tetap, nggak diturunin
dari jawaban interview, jadi nggak butuh templating. Naro dia di scaffolds cuma
nambah satu lapisan yang nggak ngasih apa-apa.

### Aturan scope — tempel di awal sesi

> Repo yang boleh diubah cuma `raygent`. Jangan sentuh `vendor/` (generated +
> gitignored, kehapus tiap build) dan jangan sentuh `../raygent-scaffolds/`
> (di luar scope, sengaja). Kalau lu ngerasa satu perubahan "harusnya" jadi
> template handlebars, berhenti dan lapor — jangan pindah repo sendiri.

Kalau agent lu nemu diri lagi nulis ke path yang mengandung `vendor/` atau
`raygent-scaffolds`, itu tanda dia salah baca scope.

---

## Keputusan yang lu ambil duluan: aset markdown ditaro di mana

`/start` dan `/wrap` isinya ~40 baris markdown masing-masing. Dua pilihan,
harus dipilih sebelum WO-1 mulai:

**A. Folder `assets/` (saran gw).** Niru pola `skills/` yang udah ada:

- bikin `assets/project/` isinya `STATE.md`, `commands/start.md`, `commands/wrap.md`,
  `tasks/0-step-01-scaffold.md`, dst.
- tambah `bundledAssetsDir()` di `src/paths.ts`, niru `bundledSkillsDir()`
- **tambah `"assets"` ke array `files` di `package.json`** — kalau lupa, semua
  jalan sempurna di repo dev dan mati di mesin lain sesudah `npm i -g raygent`.
  Ini persis bug yang `scripts/bundle-scaffolder.mjs` ada buat nyegah, jadi
  presedennya udah jelas.
- `test/skills-bundled.test.ts` udah ada dan ngetes hal serupa buat `skills/` —
  tiru dia jadi `test/assets-bundled.test.ts`.

**B. Template string di dalam TS.** Nggak ada risiko packaging, tapi markdown
40 baris di dalem file `.ts` bakal jadi yang paling males di-maintain di repo
ini, dan diff-nya jelek.

Ambil A. Risiko packaging-nya nyata tapi ketutup satu test, dan itu sekali
bayar.

---

## WO-1 · `docs/STATE.md` + `/start` + `/wrap`

**Kenapa:** `PROGRESS.md` append-only dan tumbuh tanpa batas — buat tau posisi
sekarang, agent harus baca semuanya. `docs/tasks/` itu banyak file. Nggak ada
satu tempat yang bisa dibaca sekali lirik buat jawab "gw di mana". Biayanya
mulai kelihatan di sesi ke-5 dan naik terus seiring umur proyek.

`.claude/commands/` sekarang cuma diisi `verify.md`.

### Batas STATE vs PROGRESS — tulis di kedua file

Dua file ini gampang banget jadi duplikat. Batasnya harus eksplisit di
**dua-duanya**, bukan cuma satu:

| File | Isi | Sifat | Ukuran |
|---|---|---|---|
| `docs/STATE.md` | di mana kita **sekarang** | ditimpa | ≤ 30 baris, hard cap |
| `docs/PROGRESS.md` | apa yang **udah kejadian** dan kenapa | append-only | bebas |

Tes pembeda: kalau satu baris masih bener 3 bulan lagi → PROGRESS. Kalau bakal
basi minggu depan → STATE. Kalau STATE lewat 30 baris, dia lagi berubah jadi
log kedua — potong.

### Yang dibikin

**`assets/project/STATE.md`**

```markdown
# State

<!-- Where we are RIGHT NOW. Overwritten, never appended.
     History and reasoning go to docs/PROGRESS.md — this file is not a log.
     Hard cap 30 lines. Past that, it has become a second log; cut it. -->

**Phase:** 0 — walking skeleton
**Next up:** 0-step-01-scaffold
**Blocked on:** nothing
**Last session:** —
**Verify:** unknown (run /verify)

## In flight
<!-- Max one. Empty is normal. -->
- none

## Parked
<!-- Ideas that arrived mid-work. Here, not in the code. -->
- none
```

Judulnya `# State` polos, tanpa nama proyek — `docTitle()` di
`src/init-lib.ts:214` udah nurunin judul dari nama file, dan aset ini juga
kepake di jalur stub. Nama proyek di judul cuma bikin dua sumber kebenaran.

**`assets/project/commands/start.md`** — orientasi doang, dilarang nulis kode:

1. Baca `docs/STATE.md` — **cuma ini**. Jangan `PROGRESS.md`: dia tumbuh terus,
   dan bacanya tiap sesi bikin biaya konteks naik seiring umur proyek. Butuh
   sejarah? 20 baris terakhir.
2. `git log --oneline -5` + `git status --short`. Working tree kotor → laporin,
   jangan dibersihin sendiri.
3. Jalanin check yang sama kayak `.claude/commands/verify.md`. **Jangan tulis
   ulang daftar perintahnya** — AGENTS.md yang di-generate udah bilang "a rule
   in two places is a rule with two versions". Rujuk file-nya.
   Merah → itu task pertama sesi ini, ngalahin STATE.md.
4. Baca work order yang disebut `Next up:` di `docs/tasks/`. Kalau file-nya
   nggak ada, bilang — jangan ditebak.
5. Berhenti, tunggu, output persis:

   ```
   Next: <task id> — <title>
   Done when: <acceptance criteria, dikutip dari work order>
   Touching: <file>
   NOT touching: <yang berdekatan tapi di luar scope>
   ```

**`assets/project/commands/wrap.md`** — nulis ke dua file, bedanya tegas:

1. `docs/STATE.md` — **timpa** blok header. Phase, Next up, Blocked on,
   Last session (tanggal + satu baris), Verify (hasil sebenernya, bukan asumsi).
2. `docs/PROGRESS.md` — **append satu baris** format
   `[date] [role] [what] [why]` sesuai yang udah dipakai file itu. Cuma kalau
   ada keputusan. Sesi tanpa keputusan nggak nambah baris — log isinya "hari
   ini ngoding" itu noise.
3. Ide yang muncul di tengah → `## Parked` di STATE.md.
4. Pelajaran yang bisa jadi aturan → `docs/LESSONS.md`.
5. Commit pakai `docs/rules/git-workflow.md`. **Jangan push.** Nggak ada
   attribution trailer apapun — itu aturan keras di AGENTS.md yang di-generate.
6. Print handoff 5 baris: Shipped / State / Next / Watch out for / Parked.

Dilarang: ngucapin selamat, ngerangkum rangkuman, ngejelasin ulang kode.

### Wiring — semua di `raygent/src/`

**`src/paths.ts`** — `bundledAssetsDir()`, niru `bundledSkillsDir()` persis.

**`src/project-emit.ts`** (baru):

```ts
export interface EmitOptions {
  targetDir: string;
  hasClaudeCode: boolean;
  force: boolean;
}
export interface EmitResult {
  written: string[];
  skipped: string[];   // udah ada, nggak ditimpa
  failed: string[];    // sama semantik kayak `missed` di FillResult
}
export async function emitProjectState(opts: EmitOptions): Promise<EmitResult>
```

Aturan:

- `docs/STATE.md` ditulis buat **semua** agent tool — dia markdown biasa,
  opencode dan Antigravity kepake juga.
- `.claude/commands/*.md` cuma kalau `hasClaudeCode`. Nulis `.claude/` buat
  proyek yang nggak pakai Claude Code itu ninggalin folder mati, dan komentar
  di `plan.mjs` udah nyatain posisi ini.
- Pakai flag `'wx'` kalau `!force`, sama kayak `initProject`
  (`src/init-lib.ts:271`). File yang udah ada masuk `skipped`, bukan error.
- **Jangan pernah throw karena file udah ada.** Emit ini jalan sesudah
  scaffolder; setengah gagal harus dilaporin, bukan ngebatalin init yang
  sisanya udah sukses.

**`src/cli.ts`** — panggil sesudah `applyInterviewToScaffoldDocs` (~baris 973),
dan juga di cabang `applyInterviewToStubDocs` (~baris 981). Dua-duanya, kalau
nggak jalur stub nggak dapet STATE.md. Laporin `failed` pakai gaya yang sama
kayak peringatan `missed` yang udah ada di baris 977.

**`src/doc-fill.ts`** — sisipin baris STATE.md ke tabel Docs di `AGENTS.md`,
sebelum baris PROGRESS.md:

```
| [docs/STATE.md](docs/STATE.md) | Where the project is right now — phase, next task, blockers. Read first, every session |
```

⚠️ Ini nyentuh file yang dibikin template di repo sebelah. Kalau template
AGENTS.md berubah, insert-nya meleset. **Harus meleset dengan berisik**: kalau
baris PROGRESS.md nggak ketemu, masukin ke `failed` dan cetak peringatan —
jangan diem-diem skip, jangan crash. Presedennya udah ada di `cli.ts:977`
("update client-project-scaffold if sections are missed").

**`src/init-lib.ts`** — tambah `'STATE.md'` ke `DOC_SETS.product` dan
`DOC_SETS.client`, **di posisi pertama**. Urutan array itu urutan baca.

### Acceptance criteria

```bash
cd ~/raygent && npm test            # test baru + yang lama, ijo semua

# STATE.md ada di dua jalur
cd $(mktemp -d) && raygent init --from ~/specs/test-web.json
test -f docs/STATE.md
test -f .claude/commands/start.md && test -f .claude/commands/wrap.md
test $(wc -l < docs/STATE.md) -le 30
rg -q "docs/STATE\.md" AGENTS.md

# non-Claude: dapet STATE.md, nggak dapet .claude/
cd $(mktemp -d) && raygent init --from ~/specs/test-opencode.json
test -f docs/STATE.md && test ! -d .claude

# idempotent: jalan lagi nggak nimpa, nggak crash
cd $(mktemp -d) && raygent init --from ~/specs/test-web.json
echo "SENTINEL" >> docs/STATE.md
raygent init --from ~/specs/test-web.json --here 2>&1 | rg -q "STATE.md"
rg -q "SENTINEL" docs/STATE.md      # isi lu selamat

# packaging: aset kebawa ke tarball
cd ~/raygent && npm pack --dry-run 2>&1 | rg -q "assets/project/STATE.md"

# scope: nggak ada yang bocor keluar
git -C ~/raygent status --short vendor | wc -l          # 0
git -C ~/raygent-scaffolds status --short | wc -l       # 0
```

Test baru: `test/project-emit.test.ts` (niru `test/init-lib.test.ts`) dan
`test/assets-bundled.test.ts` (niru `test/skills-bundled.test.ts`).

**Depends:** — · **Blocks:** WO-2 · **handoff:** software-engineer

---

## WO-2 · Phase 0 — walking skeleton + deploy awal

**Kenapa:** sekarang phase 1 langsung bikin fitur. Yang bikin phase 1 bisa
diverifikasi — test yang jalan, DB yang nyambung, URL production yang idup —
nggak ada yang mastiin ada duluan. Deploy pas repo kosong itu 10 menit; deploy
pas udah 3000 baris itu seharian ngurusin env var.

**Nggak nabrak posisi lu soal deploy.** README bilang "deploying is yours,
raygent has no ship command" — tetep bener sesudah WO ini. Deploy-nya jadi
**gate**, bukan step: raygent nulis pertanyaannya dan nge-block phase 1,
manusia yang ngerjain. Persis pembagian di `docs/tasks/README.md` yang lu tulis.

### Isinya tetap — ini yang bikin dia cocok di raygent

Empat item ini sama buat semua proyek dan **nggak diturunin dari interview**.
Justru itu alasan dia nggak perlu jadi template.

| ID | Isi | Kind | Done when |
|---|---|---|---|
| `0-step-01-scaffold` | app jalan lokal | step | `pnpm dev` nyajiin halaman; lint + typecheck bersih |
| `0-step-02-verify-loop` | verification loop nyata | step | `pnpm test` ada ≥1 test lolos yang nge-assert sesuatu beneran; `/verify` ijo |
| `0-step-03-data-round-trip` | stack nyambung end to end | step | satu record ditulis lewat form, kebaca lagi abis refresh. UI jelek nggak apa-apa |
| `0-gate-deploy` | live di URL publik | **gate** | `0-step-03` jalan di URL production, bukan lokal |

`0-step-03` **di-skip kalau proyeknya nggak punya data layer** — CLI, landing
page. Step yang acceptance-nya nggak bisa dijalanin itu prosa yang nyamar jadi
check, dan `docs/tasks/README.md` lu sendiri ngelarang itu.

Cara nentuin punya data layer atau nggak, dalam scope raygent-only: turunin
dari `platform` + `target` yang udah ada di `InitOptions` — `platform === 'cli'`
atau `kind === 'landing'` → nggak ada. Kalau WO-3 jadi dikerjain, ganti jadi
`stack.database !== 'none'`. **Tulis ini sebagai satu fungsi kecil dengan nama
jelas** (`projectHasDataLayer(opts)`), jangan kondisi inline yang nyebar —
nanti WO-3 tinggal ganti isi satu fungsi.

### Yang dibikin

- `assets/project/tasks/0-step-01-scaffold.md`
- `assets/project/tasks/0-step-02-verify-loop.md`
- `assets/project/tasks/0-step-03-data-round-trip.md`
- `assets/project/tasks/0-gate-deploy.md`

Format nurut `docs/tasks/README.md`: step punya goal, deliverables, acceptance
criteria berupa perintah, `**Depends**:` / `**Blocks**:`, dan baris `handoff:`.
Gate punya siapa yang mutusin, apa yang di-unblock, daftar pertanyaan, blok
tanda tangan — **tanpa** acceptance criteria dan **tanpa** `handoff:`.

### Wiring

- `src/project-emit.ts` — emit 4 file itu ke `docs/tasks/`. `mkdir` recursive
  dulu: **jalur stub nggak punya `docs/tasks/`** sama sekali (yang bikin folder
  itu `tasks-README.md` di scaffolder). Kalau nggak di-mkdir, jalur stub gagal.
- `src/doc-fill.ts` — sisipin baris Phase 0 di tabel **Phases** di AGENTS.md:
  `| 0 | Walking skeleton + deploy | Build first |`. Aturan meleset-dengan-berisik
  sama kayak WO-1.
- `assets/project/STATE.md` udah default `Phase: 0` / `Next up: 0-step-01-scaffold`
  dari WO-1 — pastiin cocok, jangan bikin dua sumber.

### Acceptance criteria

```bash
cd ~/raygent && npm test

# proyek web dengan data layer: 4 file
cd $(mktemp -d) && raygent init --from ~/specs/test-web.json
ls docs/tasks/0-* | wc -l | rg -q '^4$'
rg -q "0-gate-deploy" docs/tasks/0-gate-deploy.md
rg -q "^\| 0 \|" AGENTS.md
rg -q "^\*\*Phase:\*\* 0" docs/STATE.md
# gate nggak boleh punya handoff
rg -q "handoff:" docs/tasks/0-gate-deploy.md && echo "GAGAL: gate punya handoff" && exit 1

# landing page: nggak dapet round-trip
cd $(mktemp -d) && raygent init --from ~/specs/test-landing.json
test -f docs/tasks/0-step-03-data-round-trip.md && echo "GAGAL: round-trip di landing" && exit 1
ls docs/tasks/0-* | wc -l | rg -q '^3$'

# jalur stub juga dapet (ini yang paling gampang kelewat)
cd $(mktemp -d) && raygent init stubtest --platform cli --framework node
test -d stubtest/docs/tasks
```

**Depends:** WO-1 · **Blocks:** — · **handoff:** engineering-lead

---

## WO-3 · Data layer — baca dulu, jangan langsung kerjain

**Kabar buruknya:** dengan scope raygent-only, ini **sebagian besar nggak bisa
dikerjain**, dan gw lebih milih bilang sekarang daripada lu nemu di tengah jalan.

`grep -rniE "supabase|sqlite|prisma|drizzle" src vendor/scaffolder/templates`
→ nol hasil. Nggak ada data layer sama sekali. Tapi yang dibutuhin buat
nutupnya itu **file kode yang di-generate** — `src/server/db.ts`,
`package.fragment.json`, `db/migrations/`, section `.env.example`. Semua itu
addon dan template, dan semuanya tinggal di `raygent-scaffolds`.

Yang **bisa** dikerjain di raygent doang:

| Bisa | Nggak bisa |
|---|---|
| `DATABASE_CHOICES` di `init-lib.ts` (niru `FORM_CHOICES`) | addon `db-supabase/`, `db-sqlite/` |
| `stack.database` di `InitSpec` + validasinya | client Supabase / SQLite yang di-generate |
| flag `--database <db>` di `cli.ts` | var Supabase di `.env.example` |
| tolak `mobile` + `sqlite` waktu validasi | `db/migrations/` + migration awal |
| pertanyaan interview soal DB | isi `rules/sql-and-data.md` per pilihan |
| isi `docs/DATABASE.md` — **udah ada di `DOC_SETS.product`** | |
| `projectHasDataLayer()` dari WO-2 baca `stack.database` | |

Hasilnya: **keputusan DB kecatat, tervalidasi, dan terdokumentasi — tapi
kodenya tetep lu tulis manual.** Itu masih ada nilainya (dokumentasi konsisten,
kombinasi mustahil ketolak di depan), tapi bukan yang lu bayangin waktu bilang
"pakai Supabase, fallback SQLite".

Sebelum mutusin, tiga hal yang tetep berlaku:

**1. Jangan bikin interface yang bisa swap Supabase↔SQLite.** RLS (aturan akses
per baris yang dijalanin database), Auth, Realtime, Storage, PostgREST, `jsonb`,
`uuid` — nggak ada padanannya di SQLite. Abstraksi yang pura-pura setara ngunci
lu ke irisan terkecil: bayar ongkos abstraksi **dan** kehilangan alasan milih
Supabase. Rugi dua arah. Pilih satu per proyek waktu init.

Kalau kena limit project Supabase: pause project lama, atau gabung beberapa
produk kecil di satu project dengan skema terpisah. SQLite itu buat proyek yang
emang lokal-dulu dari awal, bukan pelarian.

**2. `node:sqlite`, bukan `better-sqlite3`.** Node lu 24; `node:sqlite` built-in
sejak 22 — nol dependency, nol native build. `better-sqlite3` butuh kompilasi
native yang di Windows sering minta build tools. Konsekuensinya proyek hasil
generate harus naik ke `"node": ">=22"`, kalau nggak gagalnya di mesin orang
lain tanpa nyebut sebabnya.

**3. `mobile` + `sqlite` harus ditolak waktu validasi**, bukan discaffold.
`node:sqlite` nggak ada di React Native — yang bener `expo-sqlite`. Formatnya
niru error di `init-lib.ts:240`:

```
invalid database 'sqlite' for platform 'mobile'
(node:sqlite is not available in React Native — use expo-sqlite, not yet supported)
```

Yang bagus: **poin 3 ini 100% bisa dikerjain di raygent**, dan justru dia yang
paling nyelametin — scaffold yang keliatan bener tapi mati di runtime itu lebih
mahal daripada error waktu init.

**Saran gw:** tahan WO-3. Kerjain WO-1 dan WO-2 dulu sampai kepake di satu
proyek nyata. Waktu lu akhirnya buka `raygent-scaffolds`, kerjain data layer
utuh sekali jalan — separuh sekarang separuh nanti cuma bikin `stack.database`
yang divalidasi rapi tapi nggak ngaruh ke apapun, dan itu jenis setengah-fitur
yang paling gampang kelupaan udah setengah.

**Depends:** — · **Blocks:** — · **handoff:** gate, lu yang mutusin

---

## Prompt pembuka buat Claude Code

```
Baca handoff ini, terutama bagian "Aturan scope".

Kerjain WO-1 doang. Jangan lanjut WO-2 sebelum acceptance criteria WO-1
lolos semua dan gw bilang lanjut. WO-3 jangan disentuh.

Sebelum nulis file pertama, konfirmasi ke gw:
- pilihan aset: folder assets/ atau template string di TS, plus alasannya
- path persis tiap file yang bakal dibikin atau diubah
- konfirmasi nggak ada satupun di bawah vendor/ atau ../raygent-scaffolds/
```

Kalau `~/specs/test-*.json` belum ada, bikin dulu: `raygent init --template >
test-web.json` terus isi. Bakal kepake berkali-kali — tanpa itu, acceptance
criteria di atas nggak bisa dijalanin apa adanya.
