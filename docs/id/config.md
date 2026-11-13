# Config dan preset

`raygent config` membaca dan menulis `~/.raygent/config.json`. Isinya endpoint AI dan preset: jawaban init tersimpan yang kamu pakai ulang lewat nama.

Bayangkan preset sebagai pesanan langganan di kedai kopi. Kamu bilang "yang biasa" dan semua detailnya ikut, tapi kamu tetap bisa minta satu perubahan.

## Mulai cepat

```bash
raygent config show
raygent config set presets.saas.platform web
raygent init my-app --preset saas
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `raygent config show` | cetak seluruh config, API key disamarkan |
| `raygent config get <key>` | baca nilai lewat dot path, misalnya `ai.model` |
| `raygent config set <key> <value>` | set nilai lewat dot path; nilai JSON di-parse |

## Preset

```bash
raygent config set presets.saas.platform web
raygent config set presets.saas.framework nextjs
raygent config set presets.saas.type product
raygent config set presets.saas.mode guided
raygent config set presets.saas.target fullstack
raygent config set presets.saas.backend express
raygent config set presets.saas.monorepo true
raygent config set presets.saas.skills '["impeccable", "ui-ux-pro-max"]'
raygent config set presets.saas.stack '{"styling":"tailwind","forms":"react-hook-form"}'
raygent config set presets.saas.preferences '{"comments":"minimal","buildFocus":"ui-first","viewport":"mobile-first"}'

raygent init my-app --preset saas      # flag tetap mengalahkan nilai preset
```

- Preset dengan `skills` langsung memasangnya dan melewati checklist skill.
- Preset dengan `stack` melewati pertanyaan tech stack dan memakai nilai itu apa adanya.
- Init spec juga bisa menyebut `"preset"`. Lihat [Init](init.md).

**Urutan prioritas:** flag eksplisit > spec > preset > pertanyaan > default.

## Endpoint AI

| Key | Override lewat env |
|---|---|
| `ai.baseUrl` | `RAYGENT_AI_BASE_URL` |
| `ai.apiKey` | `RAYGENT_AI_API_KEY` |
| `ai.model` | `RAYGENT_AI_MODEL` |

Ketiganya dibutuhkan untuk langkah AI. Lihat [Wawancara dan review AI](interview.md).

## File

| Path | Isi |
|---|---|
| `~/.raygent/config.json` | `ai` dan `presets` |

## Pemecahan masalah

- **Nilai JSON tersimpan sebagai string.** Bungkus seluruh nilai dengan tanda kutip tunggal supaya shell tidak merusak JSON-nya.
- **Nilai preset diabaikan.** Flag di command line mengalahkan preset. Cek perintahnya.
