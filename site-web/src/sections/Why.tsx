import { useRef } from 'react';
import { useReveal } from '../motion/useReveal';

export function Why() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section id="why" ref={ref} className="page-x section-y" aria-labelledby="why-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label m-0">Why raygent</p>
          <h2 id="why-title" className="display-l">
            The first session should start working, not guessing
          </h2>
        </div>

        <ul className="plate m-0 grid list-none p-0 md:grid-cols-2">
          <li className="grid gap-3 border-hairline-soft p-6 md:border-r md:p-8" data-reveal>
            <h3 className="title">Agents start every repo cold</h3>
            <p className="m-0 text-signal-dim">
              A fresh scaffold tells Claude Code, opencode or Antigravity nothing about the product, the boundaries or
              what to build first. raygent ships <code className="font-mono text-mono text-signal-white">AGENTS.md</code>,{' '}
              <code className="font-mono text-mono text-signal-white">docs/rules/</code> and a Phase 0 task plan with
              every project.
            </p>
          </li>
          <li className="grid gap-3 border-t border-hairline-soft p-6 md:border-t-0 md:p-8" data-reveal>
            <h3 className="title">Code without a plan, or a plan without code</h3>
            <p className="m-0 text-signal-dim">
              Scaffolders hand you a codebase with no product context. Spec tools hand you a plan and leave you to bring
              the code. raygent produces both from one conversation, and writes the plan into the repo the code lives
              in.
            </p>
          </li>
          <li className="grid gap-3 border-t border-hairline-soft p-6 md:border-r md:p-8" data-reveal>
            <h3 className="title">A form accepts every answer</h3>
            <p className="m-0 text-signal-dim">
              The <code className="font-mono text-mono text-signal-white">/raygent init</code> skill does not. It names
              the riskiest assumption, refuses "everyone" as a target user, and says so when the idea is a feature inside
              somebody else's product. Once, clearly, and then it builds what you asked for.
            </p>
          </li>
          <li className="grid gap-3 border-t border-hairline-soft p-6 md:p-8" data-reveal>
            <h3 className="title">Rules that fail the build</h3>
            <p className="m-0 text-signal-dim">
              ESLint <code className="font-mono text-mono text-signal-white">no-restricted-imports</code> zones fail the
              build on a crossed module boundary. <code className="font-mono text-mono text-signal-white">/verify</code>{' '}
              quotes lint, test and build output, and the code reviewer is read-only so it keeps reporting.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
