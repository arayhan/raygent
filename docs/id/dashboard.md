# Dashboard

`raygent dashboard` menyajikan halaman pemantauan lokal untuk setiap produk yang kamu rilis: event, signup, pengguna aktif harian dan pendapatan. `raygent product` menyimpan daftar produk, dan `raygent finance` mencatat pemasukan.

Bayangkan buku kas di meja toko: satu halaman menunjukkan siapa yang datang dan apa yang terjual, untuk semua toko yang kamu kelola.

## Mulai cepat

```bash
raygent dashboard                           # http://localhost:4321
raygent finance add my-app 49 "first sale"
raygent finance summary
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `raygent dashboard` | sajikan dashboard di port 4321 |
| `raygent dashboard --port <port>` | pakai port lain |
| `raygent product add <name>` | daftarkan produk yang sudah ada (`--platform`, `--framework`, `--type product\|client`) |
| `raygent product list` | tampilkan produk terdaftar |
| `raygent finance add <product> <amount> [note...]` | catat pemasukan; jumlahnya angka biasa |
| `raygent finance summary` | total pendapatan per produk dan per bulan |

Produk yang dibuat dengan `raygent init` terdaftar otomatis. Pakai `product add` untuk yang lebih lama.

## Cara event masuk

```
produkmu ── POST /api/ingest ── ~/.raygent/analytics/events.jsonl
                                       │
                    raygent dashboard ─┘── GET /api/summary ── halaman
```

Kirim body JSON dengan string `event`:

```bash
curl -X POST http://localhost:4321/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"product":"my-app","event":"email_signup","props":{"userId":"u1"}}'
```

- `product` opsional. Tanpa itu, nama host pengirim yang dipakai.
- Event `email_signup` dihitung sebagai signup.
- `userId` atau `sessionId` di `props` membuat hitungan pengguna aktif harian bekerja.

`track()` di template landing page mengirim event begitu `NEXT_PUBLIC_ANALYTICS_URL` menunjuk ke URL ingest. `NEXT_PUBLIC_PRODUCT_ID` mengganti nama produk.

## File

| Path | Isi |
|---|---|
| `~/.raygent/products.json` | daftar produk |
| `~/.raygent/finance.jsonl` | satu entri pemasukan per baris |
| `~/.raygent/analytics/events.jsonl` | satu event per baris |

## Pemecahan masalah

- **`400 expected JSON body with an "event" string`.** Body bukan JSON, atau tidak punya field `event`.
- **Event dari situs live tidak pernah masuk.** Dashboard jalan di mesinmu. Situs yang sudah di-deploy tidak bisa menjangkau `localhost`; ini hanya untuk run lokal.
- **DAU kosong.** Event-mu tidak membawa `userId` atau `sessionId` di `props`.
