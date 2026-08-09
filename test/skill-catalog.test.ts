import { describe, it, expect } from 'vitest';
import { relevantCatalogSkills, SKILL_CATALOG } from '../src/skill-catalog.js';

describe('relevantCatalogSkills', () => {
  it('returns skills matching the type', () => {
    const result = relevantCatalogSkills('product', 'cli');
    expect(result.map((s) => s.name)).toContain('superpowers:brainstorming');
  });

  it('returns skills matching the platform', () => {
    const result = relevantCatalogSkills('client', 'mobile');
    const names = result.map((s) => s.name);
    expect(names).toContain('ui-ux-pro-max');
    expect(names).toContain('impeccable');
    expect(names).toContain('apple-design');
  });

  it('excludes skills matching neither type nor platform', () => {
    const result = relevantCatalogSkills('client', 'desktop');
    expect(result.map((s) => s.name)).not.toContain('dataviz');
  });

  it('every catalog entry has at least one tag', () => {
    for (const skill of SKILL_CATALOG) {
      expect(skill.tags.length).toBeGreaterThan(0);
    }
  });
});
