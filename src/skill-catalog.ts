export interface CatalogSkill {
  name: string;
  tags: string[];
}

export const SKILL_CATALOG: CatalogSkill[] = [
  { name: 'superpowers:brainstorming', tags: ['product', 'client'] },
  { name: 'superpowers:writing-plans', tags: ['product', 'client'] },
  { name: 'spec', tags: ['product', 'client'] },
  { name: 'learn', tags: ['product', 'client'] },
  { name: 'frontend-design', tags: ['web'] },
  { name: 'design-taste-frontend', tags: ['web'] },
  { name: 'dataviz', tags: ['web'] },
  { name: 'ui-ux-pro-max', tags: ['web', 'mobile'] },
  { name: 'impeccable', tags: ['web', 'mobile'] },
  { name: 'minimalist-ui', tags: ['web'] },
  { name: 'high-end-visual-design', tags: ['web'] },
  { name: 'apple-design', tags: ['mobile', 'desktop'] },
  { name: 'ios-design-review', tags: ['mobile'] },
  { name: 'skillify', tags: ['agent-skills'] },
  { name: 'superpowers:writing-skills', tags: ['agent-skills'] },
];

export function relevantCatalogSkills(type: string, platform: string): CatalogSkill[] {
  return SKILL_CATALOG.filter((skill) => skill.tags.includes(type) || skill.tags.includes(platform));
}
