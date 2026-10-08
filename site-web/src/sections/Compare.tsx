import { useRef } from 'react';
import { Mark, type MarkValue } from '../components/Mark';
import { useReveal } from '../motion/useReveal';
import { Icon } from '../components/Icon';
import { Ban, Compass } from 'lucide-react';
import { useT } from '../i18n/LanguageProvider';

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
  const t = useT();
  useReveal(ref);

  return (
    <section id="compare" ref={ref} className="page-x section-y" aria-labelledby="compare-title">
      <div className="mx-auto grid max-w-(--container-page) gap-12">
        <div className="grid gap-4" data-reveal>
          <p className="label eyebrow m-0">{t.compare.eyebrow}</p>
          <h2 id="compare-title" className="display-l">
            {t.compare.title}
          </h2>
        </div>

        <div className="plate overflow-x-auto" data-reveal>
          <table className="w-full min-w-[860px] border-collapse text-left">
            <caption className="sr-only-x">{t.compare.caption}</caption>
            <thead>
              <tr className="border-b border-hairline-soft">
                <th scope="col" className="label px-5 py-4 font-semibold">
                  {t.compare.toolHeader}
                </th>
                {t.compare.columns.map((c) => (
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
                      row.self ? 'text-blue' : 'text-signal-white'
                    }`}
                  >
                    {t.compare.rowNames[row.name] ?? row.name}
                  </th>
                  {row.marks.map((m, i) => (
                    <td key={i} className="px-3 py-3.5 text-center">
                      <Mark value={m} accent={row.self} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <div className="grid content-start gap-3" data-reveal>
            <h3 className="title icon-row">
              <Icon as={Compass} className="text-blue" />
              {t.compare.fitTitle}
            </h3>
            <p className="m-0 text-signal-dim">{t.compare.fitBody[0]}</p>
            <p className="m-0 text-signal-dim">{t.compare.fitBody[1]}</p>
          </div>
          <div className="grid content-start gap-3" data-reveal>
            <h3 className="title icon-row">
              <Icon as={Ban} className="text-blue" />
              {t.compare.notTitle}
            </h3>
            <p className="m-0 text-signal-dim">{t.compare.notBody}</p>
            <p className="m-0 text-small text-signal-mute">{t.compare.footnote}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
