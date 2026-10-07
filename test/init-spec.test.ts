import { describe, it, expect } from 'vitest';
import {
  stripJsonComments,
  parseInitSpec,
  validateInitSpec,
  initSpecTemplate,
  formatSpecProblems,
} from '../src/init-spec.js';

describe('stripJsonComments', () => {
  it('removes line and block comments', () => {
    const out = stripJsonComments('{\n // a\n "x": 1 /* b */\n}');
    expect(JSON.parse(out)).toEqual({ x: 1 });
  });

  it('leaves a // inside a string alone', () => {
    // The reason this function is hand-written instead of a regex: interview
    // answers routinely contain URLs, and a regex would truncate the answer
    // silently rather than fail.
    const src = '{ "problem": "see https://x.com // still text" }';
    expect(JSON.parse(stripJsonComments(src)).problem).toBe('see https://x.com // still text');
  });

  it('leaves a /* inside a string alone', () => {
    const src = '{ "note": "glob /* everything */ here" }';
    expect(JSON.parse(stripJsonComments(src)).note).toBe('glob /* everything */ here');
  });

  it('does not end a string on an escaped quote', () => {
    const src = '{ "note": "a \\" then // not a comment" }';
    expect(JSON.parse(stripJsonComments(src)).note).toBe('a " then // not a comment');
  });

  it('keeps newlines so parse errors point at the right line', () => {
    const src = '{\n// comment\n"x": 1\n}';
    expect(stripJsonComments(src).split('\n')).toHaveLength(4);
  });
});

describe('parseInitSpec', () => {
  it('parses a commented spec', () => {
    expect(parseInitSpec('{ // hi\n "version": 1 }')).toEqual({ version: 1 });
  });

  it('rejects malformed JSON with the parser message', () => {
    expect(() => parseInitSpec('{ "a": }')).toThrow(/not valid JSON/);
  });

  it('rejects a non-object', () => {
    expect(() => parseInitSpec('[1,2]')).toThrow(/must be a JSON object/);
  });
});

describe('validateInitSpec', () => {
  const complete = {
    project: { name: 'acme-shop', type: 'product' },
    stack: { platform: 'web', framework: 'nextjs' },
  };

  it('accepts a complete spec', () => {
    expect(validateInitSpec(complete)).toEqual([]);
  });

  it('reports every problem at once, not just the first', () => {
    const problems = validateInitSpec({
      project: { name: 'x', type: 'prodct' },
      stack: { platform: 'web', framework: 'nextjs14' },
      rules: ['principles', 'style'],
    });
    const paths = problems.map((p) => p.path);
    expect(paths).toContain('project.type');
    expect(paths).toContain('stack.framework');
    expect(paths).toContain('rules[1]');
  });

  it('points a brand-shaped project name at the brand field', () => {
    // The exact mistake that motivated the brand/name split: a human name typed
    // where the folder name goes.
    const [problem] = validateInitSpec({ ...complete, project: { name: 'Acme Landing Page', type: 'product' } });
    expect(problem.path).toBe('project.name');
    expect(problem.message).toMatch(/project\.brand/);
  });

  it('reports a missing name once, not twice', () => {
    const nameProblems = validateInitSpec({ project: { name: '', type: 'product' }, stack: { platform: 'web', framework: 'nextjs' } })
      .filter((p) => p.path === 'project.name');
    expect(nameProblems).toHaveLength(1);
  });

  it('suggests the nearest valid value', () => {
    const [p] = validateInitSpec({ ...complete, agents: ['claude'] }).filter((x) => x.path === 'agents[0]');
    expect(p.message).toMatch(/Did you mean "claude-code"/);
  });

  it('suggests across a hyphen, where edit distance alone fails', () => {
    // "style" is 5 edits from "code-style" — beyond any sane distance cutoff,
    // yet unmistakably what was meant.
    const [p] = validateInitSpec({ ...complete, rules: ['style'] }).filter((x) => x.path === 'rules[0]');
    expect(p.message).toMatch(/Did you mean "code-style"/);
  });

  it('does not suggest for a value close to nothing', () => {
    const [p] = validateInitSpec({ ...complete, agents: ['banana'] }).filter((x) => x.path === 'agents[0]');
    expect(p.message).not.toMatch(/Did you mean/);
  });

  it('rejects an interview key no question has', () => {
    const [p] = validateInitSpec({ ...complete, interview: { problm: 'x' } }).filter((x) =>
      x.path.startsWith('interview.')
    );
    expect(p.message).toMatch(/Did you mean "problem"/);
  });

  it('accepts a real interview key', () => {
    expect(validateInitSpec({ ...complete, interview: { problem: 'x' } })).toEqual([]);
  });

  it('validates framework against the chosen platform', () => {
    const problems = validateInitSpec({
      project: { name: 'x', type: 'product' },
      stack: { platform: 'mobile', framework: 'nextjs' },
    });
    expect(problems.map((p) => p.path)).toContain('stack.framework');
  });

  it('rejects an unknown add-on key', () => {
    const [p] = validateInitSpec({ ...complete, stack: { ...complete.stack, addons: { stylng: 'tailwind' } } }).filter(
      (x) => x.path.startsWith('stack.addons')
    );
    expect(p.message).toMatch(/Did you mean "styling"/);
  });

  it('rejects an invalid preference value and suggests the nearest one', () => {
    const problems = validateInitSpec({ ...complete, preferences: { comments: 'minimall' } });
    expect(problems).toHaveLength(1);
    expect(problems[0].path).toBe('preferences.comments');
    expect(problems[0].message).toContain('"minimal"');
  });

  it('rejects an unknown preference key', () => {
    const problems = validateInitSpec({ ...complete, preferences: { buildfocus: 'ui-first' } as never });
    expect(problems.map((p) => p.path)).toEqual(['preferences.buildfocus']);
    expect(problems[0].message).toContain('"buildFocus"');
  });

  it('requires nothing when requireComplete is false', () => {
    expect(validateInitSpec({}, { requireComplete: false })).toEqual([]);
  });

  it('still rejects invalid values under requireComplete false', () => {
    // --fill-gaps prompts for what is absent; it must never turn a typo into a
    // question, or a wrong spec silently becomes a wrong project.
    const problems = validateInitSpec({ stack: { platform: 'wob' } }, { requireComplete: false });
    expect(problems.map((p) => p.path)).toContain('stack.platform');
  });
});

