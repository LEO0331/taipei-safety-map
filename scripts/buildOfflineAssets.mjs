import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';

// Keep all released views usable offline without adding them to the initial module graph.
const assets = (await readdir('dist/assets')).filter(name => /\.(?:js|css)$/.test(name)).sort();
const digest = createHash('sha256');
for (const name of assets) digest.update(name).update(await readFile(`dist/assets/${name}`));
digest.update(await readFile('dist/THIRD_PARTY_NOTICES.txt'));
let worker = await readFile('dist/sw.js', 'utf8');
worker = worker.replace('const BUILD_ASSETS = [];', `const BUILD_ASSETS = ${JSON.stringify(assets.map(name => `assets/${name}`))}.map(cacheUrl);`);
worker = worker.replace("'taipei-safety-map-v23'", `'taipei-safety-map-v23-${digest.digest('hex').slice(0, 16)}'`);
await writeFile('dist/sw.js', worker);
console.log(`Prepared ${assets.length} production JS/CSS assets for offline installation.`);
