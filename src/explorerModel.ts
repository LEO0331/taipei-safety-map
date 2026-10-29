import { getNavigationGroups, type Tab } from './navigation';
import type { Language } from './types';

export type ExplorerGroup<Id extends string = string> = {
  id: string;
  title: string;
  description: string;
  items: { id: Id; label: string; keywords: string }[];
};

/** Catalogue labels only: never fetch or index records, locations or identifiers. */
export function getExplorerGroups(language: Language): ExplorerGroup<Tab>[] {
  const bilingual = [getNavigationGroups('zh'), getNavigationGroups('en')];
  return getNavigationGroups(language).map(group => ({
    id: group.id,
    title: group.label,
    description: group.description,
    items: group.items.map(([id, label]) => ({
      id, label,
      keywords: bilingual.flatMap(groups => groups.filter(item => item.id === group.id)
        .flatMap(item => [item.label, ...item.items.filter(([tab]) => tab === id).map(([, name]) => name)]))
        .concat(id).join(' '),
    })),
  }));
}

/** Literal case-insensitive search, scoped to the selected navigation group. */
export function filterExplorerGroups<Id extends string>(groups: ExplorerGroup<Id>[], selectedId: string | null, query: string): ExplorerGroup<Id>[] {
  const term = query.trim().toLocaleLowerCase();
  return groups.filter(group => !selectedId || group.id === selectedId).map(group => ({
    ...group,
    items: group.items.filter(item => `${group.title} ${item.label} ${item.keywords}`.toLocaleLowerCase().includes(term)),
  }));
}
