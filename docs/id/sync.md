# Sync

`raygent sync` membuatmu bisa pindah laptop dan tetap menemukan memori agent yang sama, sesi Claude Code yang bisa dilanjutkan, dan kebijakan akun yang sama, walaupun proyekmu ada di path berbeda di tiap laptop.

Bayangkan loker bersama dengan label per proyek. Setiap laptop tahu di mana salinan proyeknya sendiri, dan loker hanya peduli pada labelnya.

## Mulai cepat

```bash
raygent sync              # tarik, gabung, kirim semuanya
raygent sync status       # apa yang di-sync dari laptop ini, dan hasil run terakhir
raygent sync install-task # jalankan otomatis tiap 15 menit di latar belakang
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `raygent sync` | jalankan semua fase: git in, akun, git out, sesi |
| `raygent sync --dry-run` | tunjukkan apa yang akan terjadi tanpa mengubah apa pun |
| `raygent sync --quiet` | hanya cetak masalah, selalu exit 0 (untuk hook dan task) |
| `raygent sync --no-git` / `--no-accounts` / `--no-sessions` | lewati satu fase |
| `raygent sync status` | repo dan remote-nya, proyek yang terpetakan, host sesi dan ukurannya, folder yang tertinggal, run terakhir |
| `raygent sync install-task` | Windows: job Task Scheduler tersembunyi tiap 15 menit. Di tempat lain: mencetak baris crontab |

## Apa yang dibawa, dan lewat mana

| Apa | Ke mana |
|---|---|
| memori dan instruksi agent | repo git privat, si "brain" (`~/raygent-brain`, atau `RAYGENT_BRAIN_DIR`) |
| kebijakan akun | `accounts.json` di brain, per slug proyek; config dir tetap per laptop |
| sesi Claude Code | rsync ke server milikmu, satu folder per slug proyek |

Login tidak pernah ikut pindah. Jalankan `raygent accounts discover` di tiap laptop. Lihat [Akun](accounts.md).

## Cara satu run bekerja

```
1. git in     commit perubahan lokal, pull --rebase
2. akun       gabungkan ~/.raygent/accounts.json dengan salinan di brain
3. git out    commit, push
4. sesi       tarik transkrip baru dari server, kirim yang berubah
```

Setiap fase melapor sendiri. Kalau satu gagal, yang lain tetap jalan.

**Slug.** Brain memetakan setiap proyek ke slug per laptop di `hosts/<COMPUTERNAME>.json`:

```json
{ "my-app": "D:\\work\\my-app", "notes": "C:\\Users\\me\\notes" }
```

Laptop lain boleh menyimpan `my-app` di path berbeda. Sesi disimpan per slug di server dan ditarik ke folder untuk path laptop ini, jadi `claude --resume` bisa menemukannya.

**Config sesi.** `sync.json` di brain:

```json
{ "sessions": { "host": "user@your-vps", "key": "~/.ssh/your_key", "dir": "raygent-sync/sessions", "keepDays": 30 } }
```

- Hanya sesi dari `keepDays` terakhir yang ditarik turun.
- Tidak ada yang pernah dihapus di sisi mana pun.
- Transfer yang macet menyerah setelah 60 detik dan dicoba lagi di run berikutnya.
- Di Windows, rsync jalan dari WSL (`wsl -e rsync`) dengan OpenSSH Windows sebagai transport. Set `"rsync": "native"` untuk memakai rsync di PATH.

**Konflik.**

- Konflik di file akun yang di-sync selesai dengan sendirinya.
- File memori yang diubah di dua laptop menghentikan langkah git sampai kamu memperbaikinya manual. Langkah lain tetap jalan.
- Sesi yang dilanjutkan di dua laptop di antara dua sync: file yang lebih baru menang utuh.

## Laptop baru

1. Pasang raygent dan jalankan `raygent doctor`.
2. Clone repo brain ke `~/raygent-brain` dan salin SSH key yang disebut di `sync.json` ke path yang sama.
3. Tambahkan `hosts/<COMPUTERNAME>.json` untuk laptop ini berisi path proyek-proyekmu.
4. Login akun agent, lalu jalankan `raygent accounts discover` dan `raygent accounts install-hooks`.
5. Jalankan `raygent sync` sekali secara manual (tarikan pertama bisa besar), lalu `raygent sync install-task`.

Untuk sync juga di setiap awal dan akhir sesi, tambahkan `raygent sync --quiet` sebagai hook `SessionStart` dan `SessionEnd` dengan timeout sekitar 120 detik.

## File

| Path | Isi |
|---|---|
| `~/raygent-brain/` | repo brain: memori, instruksi, `accounts.json`, `hosts/`, `sync.json` |
| `~/.raygent/sync-state.json` | run terakhir, hasil per fase, penanda push |
| `~/.raygent/sync.lock` | mencegah dua run bersamaan; kedaluwarsa setelah 10 menit |
| `~/.claude/projects/<key>/` | transkrip Claude Code lokal yang di-sync |

## Pemecahan masalah

- **`status` menampilkan folder yang belum terpetakan.** Proyek itu punya sesi tapi belum punya slug. Tambahkan ke `hosts/<COMPUTERNAME>.json`.
- **"Connection reset" saat push.** Jaringan terputus. Run berikutnya mencoba folder itu lagi.
- **Langkah git melaporkan konflik.** Selesaikan file memori yang disebut di repo brain, commit, lalu jalankan `raygent sync` lagi.
- **Run dari hook terasa lambat.** Banyak sesi aktif berarti banyak push. Task 15 menit menyelesaikan sisa yang ditinggalkan hook.
