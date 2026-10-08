import { forwardRef } from 'react';

/** A file or command and what it actually contains or prints. */
export const ExamplePanel = forwardRef<HTMLDivElement, { title: string; lines: string[]; className?: string }>(
  function ExamplePanel({ title, lines, className = '' }, ref) {
    return (
      <div ref={ref} className={`term ${className}`}>
        <div className="border-b border-hairline-soft px-4 py-2.5">
          <span className="font-mono text-mono-s text-signal-mute">{title}</span>
        </div>
        <pre className="m-0 overflow-x-auto p-4 font-mono text-mono-s text-signal-dim md:p-5">{lines.join('\n')}</pre>
      </div>
    );
  }
);
