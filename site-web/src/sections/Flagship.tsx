import { useRef } from 'react';
import { ScrollTrigger, gsap, prefersReducedMotion, useGSAP } from '../motion/gsap';
import { Icon } from '../components/Icon';
import { BadgeCheck, FileCheck2, FolderGit2, Lightbulb, MessagesSquare, PenLine, Scissors, type LucideIcon } from 'lucide-react';

const STAGES: { icon: LucideIcon; title: string; code?: string; body: string }[] = [
  {
    icon: Lightbulb,
    title: 'Your idea, or the docs you already have',
    body: 'A sentence, a written brief, or existing PRD, ROADMAP and PDF files. Each adopted answer shows the file it came from.',
  },
  {
    icon: MessagesSquare,
    title: 'An interview that pushes back',
    body: 'It asks what it does not know yet, then names the riskiest assumption, the first real user, and whether this is a feature inside somebody else\'s product.',
  },
  {
    icon: Scissors,
    title: 'Phase 1, cut',
    body: 'The non-goals get said out loud. The stack is picked with one reason per choice, so you can argue with it.',
  },
  {
    icon: FileCheck2,
    title: 'The spec, approved',
    code: 'raygent-init.json',
    body: 'Shown to you before anything exists. This is the last cheap moment to change your mind.',
  },
  {
    icon: FolderGit2,
    title: 'The repo, generated',
    code: 'raygent init --from raygent-init.json',
    body: 'Runnable code, AGENTS.md, product docs, docs/rules/ and the .claude/ layer, with zero prompts.',
  },
  {
    icon: PenLine,
    title: 'The gaps, filled',
    code: '/bootstrap-project',
    body: 'Interviews you for exactly the TODO(content) markers the conversation left. Nothing is invented to fill them.',
  },
  {
    icon: BadgeCheck,
    title: 'Built, verified, reviewed',
    code: '/verify',
    body: 'Step and gate tasks drive the build. /verify quotes lint, test and build output, and the reviewer answers APPROVE or FIX-FIRST.',
  },
];

export function Flagship() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const track = root.querySelector<HTMLElement>('[data-track]');
      const fill = root.querySelector<HTMLElement>('[data-fill]');
      const stages = gsap.utils.toArray<HTMLElement>('[data-stage]', root);
      if (!track || !fill) return;

      const setLive = () => {
        const lit = stages.filter((s) => s.dataset.lit === 'true');
        stages.forEach((s) => (s.dataset.live = String(s === lit[lit.length - 1])));
      };

      if (prefersReducedMotion()) {
        gsap.set(fill, { scaleY: 1 });
        stages.forEach((s) => (s.dataset.lit = 'true'));
        setLive();
        return;
      }

      // Scroll-synced, so linear: the line follows the scrollbar 1:1.
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: track, start: 'top 60%', end: 'bottom 60%', scrub: true },
        }
      );
      stages.forEach((stage) => {
        ScrollTrigger.create({
          trigger: stage,
          start: 'top 60%',
          onLeaveBack: () => {
            stage.dataset.lit = 'false';
            setLive();
          },
          onEnter: () => {
            stage.dataset.lit = 'true';
            setLive();
          },
        });
      });
    },
    { scope: ref }
  );

  return (
    <section id="flagship" ref={ref} className="page-x section-y" aria-labelledby="flagship-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="grid content-start gap-5 lg:sticky lg:top-28">
          <p className="label eyebrow m-0">Flagship</p>
          <h2 id="flagship-title" className="display-l">
            <code className="font-mono font-medium tracking-[-0.03em]">/raygent init</code>
          </h2>
          <p className="prose-measure m-0 text-body-l text-signal-dim">
            One conversation in your coding agent, from idea to a verified phase 1. raygent argues once, clearly, and
            then builds what you asked for.
          </p>
          <p className="prose-measure m-0 text-small text-signal-mute">
            An unanswered question stays a visible <code className="font-mono text-mono-s">TODO(content)</code> instead of
            a plausible guess nobody will question later.
          </p>
        </div>

        <ol data-track className="relative m-0 grid list-none gap-12 p-0 pl-10">
          <span aria-hidden="true" className="absolute top-2 bottom-2 left-[11px] w-px bg-hairline" />
          <span
            aria-hidden="true"
            data-fill
            className="absolute top-2 bottom-2 left-[11px] w-px origin-top bg-blue"
          />
          {STAGES.map((stage) => (
            <li key={stage.title} data-stage data-lit="false" data-live="false" className="flow-stage relative grid gap-2">
              <span aria-hidden="true" className="flow-node absolute top-[6px] -left-10 h-[23px] w-[23px] rounded-full" />
              <h3 className="title icon-row">
                <Icon as={stage.icon} className="flow-icon" />
                {stage.title}
              </h3>
              {stage.code && <code className="font-mono text-mono text-signal-white">{stage.code}</code>}
              <p className="prose-measure m-0 text-signal-dim">{stage.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
