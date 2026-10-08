import type { ReactNode } from 'react';
import type { Dict } from './types';

const C = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-mono text-signal-white">{children}</code>
);

// Bahasa Indonesia santai, pakai "kamu", gaya copywriting: singkat, langsung ke
// manfaat, tapi tetap jujur (tiap klaim ada di CLI-nya). Istilah dev tetap
// bahasa Inggris (repo, scaffold, commit, CLI, spec, agent, skill, build,
// deploy). Perintah, output terminal dan isi file nggak diterjemahkan.
export const id: Dict = {
  meta: {
    title: 'raygent: dari ide jadi repo yang langsung jalan',
    description:
      'Ceritain idemu, raygent bantu tajamin rencananya, lalu bikinin repo yang langsung jalan dan siap dikerjain coding agent kamu.',
  },
  ui: {
    skip: 'Langsung ke konten',
    copy: 'Salin',
    copied: 'Tersalin',
    copyLabel: (command) => `Salin perintah: ${command}`,
    copyFallback: 'Nggak bisa nyalin otomatis. Perintahnya udah diblok, tinggal salin.',
    pauseRings: 'Jeda cincin',
    playRings: 'Putar cincin',
    language: 'Bahasa',
    backToTop: 'raygent, balik ke atas',
    navLabel: 'Bagian',
    footerLabel: 'Footer',
    marks: { yes: 'ya', partly: 'sebagian', no: 'nggak' },
  },
  nav: { flagship: 'Andalan', features: 'Fitur', compare: 'Bandingin', docs: 'Docs', examples: 'Contoh' },
  hero: {
    eyebrow: 'CLI dan agent skill open-source',
    line1: 'Ide di kepala,',
    line2: 'repo siap jalan',
    body: 'Ceritain idemu. raygent nanya balik, nunjuk bagian yang lemah, motong fase 1, dan milih stack lengkap sama alasannya. Hasilnya: project beneran, plus docs, aturan, dan task yang langsung dikerjain coding agent kamu.',
    cta: 'Coba sekarang',
    worksWith: 'Jalan di Claude Code, opencode, dan Antigravity. Butuh Node.js 20 ke atas.',
  },
  why: {
    eyebrow: 'Kenapa raygent',
    title: 'Agent kamu langsung kerja dari sesi pertama',
    items: [
      {
        title: 'Agent nggak lagi mulai dari nol',
        body: (
          <>
            Tiap project datang dengan <C>AGENTS.md</C>, <C>docs/rules/</C>, dan rencana task Phase 0. Claude Code,
            opencode, atau Antigravity langsung tahu produknya, batasannya, dan harus mulai dari mana.
          </>
        ),
      },
      {
        title: 'Rencana dan kode, dua-duanya',
        body: 'Scaffolder cuma kasih kode. Tool spec cuma kasih rencana. raygent kasih dua-duanya dari satu obrolan, dan rencananya tinggal di repo yang sama.',
      },
      {
        title: 'Berani bilang ide kamu lemah',
        body: (
          <>
            <C>/raygent init</C> nunjuk asumsi paling berisiko, nolak target "semua orang", dan jujur kalau idemu
            ternyata cuma fitur dari produk lain. Sekali bilang, habis itu tetap dibikinin.
          </>
        ),
      },
      {
        title: 'Aturan yang beneran ditegakkan',
        body: (
          <>
            Nyebrang batas modul? <C>no-restricted-imports</C> bikin build gagal. <C>/verify</C> nampilin hasil lint,
            test, dan build apa adanya, dan reviewer-nya read-only biar laporannya jujur.
          </>
        ),
      },
    ],
  },
  flagship: {
    eyebrow: 'Andalan',
    intro: 'Satu obrolan di coding agent kamu, dari ide sampai fase 1 yang udah dicek. Dibantah sekali, lalu dibikinin.',
    note: (
      <>
        Yang belum kejawab tetap jadi <code className="font-mono text-mono-s">TODO(content)</code>. Nggak ada tebakan
        yang diam-diam masuk docs.
      </>
    ),
    stages: {
      idea: {
        title: 'Mulai dari ide, atau docs yang udah ada',
        body: 'Satu kalimat juga cukup. Punya PRD, ROADMAP, atau PDF? Dipakai, lengkap sama sumbernya.',
      },
      interview: {
        title: 'Wawancara yang nggak asal iya',
        body: 'Nanya yang belum jelas, nunjuk asumsi paling berisiko, siapa user pertamamu, dan apakah ini cuma fitur produk lain.',
      },
      cut: {
        title: 'Fase 1, dipangkas',
        body: 'Yang nggak masuk fase 1 disebut jelas. Tiap pilihan stack ada alasannya, silakan didebat.',
      },
      spec: {
        title: 'Spec, kamu setujui',
        body: 'Kamu lihat semuanya sebelum satu file pun dibuat. Ganti pikiran masih gampang di sini.',
      },
      repo: {
        title: 'Repo, langsung jadi',
        body: 'Kode yang jalan, AGENTS.md, docs produk, docs/rules/, dan lapisan .claude/. Tanpa ditanya-tanya lagi.',
      },
      gaps: {
        title: 'Yang bolong, dilengkapi',
        body: 'Cuma nanya soal TODO(content) yang tersisa. Nggak ada yang dikarang.',
      },
      verify: {
        title: 'Di-build, dicek, di-review',
        body: 'Task step dan gate ngarahin build. /verify nampilin hasilnya, reviewer jawab APPROVE atau FIX-FIRST.',
      },
    },
  },
  features: {
    eyebrow: 'Fitur',
    title: 'Dari ide sampai commit pertama, beres',
    intro: 'Semua contoh di bawah hasil asli dari CLI-nya: file beneran, output beneran.',
    items: {
      init: { name: 'Init lewat ngobrol', benefit: 'Rencana kamu disetujui dulu, baru file dibuat.' },
      adopt: { name: 'Pakai docs yang udah ada', benefit: 'PRD lama langsung jadi jawaban, lengkap sama sumbernya.' },
      scaffolds: { name: 'Scaffold beneran', benefit: 'Dependency ke-install, git siap. Sekali pnpm dev, langsung jalan.' },
      addons: { name: 'Add-on stack', benefit: 'Library andalanmu langsung ke-setup, nggak nyisa jadi to-do list.' },
      agents: { name: 'Lapisan agent', benefit: 'Agent kamu udah kenal peran, aturan, dan task berikutnya.' },
      rules: { name: 'Aturan coding', benefit: 'Aturan per urusan, cuma yang relevan sama stack kamu.' },
      prefs: { name: 'Preferensi project', benefit: 'Gaya komentar, urutan kerja, dan layout ikut maumu.' },
      phase0: { name: 'Walking skeleton Phase 0', benefit: 'Hari pertama udah ada rencana. Keputusan penting tetap di tanganmu.' },
      specs: { name: 'Init spec dan preset', benefit: 'Setup yang sama, diulang tanpa satu pertanyaan pun. Typo ketahuan duluan.' },
      skills: { name: 'Pengelola skill', benefit: 'Cari skill dari fungsinya, pasang ke Claude, agents, dan Gemini sekaligus.' },
      mcp: { name: 'Setup MCP', benefit: 'Tool langsung nyambung. Secret tetap di shell, nggak pernah masuk file.' },
      ai: { name: 'Review AI opsional', benefit: 'Mau second opinion? Pasang model OpenAI-compatible apa aja.' },
      dashboard: { name: 'Dashboard', benefit: 'Event, signup, DAU, dan pemasukan semua produkmu, di laptop sendiri.' },
      doctor: { name: 'doctor', benefit: 'Tool yang kurang ketahuan sebelum init, bukan di tengah jalan.' },
    },
  },
  compare: {
    eyebrow: 'Bandingin',
    title: 'Hadir sebelum repo-nya ada',
    caption: 'Kemampuan raygent dan tool sejenis: ya, sebagian, atau nggak buat tiap kolom.',
    toolHeader: 'Tool',
    columns: [
      'Wawancara yang ngebantah',
      'Docs produk (PRD, roadmap)',
      'Scaffold stack yang jalan',
      'Aturan agent di repo',
      'Rencana task fase dan gate',
      'Spec setup yang bisa diulang',
    ],
    rowNames: { 'superpowers (skills)': 'superpowers (skill)', 'gstack (skills)': 'gstack (skill)' },
    fitTitle: 'Posisi raygent',
    fitBody: [
      'Spec Kit, BMAD, dan Agent OS kasih disiplin perencanaan, kodenya kamu bawa sendiri. Scaffolder kasih kode tanpa konteks produk. /init dari Claude Code cuma buat repo yang udah ada. raygent mulai lebih awal dan kasih dua-duanya.',
      'superpowers dan gstack? Tim yang cocok. Mereka ngatur cara kerja di dalam repo, dan raygent bisa langsung masangin skill-nya waktu init.',
    ],
    notTitle: 'Yang nggak dikerjain raygent',
    notBody:
      'Deploy tetap urusanmu. raygent berhenti di fase 1 yang udah jadi dan dicek. Cuma butuh prototipe buat diklik hari ini? Builder online lebih cepat.',
    footnote: 'Dibandingin sama dokumentasi publik tiap project per Oktober 2026. Ada yang kurang pas? Kabarin lewat GitHub issue.',
  },
  docs: {
    eyebrow: 'Cara pakai',
    title: 'Tiga perintah, langsung ngobrol',
    steps: [
      {
        title: 'Install CLI',
        note: (
          <>
            Cek dulu pakai <code className="font-mono text-mono-s text-signal-white">raygent doctor</code>: node, pnpm,
            git, scaffolder, dan skill aman semua.
          </>
        ),
      },
      {
        title: 'Install skill, sekali aja',
        note: 'Dipasang global, jadi bisa dipakai bahkan sebelum project-nya ada.',
      },
      {
        title: 'Mulai di folder kosong',
        note: 'Ketik di coding agent kamu, tambah satu kalimat soal idenya. Udah punya docs? Jalanin di foldernya.',
      },
    ],
    skip: (
      <>
        Males ngobrol? <C>raygent init --template</C> kasih spec siap isi, lalu <C>raygent init --from spec.json</C>{' '}
        langsung bikin project tanpa nanya apa-apa.
      </>
    ),
    navLabel: 'Dokumentasi',
    tutorial: 'Tutorial',
    reference: 'Daftar perintah',
  },
  examples: {
    eyebrow: 'Contoh',
    title: 'Satu kalimat, atau satu perintah',
    intro: (
      <>
        Ceritain idenya setelah <C>/raygent init</C>, flag-nya biar raygent yang pilih. Atau jalanin sendiri. Semua
        perintah di sini udah dites.
      </>
    ),
    tabsLabel: 'Jenis project',
    sayIt: 'Bilang ke agent kamu',
    footer: (
      <>
        Flag yang kosong bakal ditanyain, termasuk agent, aturan, add-on, skill, dan MCP, kecuali udah diisi preset atau
        spec. Selengkapnya di
      </>
    ),
    readmeLink: 'contoh di README',
    items: {
      landing: {
        tab: 'Landing page',
        ask: 'Halaman waitlist buat tool invoice khusus freelancer.',
        note: 'Next.js siap jualan: hero, fitur, CTA, form email, dan /api/subscribe. Tanpa ribet pilih framework.',
      },
      saas: {
        tab: 'Web app SaaS',
        ask: 'SaaS buat klinik kecil yang nyatat dan mantau follow-up pasien.',
        note: 'Turborepo isi apps/web, apps/api, dan packages/domain. UI-first: semua layar jadi dulu pakai data dummy, kamu review, baru ke backend.',
      },
      dashboard: {
        tab: 'Dashboard klien',
        ask: 'Portal ops internal buat klien logistik. API-nya udah ada.',
        note: 'Mode klien: yang ditanya kebutuhan, scope, deliverable, dan siapa yang ambil keputusan.',
      },
      api: {
        tab: 'Cuma API',
        ask: 'API pesanan buat toko online yang udah jalan.',
        note: 'Backend doang, add-on yang relevan aja. Aturan UI kayak accessibility.md nggak ikut.',
      },
      mobile: {
        tab: 'Aplikasi mobile',
        ask: 'Habit tracker dengan streak dan pengingat.',
        note: 'React Native + Expo, lengkap sama contoh modul fitur yang tinggal dihapus kalau udah paham polanya.',
      },
      desktop: {
        tab: 'Aplikasi desktop',
        ask: 'Aplikasi catatan offline buat peneliti lapangan.',
        note: 'Electron dengan main, preload, dan renderer terpisah, plus contoh modul fitur yang sama kayak versi mobile.',
      },
      cli: {
        tab: 'Tool CLI',
        ask: 'CLI yang nyusun release notes dari pull request yang udah di-merge.',
        note: 'Buat CLI, raygent kasih set docs-nya (PRD, arsitektur, progress), bukan scaffold siap jalan.',
      },
      spec: {
        tab: 'Tanpa nanya',
        ask: 'Landing page kelima bulan ini, langsung dari CI.',
        note: 'Nol pertanyaan. Field yang salah langsung gagal sebelum ada file yang ditulis.',
      },
    },
  },
  creator: {
    eyebrow: 'Pembuat',
    alt: 'Logo raygent: naga berbaju zirah warna biru baja di atas alas, dikelilingi cincin teknologi cyan yang menyala',
    bio: 'raygent lahir dari tool pribadi Ahmed buat mulai produk dan project klien. Satu obrolan dari ide sampai repo siap dikerjain agent, plus dashboard lokal buat mantau yang udah rilis.',
    mark: 'Naga penjaga ini logo raygent. Cincinnya yang lagi muter di bagian atas halaman.',
  },
  cta: {
    title: 'Idemu berikutnya, siap dibangun',
    supportTitle: 'Dukung raygent',
    supportBody: 'Gratis dan open-source (MIT). Kalau raygent ngehemat waktu setup kamu, traktir kopi lewat Saweria.',
    supportCta: 'Dukung lewat Saweria',
  },
  footer: { docs: 'Docs', license: 'Lisensi MIT', released: 'Dirilis dengan Lisensi MIT.' },
  annotations: {
    'docs/raygent-init.json, shown for approval': 'docs/raygent-init.json, ditunjukin buat disetujui',
    '/raygent init in a folder that holds your docs': '/raygent init di folder yang isinya docs kamu',
    'raygent init --template, the addons block': 'raygent init --template, bagian addons',
    'orders-api/docs/rules/ (NestJS, no frontend)': 'orders-api/docs/rules/ (NestJS, tanpa frontend)',
    'after it ships': 'setelah rilis',
    'read by Claude Code, opencode and Antigravity': 'dibaca Claude Code, opencode, dan Antigravity',
    'points Claude Code at AGENTS.md': 'ngarahin Claude Code ke AGENTS.md',
    'no accessibility.md or ui-styling.md: nothing here renders UI':
      'nggak ada accessibility.md atau ui-styling.md, soalnya di sini nggak ada UI',
    'every screen on mock data': 'semua layar pakai data dummy',
    'you approve the UI': 'kamu yang nyetujuin UI-nya',
    'live on a public URL': 'udah live di URL publik',
    'then the real backend': 'baru backend beneran',
    'without it, no AI prompt appears and init still completes':
      'kalau nggak dipasang, nggak ada prompt AI dan init tetap jalan sampai selesai',
    'products send events to /api/ingest': 'produk ngirim event ke /api/ingest',
    'data stays in ~/.raygent/': 'datanya tetap di ~/.raygent/',
  },
};
