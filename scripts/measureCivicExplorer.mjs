/** Production loading samples; uses an existing Playwright installation, adds no dependency. */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const output = 'docs/evidence/civic-explorer';
await mkdir(output, { recursive: true });
const port = 4294, url = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { windowsHide: true, stdio: 'ignore' });
let browser;
const samples = [];
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 150)); }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const width of [1440, 390]) for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block', isMobile: width === 390, hasTouch: width === 390 });
    await context.route('https://**/*', route => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8L0AAAAASUVORK5CYII=', 'base64') }));
    const page = await context.newPage(), requests = [];
    page.on('request', r => requests.push(r.url()));
    const start = performance.now();
    await page.goto(url);
    await page.locator('.main-navigation').waitFor();
    const dashboardReadyMs = performance.now() - start;
    await page.waitForLoadState('networkidle');
    const district = page.locator('.workspace select').first();
    const filterStart = performance.now();
    await district.selectOption({ index: 1 });
    await page.evaluate(() => new Promise(requestAnimationFrame));
    const filterRoundTripMs = performance.now() - filterStart;
    samples.push({ width, run, dashboardReadyMs, filterRoundTripMs, initialDataRequests: requests.filter(u => u.includes('/data/')).length, initialJs: requests.filter(u => /\.js$/.test(u)).map(u => u.split('/').pop()), browser: await browser.version() });
    await context.close();
  }
} finally { await browser?.close(); server.kill(); }
await writeFile(`${output}/${process.argv.includes('--baseline') ? 'baseline' : 'after'}-loading.json`, JSON.stringify({ conditions: 'Three fresh contexts per width, local production preview, Edge headless, external images stubbed, service workers blocked, no CPU/network throttling; wall timings include automation overhead.', samples }, null, 2) + '\n');
console.log(JSON.stringify(samples, null, 2));
