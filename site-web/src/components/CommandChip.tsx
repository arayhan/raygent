import { useRef, useState } from 'react';

/**
 * A copyable command. `prompt` is `$` for a shell and `>` for something typed
 * into a coding agent. Falls back to selecting the text when the clipboard is
 * refused.
 */
export function CommandChip({ command, prompt = '$' }: { command: string; prompt?: '$' | '>' }) {
  const codeRef = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<'idle' | 'copied' | 'select'>('idle');

  const selectText = () => {
    const node = codeRef.current;
    if (!node) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setStatus('copied');
    } catch {
      selectText();
      setStatus('select');
    }
    window.setTimeout(() => setStatus('idle'), 1600);
  };

  return (
    <div className="cmd">
      <code ref={codeRef}>
        <span className="text-cyan" aria-hidden="true">
          {prompt}{' '}
        </span>
        {command}
      </code>
      <button type="button" className="copy" onClick={copy} aria-label={`Copy command: ${command}`}>
        {status === 'copied' ? 'Copied' : 'Copy'}
      </button>
      <span className="sr-only-x" aria-live="polite">
        {status === 'copied' ? 'Copied' : status === 'select' ? 'Copy unavailable. The command is selected.' : ''}
      </span>
    </div>
  );
}
