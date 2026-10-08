import { useEffect, useRef, useState } from 'react';
import { ExamplePanel } from '../components/ExamplePanel';
import { Icon } from '../components/Icon';
import { FEATURES } from '../content/features';
import { DUR, EASE_OUT_EXPO, ScrollTrigger, gsap, prefersReducedMotion, useGSAP } from '../motion/gsap';
import { useReveal } from '../motion/useReveal';

export function Features() {
  const ref = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  useReveal(ref, { start: 'top 85%' });

  // The row crossing the middle of the viewport is the active one. State only
  // changes when the index does, never per scroll frame.
  useGSAP(
    () => {
      const rows = gsap.utils.toArray<HTMLElement>('[data-feature]', ref.current);
      rows.forEach((row, i) => {
        ScrollTrigger.create({
          trigger: row,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => {
            if (self.isActive && activeRef.current !== i) {
              activeRef.current = i;
              setActive(i);
            }
          },
        });
      });
    },
    { scope: ref }
  );

  // Panel swap: 200ms ease-in fade out, new example, 450ms fade in.
  useEffect(() => {
    const panel = panelRef.current;
    if (active === shown) return;
    if (!panel || prefersReducedMotion()) {
      setShown(active);
      return;
    }
    gsap.killTweensOf(panel);
    gsap.to(panel, {
      opacity: 0,
      duration: DUR.exit,
      ease: 'power1.in',
      onComplete: () => {
        setShown(active);
        gsap.to(panel, { opacity: 1, duration: DUR.enterS, ease: EASE_OUT_EXPO });
      },
    });
  }, [active, shown]);

  const current = FEATURES[shown];

  return (
    <section id="features" ref={ref} className="page-x section-y" aria-labelledby="features-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label eyebrow m-0">Features</p>
          <h2 id="features-title" className="display-l">
            Everything between the idea and the first commit
          </h2>
          <p className="prose-measure m-0 text-body-l text-signal-dim">
            Each one with what it actually produces: real files and real command output from runs of the CLI.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <ol className="m-0 grid list-none gap-2 p-0">
            {FEATURES.map((f, i) => (
              <li
                key={f.name}
                data-feature
                data-active={i === active}
                className="feature-row grid gap-4 border-l border-hairline-soft py-5 pl-5"
              >
                <div className="icon-row">
                  <Icon as={f.icon} className="feature-icon" />
                  <div className="grid gap-1.5">
                    <h3 className="title">{f.name}</h3>
                    <p className="m-0 text-signal-dim">{f.benefit}</p>
                  </div>
                </div>
                {/* Phones: the example sits under its row. Desktop: read by
                    screen readers here, shown in the sticky panel. */}
                <ExamplePanel title={f.example.title} lines={f.example.lines} className="lg:hidden" />
                <div className="sr-only-x hidden lg:block">
                  <ExamplePanel title={f.example.title} lines={f.example.lines} />
                </div>
              </li>
            ))}
          </ol>

          <div className="hidden lg:block" aria-hidden="true">
            <div className="sticky top-28">
              <ExamplePanel ref={panelRef} title={current.example.title} lines={current.example.lines} />
              <p className="label mt-4">
                {current.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
