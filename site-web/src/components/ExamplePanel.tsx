import { forwardRef } from 'react';
import { useT } from '../i18n/LanguageProvider';

/** A file or command and what it actually contains or prints. */
export const ExamplePanel = forwardRef<HTMLDivElement, { title: string; lines: string[]; className?: string }>(
  function ExamplePanel({ title, lines, className = '' }, ref) {
    const { annotations } = useT();
    // Only our notes are translated: a title, or the text after `# `.
    // Everything else is real output and stays verbatim.
    const shown = lines.map((line) => {
      const at = line.indexOf('# ');
      if (at === -1) return line;
      const note = line.slice(at + 2);
      return annotations[note] ? line.slice(0, at + 2) + annotations[note] : line;
    });
    return (
      <div ref={ref} className={`term ${className}`}>
        <div className="border-b border-hairline-soft px-4 py-2.5">
          <span className="font-mono text-mono-s text-signal-mute">{annotations[title] ?? title}</span>
        </div>
        <pre className="m-0 overflow-x-auto p-4 font-mono text-mono-s text-signal-dim md:p-5">{shown.join('\n')}</pre>
      </div>
    );
  }
);
