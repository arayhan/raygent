# Wawancara dan review AI

Dalam mode guided, `raygent init` mewawancaraimu sebelum membuat apa pun, dan jawabanmu mengisi dokumen produk. Langkah AI opsional lalu mengkritik jawaban itu seperti partner startup.

Bayangkan formulir pendaftaran di klinik yang baik: pertanyaannya tetap, tapi jawabanmu masuk ke berkasmu, bukan ke laci.

## Mulai cepat

```bash
raygent init my-app --mode guided     # wawancara dulu
raygent brief > IDEA.md               # atau tulis jawabanmu di template
```

## Mode

| Mode | Yang terjadi |
|---|---|
| `quick` | hanya scaffold dan dokumen stub |
| `guided` | wawancara dulu; jawaban mengisi dokumen dan disimpan di `docs/interview.json` |

Setiap pertanyaan bisa dilewati dengan Enter. Pertanyaan yang dilewati tetap jadi `TODO(content)` yang terlihat di dokumen, tidak pernah diisi jawaban karangan.

## Produk atau klien

| `--type` | Pertanyaan |
|---|---|
| `product` | gaya aplikasi startup: masalah, visi, pasar, model bisnis, asumsi paling berisiko, metrik sukses dan lainnya |
| `client` | intake brief: kebutuhan, cakupan, deliverable, pengambil keputusan dan lainnya |

## Menulis alih-alih bicara: `raygent brief`

```bash
raygent brief > IDEA.md                 # brief produk
raygent brief --type client --out BRIEF.md
```

| Flag | Fungsi |
|---|---|
| `--type` | `product` (default) atau `client` |
| `--out <file>` | tulis ke file, bukan ke stdout |
| `-f, --force` | timpa file `--out` yang sudah ada |

Setiap heading membawa komentar tersembunyi berisi nama field wawancara, jadi `/raygent init` mengambil isi brief secara tepat, bukan menebak:

```markdown
## Who it is for
<!-- targetUsers -->
```

## Memakai dokumen yang sudah ada

Jalankan `/raygent init` di folder yang berisi dokumenmu. Ia membaca `PRD*`, `PRODUCT*`, `ROADMAP*`, `TASKS*`, `DECISIONS*`, `SPEC*`, `BRIEF*`, `NOTES*` (`.md`, `.txt`, `.pdf`) dan menunjukkan apa yang diambil dari mana:

```
Adopted 9 of 14 from your docs:
  problem             Brokers quote in spreadsheets…     PRD.md
  roadmap             3 phases                           ROADMAP.md
Not found: market, businessModel, successMetrics
```

Ia tidak bisa membaca `.docx`. Ekspor dulu ke PDF, Markdown atau teks biasa.

## Review AI opsional

```
jawaban ── endpoint AI ── docs/ai-review.md (kritik)
                     └─── elaborasi opsional untuk dokumen yang sudah terisi
```

Langkah AI hanya muncul kalau endpoint yang kompatibel dengan OpenAI sudah dikonfigurasi. Tanpa itu, tidak ada pertanyaan AI sama sekali.

```bash
raygent config set ai.baseUrl https://your-host/v1
raygent config set ai.apiKey sk-...
raygent config set ai.model your-model-id
```

Atau set `RAYGENT_AI_BASE_URL`, `RAYGENT_AI_API_KEY` dan `RAYGENT_AI_MODEL`. Ketiganya wajib.

Kegagalan AI tidak pernah membuat `init` gagal: proyek tetap lengkap. Skill `/raygent init` memberi kritik serupa lewat agent milikmu sendiri, tanpa API key.

## File

| Path | Isi |
|---|---|
| `docs/interview.json` | jawaban mentah, untuk `/bootstrap-project` dan tool lain |
| `docs/ai-review.md` | kritik AI, kalau diaktifkan |
| `~/.raygent/config.json` | setting endpoint `ai` |

## Pemecahan masalah

- **Pertanyaan AI tidak muncul.** Salah satu dari tiga nilai AI belum ada. Jalankan `raygent config show` dan `raygent doctor`.
- **Masih ada `TODO(content)`.** Itu disengaja. Jalankan `/bootstrap-project` di proyek untuk mengisinya.
