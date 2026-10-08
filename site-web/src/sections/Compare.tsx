import { useRef } from 'react';
import { Mark, type MarkValue } from '../components/Mark';
import { useReveal } from '../motion/useReveal';

const COLUMNS = [
  'Interview that pushes back',
  'Product docs (PRD, roadmap)',
  'Runnable stack scaffold',
  'Agent rules in the repo',
  'Phase and gate task plan',
  'Replayable setup spec',
];

// Mirrors the README comparison: public documentation as of October 2026.
const ROWS: { name: string; marks: MarkValue[]; self?: boolean }[] = [
  { name: 'raygent', marks: ['yes', 'yes', 'yes', 'yes', 'yes', 'yes'], self: true },
  { name: 'GitHub Spec Kit', marks: ['partly', 'yes', 'no', 'yes', 'partly', 'no'] },
  { name: 'BMAD Method', marks: ['yes', 'yes', 'no', 'yes', 'partly', 'no'] },
  { name: 'Agent OS', marks: ['partly', 'yes', 'no', 'yes', 'partly', 'no'] },
  { name: 'superpowers (skills)', marks: ['partly', 'partly', 'no', 'no', 'partly', 'no'] },
  { name: 'gstack (skills)', marks: ['yes', 'partly', 'no', 'no', 'partly', 'no'] },
  { name: 'create-next-app, create-t3-app', marks: ['no', 'no', 'yes', 'no', 'no', 'partly'] },
  { name: 'Claude Code /init', marks: ['no', 'no', 'no', 'partly', 'no', 'no'] },
  { name: 'Lovable, Bolt, v0', marks: ['partly', 'no', 'yes', 'no', 'no', 'no'] },
];

export function Compare() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section id="compare" ref={ref} className="page-x section-y" aria-labelledby="compare-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label m-0">How it compares</p>
          <h2 id="compare-title" className="display-l">
            Built for the moment before the repo exists
          </h2>
        </div>

        <div className="plate overflow-x-auto" data-reveal>
          <table className="w-full min-w-[860px] border-collapse text-left">
            <caption className="sr-only-x">
              Capabilities of raygent and similar tools: yes, partly or no for each column.
            </caption>
            <thead>
              <tr className="border-b border-hairline-soft">
                <th scope="col" className="label px-5 py-4 font-semibold">
                  Tool
                </th>
                {COLUMNS.map((c) => (
                  <th key={c} scope="col" className="label px-3 py-4 text-center font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr
                  key={row.name}
                  className={`border-b border-hairline-soft last:border-b-0 ${row.self ? 'bg-wash' : ''}`}
                >
                  <th
                    scope="row"
                    className={`px-5 py-3.5 text-[17px] font-semibold tracking-[-0.01em] ${
                      'text-signal-white'
                    }`}
                  >
                    {row.name}
                  </th>
                  {row.marks.map((m, i) => (
                    <td key={COLUMNS[i]} className="px-3 py-3.5 text-center">
                      <Mark value={m} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <div className="grid content-start gap-3" data-reveal>
            <h3 className="title">Where raygent fits</h3>
            <p className="m-0 text-signal-dim">
              Spec frameworks such as Spec Kit, BMAD and Agent OS give you planning discipline and leave you to bring the
              codebase. Scaffolders give you the codebase with no product context. Claude Code's /init documents a repo
              that already exists. raygent starts before the repo exists and hands you both halves at once.
            </p>
            <p className="m-0 text-signal-dim">
              Process skills such as superpowers and gstack work alongside it: they shape how work happens inside the
              repo, and raygent's init offers a skill checklist to install exactly those.
            </p>
          </div>
          <div className="grid content-start gap-3" data-reveal>
            <h3 className="title">What raygent does not do</h3>
            <p className="m-0 text-signal-dim">
              It does not deploy. It stops at a built, verified phase 1, and shipping is yours. For a throwaway prototype
              you want to click today, a hosted builder is faster.
            </p>
            <p className="m-0 text-small text-signal-mute">
              Compared against each project's public documentation as of October 2026. Corrections are welcome as GitHub
              issues.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
