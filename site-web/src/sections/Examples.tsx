import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { TypedTerminal } from '../components/TypedTerminal';
import { EXAMPLES } from '../content/examples';
import { LINKS } from '../content/links';
import { DUR, EASE_OUT_EXPO, gsap, prefersReducedMotion } from '../motion/gsap';
import { useReveal } from '../motion/useReveal';

export function Examples() {
  const ref = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  useReveal(ref);

  // Typing starts the first time the terminal is actually on screen.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(panel);
    return () => io.disconnect();
  }, []);

  const select = (index: number, focus = false) => {
    const next = (index + EXAMPLES.length) % EXAMPLES.length;
    setActive(next);
    if (focus) tabRefs.current[next]?.focus();
    if (!prefersReducedMotion() && panelRef.current) {
      gsap.fromTo(panelRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: DUR.enterS, ease: EASE_OUT_EXPO });
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight') select(active + 1, true);
    else if (e.key === 'ArrowLeft') select(active - 1, true);
    else if (e.key === 'Home') select(0, true);
    else if (e.key === 'End') select(EXAMPLES.length - 1, true);
    else return;
    e.preventDefault();
  };

  const ex = EXAMPLES[active];

  return (
    <section id="examples" ref={ref} className="page-x section-y" aria-labelledby="examples-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label m-0">Examples</p>
          <h2 id="examples-title" className="display-l">
            One sentence to your agent, or one command
          </h2>
          <p className="prose-measure m-0 text-body-l text-signal-dim">
            Say the idea after <code className="font-mono text-mono text-signal-white">/raygent init</code> and it picks
            the flags for you, or run the line yourself. Every command here was run before it was printed.
          </p>
        </div>

        <div className="grid gap-6" data-reveal>
          <div role="tablist" aria-label="Project kinds" className="flex gap-5 overflow-x-auto border-b border-hairline-soft">
            {EXAMPLES.map((e, i) => (
              <button
                key={e.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${e.id}`}
                aria-selected={i === active}
                aria-controls="example-panel"
                tabIndex={i === active ? 0 : -1}
                className="tab"
                onClick={() => select(i)}
                onKeyDown={onKeyDown}
              >
                {e.tab}
              </button>
            ))}
          </div>

          <div
            ref={panelRef}
            id="example-panel"
            role="tabpanel"
            aria-labelledby={`tab-${ex.id}`}
            className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-10"
          >
            <div className="grid content-start gap-5">
              <div className="grid gap-2">
                <p className="label m-0">Say it to your agent</p>
                <p className="m-0 text-body-l text-signal-white">
                  <code className="font-mono text-mono text-cyan">/raygent init</code> {ex.ask}
                </p>
              </div>
              <p className="m-0 text-signal-dim">{ex.note}</p>
            </div>
            <TypedTerminal key={ex.id} dir={ex.dir} command={ex.command} output={ex.output} play={inView} />
          </div>
        </div>

        <p className="m-0 text-small text-signal-mute" data-reveal>
          Flags you leave out are asked. Agents, rules, add-ons and the skill and MCP checklists are prompts too, unless
          a preset or a spec answers them. More in the{' '}
          <a href={LINKS.examples} className="link-sweep text-signal-white" target="_blank" rel="noreferrer">
            README examples
          </a>
          .
        </p>
      </div>
    </section>
  );
}
