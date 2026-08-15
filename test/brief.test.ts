import { describe, it, expect } from 'vitest';
import { renderBrief, briefSections, interviewKeysFor, type BriefType } from '../src/brief.js';

/** The `<!-- key -->` markers, in document order. */
function markersIn(markdown: string): string[] {
  const body = markdown.slice(markdown.indexOf('## '));
  return [...body.matchAll(/<!--\s*([\w-]+)\s*-->/g)].map((m) => m[1]);
}

describe.each<BriefType>(['product', 'client'])('renderBrief(%s)', (type) => {
  const markdown = renderBrief(type);

  it('marks every section with a real interview key', () => {
    // The whole point of the markers: adoption maps by them instead of guessing
    // from a heading. A marker that is not a real key silently drops an answer.
    const keys = interviewKeysFor(type);
    for (const marker of markersIn(markdown)) {
      expect(keys).toContain(marker);
    }
  });

  it('covers every interview question exactly once', () => {
    const markers = markersIn(markdown);
    expect([...markers].sort()).toEqual([...interviewKeysFor(type)].sort());
    expect(new Set(markers).size).toBe(markers.length);
  });

  it('gives every section a heading, guidance and an example', () => {
    for (const section of briefSections(type)) {
      expect(markdown).toContain(`## ${section.heading}`);
      expect(markdown).toContain(section.guidance);
      expect(markdown).toContain(section.example);
    }
  });

  it('puts each marker directly under its heading', () => {
    // The skill is told to read the marker under a heading; a stray one
    // elsewhere would map an answer to the wrong key.
    const lines = markdown.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (/^<!--\s*[\w-]+\s*-->$/.test(lines[i])) {
        expect(lines[i - 1]).toMatch(/^## /);
      }
    }
  });

  it('does not nest an HTML comment inside the header block', () => {
    // HTML comments do not nest: a literal marker inside the header would close
    // it at the first "-->" and leak the rest as visible text.
    const header = markdown.slice(markdown.indexOf('<!--'), markdown.indexOf('-->') + 3);
    expect((header.match(/<!--/g) ?? []).length).toBe(1);
    expect(header).not.toContain('## ');
  });

  it('tells the reader that a blank section is allowed', () => {
    expect(markdown).toMatch(/blank/i);
  });
});

describe('renderBrief type differences', () => {
  it('client asks for client things and not product-market things', () => {
    const client = markersIn(renderBrief('client'));
    expect(client).toContain('clientName');
    expect(client).toContain('deliverables');
    expect(client).not.toContain('market');
    expect(client).not.toContain('riskiestAssumption');
  });

  it('product asks for market and risk, not client sign-off', () => {
    const product = markersIn(renderBrief('product'));
    expect(product).toContain('market');
    expect(product).toContain('riskiestAssumption');
    expect(product).not.toContain('decisionMaker');
  });

  it('defaults to product', () => {
    expect(renderBrief()).toBe(renderBrief('product'));
  });

  it('shares designDirection between both', () => {
    expect(markersIn(renderBrief('product'))).toContain('designDirection');
    expect(markersIn(renderBrief('client'))).toContain('designDirection');
  });
});
