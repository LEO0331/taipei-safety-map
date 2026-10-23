import type { PolicySnapshot } from '../types/bridgePolicy';

export async function loadBridgePolicy(signal?: AbortSignal): Promise<PolicySnapshot> {
  const base = `${import.meta.env.BASE_URL}data/bridge-policy/`;
  const pointerResponse = await fetch(base + 'current.json', { cache: 'no-cache', signal });
  if (!pointerResponse.ok) throw new Error('Policy manifest unavailable');
  const pointer = await pointerResponse.json();
  if (pointer.version !== 1 || !/^bridge-policy-v1-[a-f0-9]{64}\.json$/.test(pointer.filename) || pointer.filename !== pointer.snapshotId + '.json') throw new Error('Incompatible policy manifest');
  const response = await fetch(base + pointer.filename, { signal });
  if (!response.ok) throw new Error('Policy snapshot unavailable');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 5_000_000) throw new Error('Policy snapshot too large');
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
  if (digest !== pointer.sha256) throw new Error('Policy snapshot integrity mismatch');
  const snapshot: PolicySnapshot = JSON.parse(new TextDecoder().decode(bytes));
  if (snapshot.version !== 1 || snapshot.policyId !== 'policy-9' || snapshot.snapshotId !== pointer.snapshotId) throw new Error('Incompatible policy snapshot');
  return snapshot;
}
