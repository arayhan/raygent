import type { ReactNode } from 'react';
import type { Dict } from './types';

const C = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-mono text-signal-white">{children}</code>
);

// Bahasa Indonesia formal ("Anda"). Istilah developer yang lazim dipakai apa
// adanya (repo, scaffold, commit, CLI, spec, agent). Perintah, output terminal
// dan isi file tidak diterjemahkan: semuanya output asli CLI.
export const id: Dict = {
  meta: {
    title: 'raygent: dari ide ke repo yang siap dijalankan',
    description:
      'raygent mewawancarai Anda, menyanggah rencana Anda, memotong fase 1, memilih stack, lalu membuat repo yang siap dijalankan dan sudah dipahami oleh coding agent Anda.',
  },
  ui: {
    skip: 'Langsung ke konten',
    copy: 'Salin',
    copied: 'Tersalin',
    copyLabel: (command) => `Salin perintah: ${command}`,
    copyFallback: 'Penyalinan tidak tersedia. Perintah sudah dipilih.',
    pauseRings: 'Jeda cincin',
    playRings: 'Putar cincin',
    language: 'Bahasa',
    backToTop: 'raygent, kembali ke atas',
    navLabel: 'Bagian',
    footerLabel: 'Kaki halaman',
    marks: { yes: 'ya', partly: 'sebagian', no: 'tidak' },
  },
  nav: { flagship: 'Unggulan', features: 'Fitur', compare: 'Perbandingan', docs: 'Dokumentasi', examples: 'Contoh' },
  hero: {
    eyebrow: 'CLI dan agent skill open-source',
    line1: 'Dari ide mentah',
    line2: 'ke repo yang siap dijalankan',
    body: 'raygent mewawancarai Anda, menyanggah bagian rencana yang lemah, memotong fase 1, memilih stack beserta alasannya. Lalu raygent membuat proyek sungguhan lengkap dengan dokumen, aturan, dan rencana tugas yang langsung dipakai coding agent Anda sejak sesi pertama.',
    cta: 'Mulai sekarang',
    worksWith: 'Mendukung Claude Code, opencode, dan Antigravity. Node.js 20 atau lebih baru.',
  },
  why: {
    eyebrow: 'Mengapa raygent',
    title: 'Sesi pertama seharusnya langsung bekerja, bukan menebak',
    items: [
      {
        title: 'Agent memulai setiap repo dari nol',
        body: (
          <>
            Scaffold baru tidak memberi tahu Claude Code, opencode, atau Antigravity apa pun tentang produk, batasan, atau
            apa yang harus dibangun lebih dulu. raygent menyertakan <C>AGENTS.md</C>, <C>docs/rules/</C>, dan rencana
            tugas Phase 0 di setiap proyek.
          </>
        ),
      },
      {
        title: 'Kode tanpa rencana, atau rencana tanpa kode',
        body: 'Scaffolder memberi Anda codebase tanpa konteks produk. Tool spesifikasi memberi Anda rencana dan membiarkan Anda membawa kodenya sendiri. raygent menghasilkan keduanya dari satu percakapan, dan menuliskan rencananya ke dalam repo tempat kode itu berada.',
      },
      {
        title: 'Formulir menerima semua jawaban',
        body: (
          <>
            Skill <C>/raygent init</C> tidak. Skill ini menyebut asumsi paling berisiko, menolak "semua orang" sebagai
            target pengguna, dan menyampaikannya bila ide Anda ternyata hanya fitur di dalam produk orang lain. Sekali,
            dengan jelas, lalu ia membangun sesuai permintaan Anda.
          </>
        ),
      },
      {
        title: 'Aturan yang menggagalkan build',
        body: (
          <>
            Zona ESLint <C>no-restricted-imports</C> menggagalkan build saat batas modul dilanggar. <C>/verify</C>{' '}
            mengutip output lint, test, dan build, dan code reviewer bersifat read-only agar tetap melaporkan.
          </>
        ),
      },
    ],
  },
  flagship: {
    eyebrow: 'Unggulan',
    intro:
      'Satu percakapan di coding agent Anda, dari ide sampai fase 1 yang terverifikasi. raygent menyanggah sekali, dengan jelas, lalu membangun sesuai permintaan Anda.',
    note: (
      <>
        Pertanyaan yang belum terjawab tetap terlihat sebagai{' '}
        <code className="font-mono text-mono-s">TODO(content)</code>, bukan tebakan masuk akal yang tidak akan pernah
        dipertanyakan.
      </>
    ),
    stages: {
      idea: {
        title: 'Ide Anda, atau dokumen yang sudah Anda miliki',
        body: 'Satu kalimat, brief tertulis, atau file PRD, ROADMAP, dan PDF yang sudah ada. Setiap jawaban yang diambil menunjukkan file asalnya.',
      },
      interview: {
        title: 'Wawancara yang menyanggah',
        body: 'raygent menanyakan apa yang belum diketahuinya, lalu menyebut asumsi paling berisiko, pengguna nyata pertama, dan apakah ini sebenarnya fitur di dalam produk orang lain.',
      },
      cut: {
        title: 'Fase 1, dipotong',
        body: 'Hal yang bukan tujuan diucapkan dengan jelas. Stack dipilih dengan satu alasan per pilihan, sehingga Anda bisa membantahnya.',
      },
      spec: {
        title: 'Spec, disetujui',
        body: 'Ditampilkan kepada Anda sebelum apa pun dibuat. Inilah saat terakhir yang murah untuk berubah pikiran.',
      },
      repo: {
        title: 'Repo, dibuat',
        body: 'Kode yang siap dijalankan, AGENTS.md, dokumen produk, docs/rules/, dan lapisan .claude/, tanpa satu pun pertanyaan.',
      },
      gaps: {
        title: 'Celah, diisi',
        body: 'Mewawancarai Anda hanya untuk penanda TODO(content) yang tersisa dari percakapan. Tidak ada yang dikarang untuk mengisinya.',
      },
      verify: {
        title: 'Dibangun, diverifikasi, ditinjau',
        body: 'Tugas step dan gate mengarahkan build. /verify mengutip output lint, test, dan build, dan reviewer menjawab APPROVE atau FIX-FIRST.',
      },
    },
  },
  features: {
    eyebrow: 'Fitur',
    title: 'Semua yang ada di antara ide dan commit pertama',
    intro: 'Masing-masing dengan hasil nyatanya: file sungguhan dan output perintah asli dari menjalankan CLI.',
    items: {
      init: { name: 'Init lewat percakapan', benefit: 'Anda menyetujui rencana yang sudah Anda perdebatkan sebelum satu file pun dibuat.' },
      adopt: { name: 'Mengadopsi dokumen yang ada', benefit: 'PRD yang sudah Anda tulis menjadi jawaban wawancara, masing-masing dengan sumbernya.' },
      scaffolds: { name: 'Scaffold sungguhan', benefit: 'Dependensi terpasang dan git terinisialisasi: langsung jalan saat pnpm dev pertama.' },
      addons: { name: 'Add-on stack', benefit: 'Library yang selalu Anda tambahkan datang sudah terkonfigurasi, bukan sebagai daftar tugas.' },
      agents: { name: 'Lapisan agent', benefit: 'Coding agent Anda mengenal peran, aturan, dan tugas berikutnya sejak sesi pertama.' },
      rules: { name: 'Aturan coding', benefit: 'Satu file aturan per topik, dan hanya yang relevan untuk stack Anda.' },
      prefs: { name: 'Preferensi proyek', benefit: 'Agent menulis komentar, membangun, dan menata layout sesuai pilihan Anda, bukan bawaannya.' },
      phase0: { name: 'Walking skeleton Phase 0', benefit: 'Hari pertama sudah punya rencana berurutan, dan gate-nya adalah keputusan yang Anda tanda tangani.' },
      specs: { name: 'Init spec dan preset', benefit: 'Ulangi seluruh setup tanpa pertanyaan, dan salah ketik gagal sebelum apa pun ditulis.' },
      skills: { name: 'Pengelola skill', benefit: 'Temukan skill berdasarkan kegunaannya, lalu pasang untuk Claude, agents, dan Gemini sekaligus.' },
      mcp: { name: 'Setup MCP', benefit: 'Tool terhubung di .mcp.json, dan secret tetap di shell Anda, tidak pernah ditulis ke file.' },
      ai: { name: 'Review AI opsional', benefit: 'Pendapat kedua atas rencana Anda dari model apa pun yang kompatibel dengan OpenAI, hanya jika Anda mengonfigurasinya.' },
      dashboard: { name: 'Dashboard', benefit: 'Event, pendaftaran, DAU, dan pendapatan setiap produk yang Anda rilis, di mesin Anda sendiri.' },
      doctor: { name: 'doctor', benefit: 'Tool yang belum terpasang ketahuan sebelum init, bukan di tengah jalan.' },
    },
  },
  compare: {
    eyebrow: 'Perbandingan',
    title: 'Dibuat untuk saat sebelum repo ada',
    caption: 'Kemampuan raygent dan tool serupa: ya, sebagian, atau tidak untuk setiap kolom.',
    toolHeader: 'Tool',
    columns: [
      'Wawancara yang menyanggah',
      'Dokumen produk (PRD, roadmap)',
      'Scaffold stack yang siap jalan',
      'Aturan agent di dalam repo',
      'Rencana tugas fase dan gate',
      'Spec setup yang bisa diulang',
    ],
    rowNames: { 'superpowers (skills)': 'superpowers (skill)', 'gstack (skills)': 'gstack (skill)' },
    fitTitle: 'Posisi raygent',
    fitBody: [
      'Framework spesifikasi seperti Spec Kit, BMAD, dan Agent OS memberi Anda disiplin perencanaan dan membiarkan Anda membawa codebase sendiri. Scaffolder memberi Anda codebase tanpa konteks produk. /init milik Claude Code mendokumentasikan repo yang sudah ada. raygent dimulai sebelum repo ada dan memberikan keduanya sekaligus.',
      'Process skill seperti superpowers dan gstack bekerja berdampingan dengannya: keduanya membentuk cara kerja di dalam repo, dan init raygent menawarkan daftar skill untuk memasang tepat skill tersebut.',
    ],
    notTitle: 'Yang tidak dilakukan raygent',
    notBody:
      'raygent tidak melakukan deploy. raygent berhenti pada fase 1 yang sudah dibangun dan diverifikasi, dan perilisan menjadi bagian Anda. Untuk prototipe sekali pakai yang ingin Anda klik hari ini, builder berbasis web lebih cepat.',
    footnote:
      'Dibandingkan dengan dokumentasi publik setiap proyek per Oktober 2026. Koreksi dipersilakan melalui GitHub issue.',
  },
  docs: {
    eyebrow: 'Cara menggunakan',
    title: 'Tiga perintah menuju percakapan pertama Anda',
    steps: [
      {
        title: 'Pasang CLI',
        note: (
          <>
            Lalu <code className="font-mono text-mono-s text-signal-white">raygent doctor</code> memeriksa node, pnpm,
            git, scaffolder, dan skill sebelum apa pun dijalankan.
          </>
        ),
      },
      {
        title: 'Pasang skill, sekali per mesin',
        note: 'Sengaja global: Anda memakainya sebelum proyek ada, jadi salinan per proyek tidak akan terjangkau.',
      },
      {
        title: 'Mulai di folder kosong',
        note: 'Ketik di coding agent Anda bersama satu kalimat tentang idenya. Sudah punya dokumen? Jalankan di folder yang berisi dokumen tersebut.',
      },
    ],
    skip: (
      <>
        Ingin melewati percakapan? <C>raygent init --template</C> mencetak spec berkomentar, dan{' '}
        <C>raygent init --from spec.json</C> membuat proyek darinya tanpa pertanyaan.
      </>
    ),
    navLabel: 'Dokumentasi',
    tutorial: 'Tutorial',
    reference: 'Referensi perintah',
  },
  examples: {
    eyebrow: 'Contoh',
    title: 'Satu kalimat ke agent Anda, atau satu perintah',
    intro: (
      <>
        Sebutkan idenya setelah <C>/raygent init</C> dan raygent memilihkan flag untuk Anda, atau jalankan sendiri
        perintahnya. Setiap perintah di sini sudah dijalankan sebelum ditampilkan.
      </>
    ),
    tabsLabel: 'Jenis proyek',
    sayIt: 'Sampaikan ke agent Anda',
    footer: (
      <>
        Flag yang tidak Anda isi akan ditanyakan. Agent, aturan, add-on, serta daftar skill dan MCP juga berupa
        pertanyaan, kecuali dijawab oleh preset atau spec. Selengkapnya di
      </>
    ),
    readmeLink: 'contoh README',
    items: {
      landing: {
        tab: 'Landing page',
        ask: 'Halaman waitlist untuk tool invoice bagi freelancer.',
        note: 'Next.js dengan starter pemasaran: hero, fitur, CTA, pengambilan email, dan /api/subscribe. Tanpa pertanyaan framework: landing page hanya punya satu bentuk.',
      },
      saas: {
        tab: 'Aplikasi web SaaS',
        ask: 'SaaS untuk klinik kecil yang mencatat dan memantau tindak lanjut pasien.',
        note: 'Turborepo dengan apps/web, apps/api, dan packages/domain. UI-first membangun setiap layar dengan data tiruan dan berhenti di gate review sebelum pekerjaan backend apa pun.',
      },
      dashboard: {
        tab: 'Dashboard klien',
        ask: 'Portal operasional internal untuk klien logistik. API mereka sudah ada.',
        note: 'Mode klien mengganti wawancara produk dengan pengambilan brief: kebutuhan, cakupan, hasil kerja, dan pengambil keputusan.',
      },
      api: {
        tab: 'Hanya API',
        ask: 'API pesanan untuk toko online yang sudah ada.',
        note: 'Backend murni hanya mendapat add-on yang tidak terikat framework dan tanpa aturan UI seperti accessibility.md.',
      },
      mobile: {
        tab: 'Aplikasi mobile',
        ask: 'Pelacak kebiasaan dengan streak dan pengingat.',
        note: 'React Native berbasis Expo dengan contoh modul fitur yang bisa dihapus, untuk menunjukkan layout berbasis fitur.',
      },
      desktop: {
        tab: 'Aplikasi desktop',
        ask: 'Aplikasi catatan offline untuk peneliti lapangan.',
        note: 'Electron dengan pemisahan main, preload, dan renderer, plus contoh modul fitur yang sama seperti versi mobile.',
      },
      cli: {
        tab: 'Tool CLI',
        ask: 'CLI yang menyusun catatan rilis dari pull request yang sudah di-merge.',
        note: 'Platform CLI mendapat set dokumen milik raygent sendiri (PRD, arsitektur, progres), bukan scaffold yang siap jalan.',
      },
      spec: {
        tab: 'Tanpa pertanyaan',
        ask: 'Landing page kelima bulan ini, dari CI.',
        note: 'Tidak menanyakan apa pun, dan field yang salah gagal sebelum ada yang ditulis. raygent init --template mencetak spec berkomentar sebagai titik awal.',
      },
    },
  },
  creator: {
    eyebrow: 'Pembuat',
    alt: 'Tanda raygent: naga berbaju zirah berwarna biru baja di atas alas, di dalam cincin teknologi cyan yang bercahaya',
    bio: 'raygent berawal dari tool pribadi Ahmed untuk memulai produk dan proyek klien: satu percakapan dari ide sampai repo yang bisa dikerjakan coding agent, lalu dashboard lokal untuk memantau apa yang dirilis.',
    mark: 'Naga penjaga adalah tanda proyek ini. Cincin teknologinya adalah cincin yang berputar di bagian atas halaman.',
  },
  cta: {
    title: 'Ide berikutnya, diperdebatkan lalu dibangun',
    supportTitle: 'Dukung raygent',
    supportBody:
      'raygent gratis dan berlisensi MIT. Jika raygent menghemat satu minggu setup Anda, Anda bisa mendukung pengembangannya di Saweria.',
    supportCta: 'Dukung di Saweria',
  },
  footer: { docs: 'Dokumentasi', license: 'Lisensi MIT', released: 'Dirilis di bawah Lisensi MIT.' },
  annotations: {
    'docs/raygent-init.json, shown for approval': 'docs/raygent-init.json, ditampilkan untuk disetujui',
    '/raygent init in a folder that holds your docs': '/raygent init di folder yang berisi dokumen Anda',
    'raygent init --template, the addons block': 'raygent init --template, blok addons',
    'orders-api/docs/rules/ (NestJS, no frontend)': 'orders-api/docs/rules/ (NestJS, tanpa frontend)',
    'after it ships': 'setelah dirilis',
    'read by Claude Code, opencode and Antigravity': 'dibaca oleh Claude Code, opencode, dan Antigravity',
    'points Claude Code at AGENTS.md': 'mengarahkan Claude Code ke AGENTS.md',
    'no accessibility.md or ui-styling.md: nothing here renders UI':
      'tanpa accessibility.md atau ui-styling.md: tidak ada UI di sini',
    'every screen on mock data': 'semua layar dengan data tiruan',
    'you approve the UI': 'Anda menyetujui UI',
    'live on a public URL': 'tayang di URL publik',
    'then the real backend': 'lalu backend sungguhan',
    'without it, no AI prompt appears and init still completes':
      'tanpanya, tidak ada prompt AI dan init tetap selesai',
    'products send events to /api/ingest': 'produk mengirim event ke /api/ingest',
    'data stays in ~/.raygent/': 'data tetap di ~/.raygent/',
  },
};
