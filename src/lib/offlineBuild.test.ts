import { afterEach, describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const temporary: string[] = [];
afterEach(() => temporary.splice(0).forEach(path => rmSync(path, { recursive: true, force: true })));

describe('production offline asset generation', () => {
  it('activates by removing only old owned caches while retaining sibling applications', async () => {
    const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
    const current = source.match(/const CACHE_NAME = '([^']+)'/)![1];
    const handlers: Record<string, (event: unknown) => void> = {};
    const deleted: string[] = [];
    const foreign = ['portfolio-v1', 'taipei-crash-map-v1', 'taipei-friendly-food-map-v1', 'taipei-safety-map-vendor', 'taipei-safety-map-v22-user-cache'];
    const old = ['taipei-safety-map-v1', 'taipei-safety-map-v21', 'taipei-safety-map-v22-072a3abbc8847290'];
    let task: Promise<unknown> | undefined;
    let claimed = false;
    runInNewContext(source, { URL, self: { registration: { scope: 'https://example.org/taipei-safety-map/' }, clients: { claim: async () => { claimed = true; } }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
      caches: { keys: async () => [current, ...old, ...foreign], delete: async (name: string) => { deleted.push(name); return true; } },
    });
    handlers.activate({ waitUntil: (promise: Promise<unknown>) => { task = promise; } });
    await task;
    expect(deleted).toEqual(old);
    expect(claimed).toBe(true);
    expect(source).toContain("cacheUrl('THIRD_PARTY_NOTICES.txt')");
  });
  it('serves the cached notice document for offline navigation instead of the HTML shell', async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const requests: string[] = [];
    let response: Promise<unknown> | undefined;
    runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), { URL,
      self: { registration: { scope: 'https://example.org/map/' }, location: { origin: 'https://example.org' }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
      caches: { match: (request: { url: string }) => { requests.push(request.url); return Promise.resolve('exact notices'); } },
    });
    handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.org/map/THIRD_PARTY_NOTICES.txt' }, respondWith: (value: Promise<unknown>) => { response = value; } });
    expect(await response).toBe('exact notices');
    expect(requests).toEqual(['https://example.org/map/THIRD_PARTY_NOTICES.txt']);
  });
  it('ignores Vary only for same-origin hashed build JS/CSS, never data or external requests', async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const calls: unknown[][] = [];
    runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
      URL, self: { registration: { scope: 'https://example.org/map/' }, location: { origin: 'https://example.org' }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
      caches: { match: (...args: unknown[]) => { calls.push(args); return Promise.resolve('cached'); } },
    });
    for (const path of ['https://example.org/map/assets/view-a1B2.js', 'https://example.org/map/assets/view-a1B2.css', 'https://example.org/map/data/records.json', 'https://cdn.example.org/map/assets/view-a1B2.js', 'https://example.org/map/assets/plain.js']) {
      let response: Promise<unknown> | undefined;
      handlers.fetch({ request: { method: 'GET', mode: 'cors', url: path }, respondWith: (value: Promise<unknown>) => { response = value; } });
      await response;
    }
    expect(calls.slice(0, 2).map(call => call[1])).toEqual([{ ignoreVary: true }, { ignoreVary: true }]);
    expect(calls.slice(2).map(call => call[1])).toEqual([undefined, undefined, undefined]);
  });
  it('precaches every emitted JS/CSS file and changes cache identity with release bytes', () => {
    const root = mkdtempSync(join(tmpdir(), 'safety-offline-'));
    temporary.push(root);
    mkdirSync(join(root, 'dist/assets'), { recursive: true });
    const source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
    const script = fileURLToPath(new URL('../../scripts/buildOfflineAssets.mjs', import.meta.url));
    writeFileSync(join(root, 'dist/THIRD_PARTY_NOTICES.txt'), 'license notices');
    writeFileSync(join(root, 'dist/assets/entry.js'), 'entry');
    writeFileSync(join(root, 'dist/assets/lazy.js'), 'lazy');
    writeFileSync(join(root, 'dist/assets/lazy.css'), 'styles');
    writeFileSync(join(root, 'dist/assets/source.js.map'), '{}');
    const build = () => {
      writeFileSync(join(root, 'dist/sw.js'), source);
      execFileSync(process.execPath, [script], { cwd: root });
      return readFileSync(join(root, 'dist/sw.js'), 'utf8');
    };
    const worker = build();
    expect(worker).toContain('["assets/entry.js","assets/lazy.css","assets/lazy.js"].map(cacheUrl)');
    expect(worker).not.toContain('source.js.map');
    expect(worker).toContain('...APP_SHELL, ...DATA_FILES, ...BUILD_ASSETS');
    expect(build()).toBe(worker);
    writeFileSync(join(root, 'dist/assets/lazy.js'), 'changed');
    const changed = build();
    expect(changed.match(/const CACHE_NAME = .*/)?.[0]).not.toBe(worker.match(/const CACHE_NAME = .*/)?.[0]);
    writeFileSync(join(root, 'dist/THIRD_PARTY_NOTICES.txt'), 'updated notices');
    expect(build().match(/const CACHE_NAME = .*/)?.[0]).not.toBe(changed.match(/const CACHE_NAME = .*/)?.[0]);
  });
});
