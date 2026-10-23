import { loadAccepted } from './bridgePolicySources.ts';
import { reconcileBridges } from '../src/lib/bridgePolicyIdentity.ts';
import { countValues } from '../src/lib/bridgePolicy.ts';
const { sources, a, b } = await loadAccepted();
const crosswalk = reconcileBridges(a, b);
console.log(JSON.stringify({ sources, A: { rows: a.length, groups: new Set(a.map(x => x.group)).size, issues: countValues(a.flatMap(x => x.issues)) },
  B: { rows: b.length, issues: countValues(b.flatMap(x => x.issues)), geography: countValues(b.flatMap(x => x.geography.issues)) },
  associations: countValues(crosswalk.map(x => x.status)) }, null, 2));