describe('initSpecTemplate', () => {
  it('produces a template that parses back', () => {
    expect(() => parseInitSpec(initSpecTemplate())).not.toThrow();
  });

  it('round-trips a filled spec through render and parse', () => {
    const used = {
      version: 1,
      project: { name: 'acme-shop', brand: 'Acme Shop', type: 'product', here: false, mode: 'guided' },
      stack: {
        platform: 'web',
        kind: 'app',
        framework: 'nextjs',
        target: 'frontend',
        backend: null,
        monorepo: false,
        packageManager: 'pnpm',
        addons: { styling: 'tailwind', validation: true },
      },
      agents: ['claude-code'],
      rules: ['principles', 'testing'],
      skills: [],
      mcp: [],
      interview: { problem: 'people lose orders' },
    };
    const parsed = parseInitSpec(initSpecTemplate(used));
    expect(parsed.project?.name).toBe('acme-shop');
    expect(parsed.project?.brand).toBe('Acme Shop');
    expect(parsed.stack?.framework).toBe('nextjs');
    expect(parsed.agents).toEqual(['claude-code']);
    expect(parsed.rules).toEqual(['principles', 'testing']);
    expect(parsed.interview?.problem).toBe('people lose orders');
    expect(validateInitSpec(parsed)).toEqual([]);
  });

  it('round-trips a partial preferences block without a trailing comma', () => {
    for (const preferences of [{ comments: 'none' }, { buildFocus: 'ui-first' }, { comments: 'full', viewport: 'web-first' }]) {
      const used = { project: { name: 'x', type: 'product' }, stack: { platform: 'web', framework: 'nextjs' }, preferences };
      const parsed = parseInitSpec(initSpecTemplate(used));
      expect(parsed.preferences).toEqual(preferences);
      expect(validateInitSpec(parsed)).toEqual([]);
    }
  });

  it('leaves preferences empty in the blank template', () => {
    expect(parseInitSpec(initSpecTemplate()).preferences).toEqual({});
  });

  it('keeps an interview answer containing a URL intact through the round trip', () => {
    const used = {
      project: { name: 'x', type: 'product' },
      stack: { platform: 'web', framework: 'nextjs' },
      interview: { problem: 'like https://x.com // but better' },
    };
    const parsed = parseInitSpec(initSpecTemplate(used));
    expect(parsed.interview?.problem).toBe('like https://x.com // but better');
  });
});

describe('formatSpecProblems', () => {
  it('says nothing was generated', () => {
    const out = formatSpecProblems('spec.json', [{ path: 'a', message: 'b' }]);
    expect(out).toMatch(/1 problem:/);
    expect(out).toMatch(/Nothing was generated\./);
  });

  it('pluralises', () => {
    const out = formatSpecProblems('spec.json', [
      { path: 'a', message: 'b' },
      { path: 'c', message: 'd' },
    ]);
    expect(out).toMatch(/2 problems:/);
  });
});
