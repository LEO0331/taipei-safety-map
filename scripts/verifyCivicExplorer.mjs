/** Local production regressions; use an existing PLAYWRIGHT_MODULE_PATH, no install or dataset refresh. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const output = 'docs/evidence/civic-explorer';
await mkdir(output, { recursive: true });
const baseline = JSON.parse(await readFile('src/test-fixtures/navigation-baseline.json', 'utf8'));
const port = 4295, url = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { windowsHide: true, stdio: 'ignore' });
const checks = [], interactions = [], errors = [];
let browser;
async function check(name, run) { try { await run(); checks.push({ name, pass: true }); } catch (e) { checks.push({ name, pass: false, error: String(e) }); throw e; } }
async function contextFor(width = 1440, reducedMotion = 'reduce') {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block', reducedMotion, isMobile: width < 500, hasTouch: width < 500 });
  await context.route('https://**/*', route => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8L0AAAAASUVORK5CYII=', 'base64') }));
  return context;
}
const entry = page => page.locator('.explorer-entry');
const back = page => page.locator('.explore-back');
const moduleButton = (page, id) => page.locator(`[data-module="${id}"]`);
async function open(page) { await entry(page).click(); await page.locator('.data-explorer h1').waitFor(); }
async function navigate(page, id) { await open(page); await moduleButton(page, id).click(); await page.locator('[data-dashboard]:not([hidden])').waitFor(); }
async function focused(page, selector) { await page.waitForFunction(s => document.activeElement?.matches(s), selector); }
async function twoFrames(page) { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); }
try {
  for (let i = 0; i < 40; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 150)); }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const language of ['en', 'zh']) for (const width of [320, 390, 768, 1440]) {
    const context = await contextFor(width), page = await context.newPage(), requests = [];
    page.on('request', r => requests.push(r.url())); page.on('pageerror', e => errors.push(e.message));
    await page.goto(url); await page.locator('.main-navigation').waitFor(); await page.waitForLoadState('networkidle');
    if (language === 'en') await page.locator('.language-toggle').click();
    const prefix = `${language}/${width}`;
    await check(`${prefix} default map and lazy optional/policy chunks`, async () => {
      assert.ok(await page.locator('.leaflet-container').isVisible());
      assert.equal(await page.locator('.data-explorer').count(), 0);
      assert.ok(!requests.some(u => /CivicExplorer-|BridgePolicy|FireRescueAccessPolicy/.test(u)));
    });
    const initialData = requests.filter(u => u.includes('/data/')).length;
    const mapNode = await page.locator('.leaflet-container').elementHandle();
    const mapTiles = await page.locator('.leaflet-tile-pane').innerHTML();
    const selects = page.locator('.workspace select');
    await selects.first().selectOption({ index: 1 });
    await page.locator('.workspace input[type=checkbox]').first().check();
    const filterValues = await selects.evaluateAll(els => els.map(el => el.value));
    const checksBefore = await page.locator('.workspace input[type=checkbox]').evaluateAll(els => els.map(el => el.checked));
    await page.locator('.leaflet-control-zoom-in').click(); await twoFrames(page);
    const paneBefore = await page.locator('.leaflet-map-pane').getAttribute('style');
    const entryStart = performance.now();
    await entry(page).focus(); await page.keyboard.press('Enter'); await page.locator('.data-explorer h1').waitFor();
    await focused(page, '.data-explorer h1');
    interactions.push({ language, width, action: 'first Explorer entry including lazy chunk', elapsedMs: performance.now() - entryStart });
    await check(`${prefix} complete catalogue, no new data and accessible controls`, async () => {
      assert.equal(await page.locator('.explore-hub').count(), 5);
      assert.equal(await page.locator('[data-module]').count(), 45);
      assert.equal(await page.locator('[data-dashboard]').isVisible(), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(await page.locator('.data-explorer button').evaluateAll(els => els.filter(el => { const r = el.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9; }).map(el => el.textContent)), []);
      assert.equal(await page.locator('.explore-hub svg:not([aria-hidden=true])').count(), 0);
      await page.waitForLoadState('networkidle');
      assert.equal(requests.filter(u => u.includes('/data/')).length, initialData);
      const text = await page.locator('.data-explorer').innerText();
      assert.ok(language === 'en' ? text.includes('No safety scores') : text.includes('不提供安全評分'));
      assert.equal(await page.locator('.data-explorer table, .data-explorer .leaflet-container, .data-explorer a[href*="maps"]').count(), 0);
    });
    if (width === 1440) await page.screenshot({ path: `${output}/${language}-${width}.png`, fullPage: true });
    const hub = page.locator('[data-explore-group="records"]');
    const selectStart = performance.now(); await hub.focus(); await page.keyboard.press('Space');
    await focused(page, '.explore-results h2');
    interactions.push({ language, width, action: 'keyboard group selection', elapsedMs: performance.now() - selectStart });
    await check(`${prefix} group selection and reduced motion`, async () => {
      assert.equal(await hub.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-module]').count(), 8);
      assert.equal(await hub.locator('.explore-lift').evaluate(el => getComputedStyle(el).transform), 'none');
      assert.equal(await hub.locator('.explore-lift').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      if (width === 1440) { await page.keyboard.press('Tab'); assert.equal(await page.locator('[data-module]').first().evaluate(el => document.activeElement === el), true); }
    });
    if (width === 390) await page.screenshot({ path: `${output}/${language}-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape'); await focused(page, '[data-explore-group="records"]');
    const search = page.locator('.explore-controls input');
    const searchStart = performance.now(); await search.fill(language === 'en' ? '橋梁證據' : 'bRiDgE EvIdEnCe');
    await check(`${prefix} cross-language literal search and reset`, async () => {
      assert.equal(await page.locator('[data-module]').getAttribute('data-module'), 'bridgePolicy');
      interactions.push({ language, width, action: 'cross-language search', elapsedMs: performance.now() - searchStart });
      await search.fill('unmatchable-987'); await page.locator('.explore-empty button').click(); await focused(page, 'input[type=search]');
      assert.equal(await page.locator('[data-module]').count(), 45);
    });
    await page.locator('.explore-view button').nth(1).click();
    await check(`${prefix} list fallback and touch selection`, async () => {
      assert.equal(await page.locator('.explore-hub').count(), 0);
      assert.equal(await page.locator('[data-module]').count(), 45);
      if (width === 390) await page.screenshot({ path: `${output}/${language}-${width}-list.png`, fullPage: true });
      if (width < 500) { await back(page).tap(); await focused(page, '.explorer-entry'); await entry(page).tap(); await page.locator('.data-explorer').waitFor(); }
    });
    await back(page).click(); await focused(page, '.explorer-entry'); await twoFrames(page);
    await check(`${prefix} return preserves actual Leaflet node, filters, layers and view`, async () => {
      assert.equal(await mapNode.evaluate(el => el === document.querySelector('.leaflet-container')), true);
      assert.deepEqual(await selects.evaluateAll(els => els.map(el => el.value)), filterValues);
      assert.deepEqual(await page.locator('.workspace input[type=checkbox]').evaluateAll(els => els.map(el => el.checked)), checksBefore);
      assert.equal(await page.locator('.leaflet-map-pane').getAttribute('style'), paneBefore);
      assert.ok(mapTiles.includes('leaflet-layer'));
      assert.equal(requests.filter(u => u.includes('/data/')).length, initialData);
    });
    // One real destination in every group at both languages and four widths.
    for (const id of ['overview', 'fireRescueAreas', 'health', 'vehicleTowing', 'bike']) {
      await navigate(page, id); await focused(page, '.navigation-modules [aria-current=page]');
      await check(`${prefix} actual destination ${id}`, async () => {
        assert.equal(await page.locator('.data-explorer').count(), 0);
        assert.ok((await page.locator('[data-dashboard] main:visible').innerText()).length > 100);
      });
    }
    await navigate(page, 'map'); await twoFrames(page);
    await check(`${prefix} selecting other destinations retains map layer and district`, async () => {
      assert.equal(await mapNode.evaluate(el => el === document.querySelector('.leaflet-container')), true);
      assert.deepEqual(await selects.evaluateAll(els => els.map(el => el.value)), filterValues);
      assert.deepEqual(await page.locator('.workspace input[type=checkbox]').evaluateAll(els => els.map(el => el.checked)), checksBefore);
      assert.ok(await page.locator('.leaflet-marker-pane .leaflet-marker-icon').count());
    });
    await context.close();
  }
  const context = await contextFor(), page = await context.newPage(), requests = [];
  page.on('request', r => requests.push(r.url())); page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.locator('.main-navigation').waitFor(); await page.locator('.language-toggle').click();
  // Every mapping actually selects its existing host tab, including historical records.
  for (const group of baseline.en) for (const [id, label] of group.items) {
    await navigate(page, id); await focused(page, '.navigation-modules [aria-current=page]');
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => [...document.querySelectorAll('[data-dashboard] main')].some(el => el.checkVisibility() && el.innerText.length > 100));
    await check(`complete mapping ${group.id}/${id}`, async () => {
      assert.equal(await page.locator('.navigation-modules [aria-current=page]').textContent(), label);
      assert.ok((await page.locator('[data-dashboard] main:visible').first().innerText()).length > 100);
    });
  }
  await navigate(page, 'smokingCessationProviders');
  await check('already implemented smoking cessation directory accessible', async () => assert.match(await page.locator('[data-dashboard] main:visible').innerText(), /Smoking/i));
  // Active module, chart/filter DOM and lazy policy instances survive entry/return.
  for (const id of ['nearby', 'burglary', 'bike', 'vehicleTowing', 'bridgePolicy', 'fireRescueAccessPolicy']) {
    await navigate(page, id); await page.waitForLoadState('networkidle');
    const main = page.locator('[data-dashboard] main:visible').first(); await main.waitFor();
    const node = await main.elementHandle(), filters = main.locator('select');
    if (await filters.count()) { const first = filters.first(); if (await first.locator('option').count() > 1) await first.selectOption({ index: 1 }); }
    if (id === 'burglary') {
      // Exercise real district, year, month and time-of-day state together.
      for (const index of [1, 2, 3]) await filters.nth(index).selectOption({ index: 1 });
    }
    const values = await filters.evaluateAll(els => els.map(el => el.value));
    const body = await main.innerText(); const before = requests.filter(u => u.includes('/data/')).length;
    await open(page); await back(page).click(); await focused(page, '.explorer-entry');
    await check(`mounted module/filter/chart and no reload ${id}`, async () => {
      assert.equal(await node.evaluate(el => el.isConnected && !el.closest('[hidden]')), true);
      assert.deepEqual(await filters.evaluateAll(els => els.map(el => el.value)), values);
      assert.equal(await main.innerText(), body);
      assert.equal(requests.filter(u => u.includes('/data/')).length, before);
    });
  }
  await context.close();
  for (const width of [390, 1440]) {
    const direct = await contextFor(width), p = await direct.newPage(), loaded = [];
    p.on('request', r => loaded.push(r.url())); p.on('pageerror', e => errors.push(e.message));
    await p.goto(url + '?view=fire-rescue-access-policy'); await p.locator('.fire-access-policy').waitFor(); await p.waitForLoadState('networkidle');
    await check(`direct-entry ${width} preserved and Explorer remains optional`, async () => {
      assert.equal(await p.locator('.data-explorer').count(), 0);
      assert.ok(!loaded.some(u => /CivicExplorer-/.test(u)));
      assert.match(await p.locator('.fire-access-policy').innerText(), /Policy #12|消防/);
    });
    await open(p); await back(p).click(); assert.ok(await p.locator('.fire-access-policy').isVisible());
    await direct.close();
  }
  const normal = await contextFor(1440, 'no-preference'), normalPage = await normal.newPage();
  await normalPage.goto(url); await normalPage.locator('.main-navigation').waitFor(); await open(normalPage);
  await normalPage.locator('.explore-hub').first().hover();
  await check('normal-motion hover uses lightweight CSS transition', async () => assert.equal(await normalPage.locator('.explore-lift').first().evaluate(el => getComputedStyle(el).transitionDuration), '0.18s'));
  await normal.close();
  const failure = await contextFor(), failPage = await failure.newPage();
  await failure.route('**/CivicExplorer-*.js', route => route.abort());
  await failPage.goto(url); await failPage.locator('.main-navigation').waitFor(); await entry(failPage).click(); await failPage.locator('.explorer-loading[role=alert]').waitFor();
  await check('failed optional chunk has a working dashboard return', async () => {
    await failPage.locator('.explorer-loading button').click(); await focused(failPage, '.explorer-entry'); assert.ok(await failPage.locator('.leaflet-container').isVisible());
  });
  await failure.close();
  assert.deepEqual(errors, []);
} finally {
  await writeFile(`${output}/browser-results.json`, JSON.stringify({ checks, interactions, errors, conditions: 'Local Edge production preview; external image requests stubbed, service worker blocked. Mobile uses touch emulation; not physical device testing.' }, null, 2) + '\n');
  const bundles = [];
  for (const name of await readdir('dist/assets')) { const bytes = await readFile(`dist/assets/${name}`); bundles.push({ name, bytes: bytes.length, gzip: gzipSync(bytes).length }); }
  await writeFile(`${output}/after-bundles.json`, JSON.stringify(bundles, null, 2) + '\n');
  await browser?.close(); server.kill();
}
console.log(`${checks.length} browser checks passed; ${errors.length} unexpected page errors.`);
