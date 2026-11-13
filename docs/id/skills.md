# Skills

`raygent skill` memasang, menampilkan dan menghapus skill agent. Skill adalah folder berisi `SKILL.md` yang mengajari coding agent satu pekerjaan. raygent membawa satu skill sendiri, `/raygent init`.

Bayangkan pengatur sabuk perkakas: ia tahu semua alat yang kamu punya, di kantong mana masing-masing, dan menaruh alat baru di tempat yang bisa dijangkau semua agent.

## Mulai cepat

```bash
raygent skill install           # semua skill bawaan raygent -> ~/.claude/skills
raygent skill list --installed  # yang terpasang, dikelompokkan per fungsi
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `raygent skill list` | Tampilkan semua skill, dikelompokkan per fungsi, beserta lokasi pemasangannya |
| `raygent skill list --category <c>` | Satu kelompok: `product`, `design`, `motion`, `code`, `writing`, `research`, `agent`, `other` |
| `raygent skill list --source <s>` | Satu sumber: `personal`, `project`, `global`, `bundled` |
| `raygent skill list --installed` | Hanya skill yang terpasang di suatu tempat |
| `raygent skill install` | Pasang semua skill bawaan raygent ke `~/.claude/skills` |
| `raygent skill install <name>` | Pasang satu skill dari sumber mana pun |
| `raygent skill install <name> --local` | Pasang ke `./.claude/skills`, hanya untuk proyek ini |
| `raygent skill install <name> -f` | Timpa pemasangan yang sudah ada |
| `raygent skill remove <name>` | Hapus dari `~/.claude/skills` (`--local`: dari proyek ini) |

## Skill raygent: `/raygent init`

```bash
raygent skill install     # -> ~/.claude/skills/raygent/
```

Lalu, di agent kamu, ketik `/raygent init`.

Skill ini **sengaja dipasang global**. Kamu memakainya sebelum proyek ada, sering di folder kosong, jadi salinan lokal per proyek justru tidak terjangkau tepat saat dibutuhkan.

Yang dilakukan skill ini dan tidak bisa dilakukan formulir biasa:

1. Menindaklanjuti jawaban yang tipis.
2. Membantah rencana: asumsi paling berisiko, apakah target user benar-benar "semua orang", apakah ini sebenarnya fitur di produk orang lain.
3. Memotong cakupan jadi beberapa phase dan menyebut non-goal secara terang.
4. Memilih stack dan memberi satu alasan per pilihan.
5. Menulis init spec, menunjukkannya untuk disetujui, lalu menjalankan `raygent init --from` dengan spec itu.

`/raygent bootstrap` diarahkan ke skill `/bootstrap-project` milik proyek yang dihasilkan, jadi proyek lama diselesaikan dengan alur yang ikut saat ia dibuat.

## Urutan sumber

```
~/.raygent/skills/<name>   skill milikmu: selalu menang
        │
        ▼
bawaan raygent             mengalahkan salinan di folder agent bersama
        │
        ▼
./.agent, ~/.agents, ~/.gemini, ~/.claude
```

Skill milikmu selalu menang, jadi salinan bawaan tidak pernah menutupi skill yang kamu tulis. Salinan bawaan mengalahkan pemasangan lama di folder agent bersama, jadi `skill install -f` selalu bisa memperbaruinya.

## Cara kategori dipilih

1. Tabel kurasi untuk skill yang dikenal raygent.
2. Aturan prefiks untuk satu keluarga (`firecrawl-*`, `remotion-*`).
3. Kata kunci di nama dan deskripsi.
4. Sisanya masuk `other`. Tebakan yang salah akan menyembunyikan skill di kelompok yang tidak pernah dibuka.

Deskripsi di `list` diringkas, bukan dipotong: pembuka seperti "Use when the user wants to…" dibuang dan kalimat utuh dipertahankan, jadi satu baris tidak pernah berhenti di tengah pikiran.

## File

| Path | Peran |
|---|---|
| `~/.raygent/skills/<name>/` | skill milikmu (sumber) |
| `~/.claude/skills/<name>/` | target pemasangan default |
| `./.claude/skills/<name>/` | target pemasangan `--local` |

## Pemecahan masalah

- **Skill muncul sebagai `other`.** Tidak ada aturan yang cocok. Skill tetap jalan; hanya kelompoknya yang umum.
- **Versi lama terus termuat.** Jalankan `raygent skill install <name> -f`.
- **`/raygent init` tidak ditemukan di folder baru.** Kamu memasangnya dengan `--local` di tempat lain. Pasang secara global.
