import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Run the real build entrypoint, then verify its artifact against installed package bytes.
describe('distributed runtime notices', () => {
  it('contains every locked production license verbatim and copied MIT attribution', () => {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    // The production build is the supported generator; this test isolates its output directory.
    const directory = mkdtempSync(join(tmpdir(), 'safety-notices-'));
    try {
      const script = readFileSync(new URL('../../scripts/buildThirdPartyNotices.mjs', import.meta.url), 'utf8');
      const patched = script.replaceAll("'dist/THIRD_PARTY_NOTICES.txt'", JSON.stringify(join(directory, 'notices.txt')))
        .replaceAll("'dist/THIRD_PARTY_NOTICES.json'", JSON.stringify(join(directory, 'notices.json')));
      execFileSync(process.execPath, ['--input-type=module', '-e', patched], { cwd: root });
      const text = readFileSync(join(directory, 'notices.txt'), 'utf8');
      expect(text.charCodeAt(0)).toBe(0xFEFF);
      const inventory = JSON.parse(readFileSync(join(directory, 'notices.json'), 'utf8')) as { name: string; version: string; notices: { file: string }[] }[];
      const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
      const paths = Object.keys(lock.packages).filter(path => path && !lock.packages[path].dev && !lock.packages[path].devOptional);
      expect(inventory).toHaveLength(paths.length);
      for (const path of paths) {
        const installed = JSON.parse(readFileSync(join(root, path, 'package.json'), 'utf8'));
        const entry = inventory.find(item => item.name === installed.name && item.version === installed.version);
        expect(entry).toBeDefined();
        expect(entry!.notices.length).toBeGreaterThan(0);
        for (const notice of entry!.notices) expect(text).toContain(readFileSync(join(root, path, notice.file), 'utf8'));
      }
      expect(text).toContain('Hippocratic License Version Number: 2.1.');
      expect(text).toContain('react-leaflet Copyright 2020 Paul Le Cam');
      expect(text).toContain('@react-leaflet/core Copyright 2020 Paul Le Cam');
      expect(text).toContain('BSD 2-Clause License');
      expect(text).toContain('Civic Explorer source/adaptation attribution');
      expect(text).toContain(readFileSync(join(root, 'LICENSE'), 'utf8'));
      expect(text).toContain(readFileSync(join(root, 'docs/civic-explorer-attribution.md'), 'utf8'));
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
