import { useRef } from 'react';
import { useT } from '../i18n/LanguageProvider';
import type { StageId } from '../i18n/types';
import { ScrollTrigger, gsap, prefersReducedMotion, useGSAP } from '../motion/gsap';
import { Icon } from '../components/Icon';
import { BadgeCheck, FileCheck2, FolderGit2, Lightbulb, MessagesSquare, PenLine, Scissors, type LucideIcon } from 'lucide-react';

// Copy lives in i18n; the commands are identical in every language.
const STAGES: { id: StageId; icon: LucideIcon; code?: string }[] = [
  { id: 'idea', icon: Lightbulb },
  { id: 'interview', icon: MessagesSquare },
  { id: 'cut', icon: Scissors },
  { id: 'spec', icon: FileCheck2, code: 'raygent-init.json' },
  { id: 'repo', icon: FolderGit2, code: 'raygent init --from raygent-init.json' },
  { id: 'gaps', icon: PenLine, code: '/bootstrap-project' },
  { id: 'verify', icon: BadgeCheck, code: '/verify' },
];

export function Flagship() {
  const ref = useRef<HTMLElement>(null);
  const t = useT();

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
          <p className="label eyebrow m-0">{t.flagship.eyebrow}</p>
          <h2 id="flagship-title" className="display-l">
            <code className="font-mono font-medium tracking-[-0.03em]">/raygent init</code>
          </h2>
          <p className="prose-measure m-0 text-body-l text-signal-dim">{t.flagship.intro}</p>
          <p className="prose-measure m-0 text-small text-signal-mute">{t.flagship.note}</p>
        </div>

        <ol data-track className="relative m-0 grid list-none gap-12 p-0 pl-10">
          <span aria-hidden="true" className="absolute top-2 bottom-2 left-[11px] w-px bg-hairline" />
          <span
            aria-hidden="true"
            data-fill
            className="absolute top-2 bottom-2 left-[11px] w-px origin-top bg-blue"
          />
          {STAGES.map((stage) => (
            <li key={stage.id} data-stage data-lit="false" data-live="false" className="flow-stage relative grid gap-2">
              <span aria-hidden="true" className="flow-node absolute top-[6px] -left-10 h-[23px] w-[23px] rounded-full" />
              <h3 className="title icon-row">
                <Icon as={stage.icon} className="flow-icon" />
                {t.flagship.stages[stage.id].title}
              </h3>
              {stage.code && <code className="font-mono text-mono text-signal-white">{stage.code}</code>}
              <p className="prose-measure m-0 text-signal-dim">{t.flagship.stages[stage.id].body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
