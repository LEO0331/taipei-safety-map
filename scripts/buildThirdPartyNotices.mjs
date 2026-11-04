import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const packages = Object.entries(lock.packages)
  .filter(([path, entry]) => path && !entry.dev && !entry.devOptional)
  .sort(([left], [right]) => left.localeCompare(right, 'en'));
const sections = [
  'Runtime dependency licenses and project/adaptation notices',
  'The license texts below retain their individual terms. This artifact does not relicense dependencies or certify permitted uses.',
];
const inventory = [];
for (const [path, locked] of packages) {
  const installed = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'));
  if (installed.version !== locked.version) throw new Error(`Installed version differs from lockfile: ${path}`);
  const files = (await readdir(path)).filter(name => /^(?:licen[sc]e|copying|notice)(?:[._-].*)?$/i.test(name)).sort();
  if (!files.length) throw new Error(`Missing runtime license/notice text: ${installed.name}`);
  sections.push(`\n===== ${installed.name}@${installed.version} (${installed.license ?? 'see text'}) =====`);
  const notices = [];
  for (const file of files) {
    const bytes = await readFile(join(path, file));
    sections.push(`--- ${file} ---\n${bytes.toString('utf8')}`);
    notices.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  inventory.push({ name: installed.name, version: installed.version, license: installed.license, notices });
}
sections.push('\n===== Project MIT license =====', await readFile('LICENSE', 'utf8'));
sections.push('\n===== Civic Explorer source/adaptation attribution =====', await readFile('docs/civic-explorer-attribution.md', 'utf8'));
// A BOM keeps plain-text navigation readable when the static host omits a charset.
await writeFile('dist/THIRD_PARTY_NOTICES.txt', '\uFEFF' + sections.join('\n\n') + '\n');
await writeFile('dist/THIRD_PARTY_NOTICES.json', JSON.stringify(inventory, null, 2) + '\n');
console.log(`Reproduced exact installed license/notice texts for ${inventory.length} locked runtime packages and project/adaptation MIT notices.`);
