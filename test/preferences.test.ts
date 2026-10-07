import { describe, it, expect } from 'vitest';
import {
  asksBuildFocus,
  asksViewport,
  renderPreferencesDoc,
  COMMENT_DENSITIES,
  BUILD_FOCUSES,
  VIEWPORTS,
} from '../src/preferences.js';

describe('renderPreferencesDoc', () => {
  it('returns null when nothing was chosen', () => {
    expect(renderPreferencesDoc({})).toBeNull();
  });

  it('renders one section per chosen preference, in a fixed order', () => {
    const doc = renderPreferencesDoc({ viewport: 'mobile-first', comments: 'full', buildFocus: 'ui-first' })!;
    expect(doc.startsWith('# Project preferences\n')).toBe(true);
    const headings = doc.split('\n').filter((l) => l.startsWith('## '));
    expect(headings).toEqual([
      '## Code comments: full',
      '## Build order: ui-first',
      '## Layout priority: mobile-first',
    ]);
  });

  it('omits sections that were not chosen', () => {
    const doc = renderPreferencesDoc({ comments: 'none' })!;
    expect(doc).toContain('## Code comments: none');
    expect(doc).not.toContain('## Build order');
    expect(doc).not.toContain('## Layout priority');
  });

  it('says the comment section overrides code-style.md', () => {
    for (const c of COMMENT_DENSITIES) {
      expect(renderPreferencesDoc({ comments: c.value })).toContain('overrides the comment guidance in docs/rules/code-style.md');
    }
  });

  it('has rule text for every option value', () => {
    for (const b of BUILD_FOCUSES) expect(renderPreferencesDoc({ buildFocus: b.value })).toMatch(/\n- \S/);
    for (const v of VIEWPORTS) expect(renderPreferencesDoc({ viewport: v.value })).toMatch(/\n- \S/);
  });

  it('makes ui-first wait for approval before backend work', () => {
    expect(renderPreferencesDoc({ buildFocus: 'ui-first' })).toContain('wait for explicit approval');
  });
});

describe('asksBuildFocus', () => {
  it('asks for UI projects that also have data', () => {
    expect(asksBuildFocus({ platform: 'web', kind: 'app', target: 'frontend' })).toBe(true);
    expect(asksBuildFocus({ platform: 'web', kind: 'app', target: 'fullstack' })).toBe(true);
    expect(asksBuildFocus({ platform: 'mobile' })).toBe(true);
    expect(asksBuildFocus({ platform: 'desktop' })).toBe(true);
  });

  it('skips projects with no screens or nothing but screens', () => {
    expect(asksBuildFocus({ platform: 'web', kind: 'landing' })).toBe(false);
    expect(asksBuildFocus({ platform: 'web', kind: 'app', target: 'backend' })).toBe(false);
    expect(asksBuildFocus({ platform: 'cli' })).toBe(false);
    expect(asksBuildFocus({ platform: 'agent-skills' })).toBe(false);
  });
});

describe('asksViewport', () => {
  it('asks for any web project with a frontend, landing pages included', () => {
    expect(asksViewport({ platform: 'web', kind: 'app', target: 'frontend' })).toBe(true);
    expect(asksViewport({ platform: 'web', kind: 'app', target: 'fullstack' })).toBe(true);
    expect(asksViewport({ platform: 'web', kind: 'landing' })).toBe(true);
  });

  it('skips backend-only and non-web platforms', () => {
    expect(asksViewport({ platform: 'web', kind: 'app', target: 'backend' })).toBe(false);
    expect(asksViewport({ platform: 'mobile' })).toBe(false);
    expect(asksViewport({ platform: 'desktop' })).toBe(false);
    expect(asksViewport({ platform: 'cli' })).toBe(false);
  });
});
