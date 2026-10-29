import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getNavigationGroups } from './navigation';
import { filterExplorerGroups, getExplorerGroups } from './explorerModel';
import baseline from './test-fixtures/navigation-baseline.json';

describe('existing navigation contract', () => {
  for (const language of ['en', 'zh'] as const) {
    it(`${language}: retains the five groups, labels, ordering and original destinations`, () => {
      const groups = getNavigationGroups(language);
      expect(groups.map(group => ({ ...group, items: group.items.filter(([id]) => id !== 'smokingCessationProviders') }))).toEqual(baseline[language]);
      expect(groups.map(g => g.id)).toEqual(['explore', 'preparedness', 'health', 'traffic', 'records']);
      const ids = groups.flatMap(group => group.items.map(([id]) => id));
      expect(new Set(ids).size).toBe(ids.length);
      const app = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');
      const rendered = [...app.matchAll(/activeTab === '([^']+)'/g)].map(match => match[1]);
      expect(new Set(ids)).toEqual(new Set(['map', ...rendered]));
      expect(ids).toHaveLength(45);
    });
    it(`${language}: Explorer uses only the complete host catalogue`, () => {
      const groups = getExplorerGroups(language);
      expect(groups.map(g => [g.id, g.items.map(i => [i.id, i.label])])).toEqual(getNavigationGroups(language).map(g => [g.id, g.items]));
      for (const item of groups.flatMap(g => g.items)) {
        expect(Object.keys(item).sort()).toEqual(['id', 'keywords', 'label']);
        expect(item.label.length).toBeGreaterThan(0);
      }
    });
    it(`${language}: case-insensitive bilingual search, group selection and empty query`, () => {
      const groups = getExplorerGroups(language);
      const ids = (selection: string | null, term: string) => filterExplorerGroups(groups, selection, term).flatMap(g => g.items.map(i => i.id));
      expect(ids(null, '  BrIdGe EvIdEnCe  ')).toEqual(['bridgePolicy']);
      expect(ids(null, '橋梁證據')).toEqual(['bridgePolicy']);
      expect(ids('records', 'bridge')).toEqual([]);
      expect(ids('records', '')).toEqual(getNavigationGroups(language).find(g => g.id === 'records')!.items.map(([id]) => id));
      expect(ids(null, '')).toHaveLength(45);
      expect(ids(null, 'no-such-module-987')).toEqual([]);
      expect(ids(null, '.*')).toEqual([]);
      expect(ids(null, 'fireRescueAccessPolicy')).toEqual(['fireRescueAccessPolicy']);
      expect(ids(null, 'Kindergarten')).toEqual(['kindergartenChildTransportVehicles']);
    });
  }
});
