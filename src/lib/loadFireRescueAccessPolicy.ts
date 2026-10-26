/// <reference types="vite/client" />
import type { Snapshot } from '../types/fireRescueAccessPolicy';
import { METHOD_ID, validateAccessSnapshot } from './fireRescueAccessScenarios';
export type LoadedAccessPolicy = { snapshot: Snapshot; exactHash: string };
const MAX_BYTES = 5_000_000;
export async function boundedClientBytes(response: Response, limit: number) {
  if (!response.ok || !response.body || Number(response.headers.get('content-length') ?? 0) > limit) throw new Error('Policy resource unavailable/oversized');
  const reader = response.body.getReader(), parts: Uint8Array[] = []; let length = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > limit) throw new Error('Policy resource oversized'); parts.push(value); } } finally { await reader.cancel(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; } return bytes;
}
export async function loadFireRescueAccessPolicy(signal?: AbortSignal): Promise<LoadedAccessPolicy> {
  const base = `${import.meta.env.BASE_URL}data/fire-rescue-access-policy/`;
  const pointer = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await boundedClientBytes(await fetch(base + 'current.json', { cache: 'no-cache', signal }), 4096)));
  if (pointer.schemaVersion !== 1 || !/^fire-rescue-access-policy-v1-[a-f0-9]{64}\.json$/.test(pointer.filename) || pointer.filename !== pointer.snapshotId + '.json' || !/^[a-f0-9]{64}$/.test(pointer.sha256) || !Number.isInteger(pointer.bytes) || pointer.bytes > MAX_BYTES) throw new Error('Invalid policy pointer');
  const bytes = await boundedClientBytes(await fetch(base + pointer.filename, { signal }), MAX_BYTES);
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2,'0')).join('');
  if (digest !== pointer.sha256 || bytes.length !== pointer.bytes) throw new Error('Policy integrity mismatch');
  const snapshot: Snapshot = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (snapshot.schemaVersion !== 1 || snapshot.policyId !== 'policy-12' || snapshot.methodId !== METHOD_ID || snapshot.snapshotId !== pointer.snapshotId || !Array.isArray(snapshot.candidates) || snapshot.candidates.length > 10000 || !Array.isArray(snapshot.relationships) || snapshot.relationships.length > 50000 || snapshot.sources.length !== 3 || snapshot.modes.C !== false) throw new Error('Incompatible snapshot');
  validateAccessSnapshot(snapshot);
  return { snapshot, exactHash: digest };
}
