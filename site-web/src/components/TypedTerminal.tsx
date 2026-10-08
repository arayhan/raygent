import { useEffect, useRef, useState } from 'react';
import { TYPE_CHAR_MS, TYPE_LINE_MS, prefersReducedMotion } from '../motion/gsap';

interface Props {
  dir: string;
  command: string;
  output: string[];
  /** Typing starts only once this is true (the terminal is on screen). */
  play: boolean;
}

/**
 * Types `command` at 35ms per character, then prints `output` a line every
 * 120ms. The caret blinks only while typing. Reduced motion shows the end state.
 */
export function TypedTerminal({ dir, command, output, play }: Props) {
  const reduced = useRef(prefersReducedMotion()).current;
  const [typed, setTyped] = useState(reduced ? command.length : 0);
  const [lines, setLines] = useState(reduced ? output.length : 0);

  useEffect(() => {
    if (reduced || !play) return;
    setTyped(0);
    setLines(0);
    let chars = 0;
    let printed = 0;
    let timer = 0;
    const printLine = () => {
      printed += 1;
      setLines(printed);
      if (printed < output.length) timer = window.setTimeout(printLine, TYPE_LINE_MS);
    };
    const typeChar = () => {
      chars += 1;
      setTyped(chars);
      if (chars < command.length) timer = window.setTimeout(typeChar, TYPE_CHAR_MS);
      else timer = window.setTimeout(printLine, TYPE_LINE_MS * 3);
    };
    timer = window.setTimeout(typeChar, TYPE_CHAR_MS);
    return () => window.clearTimeout(timer);
  }, [command, output, play, reduced]);

  const typing = typed < command.length;
  const done = !typing && lines >= output.length;

  return (
    <div className="term">
      <div className="flex items-center gap-1.5 border-b border-hairline-soft px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-hairline" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-hairline" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-hairline" aria-hidden="true" />
        <span className="ml-2 font-mono text-mono-s text-signal-mute">{dir}</span>
      </div>
      {/* Screen readers get the whole transcript at once, not a character stream. */}
      <pre className="sr-only-x">{`$ ${command}\n${output.join('\n')}`}</pre>
      <pre
        aria-hidden="true"
        className="m-0 min-h-[17rem] overflow-x-auto p-4 font-mono text-mono whitespace-pre-wrap break-words text-signal-dim md:p-5"
      >
        <span className="text-signal-mute">$ </span>
        <span className="text-signal-white">{command.slice(0, typed)}</span>
        {typing && <span className="caret" data-typing="true" />}
        {!typing &&
          output.slice(0, lines).map((line) => (
            <span key={line} className={`block ${line.startsWith('◇') ? '' : 'text-signal-white'}`}>
              {line}
            </span>
          ))}
        {done && (
          <span className="block">
            <span className="text-signal-mute">$ </span>
            <span className="caret" data-typing="false" />
          </span>
        )}
      </pre>
    </div>
  );
}
