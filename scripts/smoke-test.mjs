/**
 * Headless smoke test: boots the static server, loads the app in Chromium,
 * paints the demo image with several presets and checks that each one
 * produces a distinct, non-blank picture. Screenshots land in ./out.
 *
 *   npm run smoke            # default presets
 *   npm run smoke -- all     # every preset in the library
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Playwright may only be installed globally (as it is in CI images here).
const { chromium } = await import('playwright').catch(async () => {
  const root = execSync('npm root -g').toString().trim();
  return import(pathToFileURL(join(root, 'playwright', 'index.mjs')).href);
});

const PORT = 5199;
const OUT = new URL('../out/', import.meta.url).pathname;

const server = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'inherit'
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let exitCode = 0;

try {
  await mkdir(OUT, { recursive: true });
  await wait(600);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
  await page.click('#sampleBtn');
  await page.waitForFunction(() => window.__painterly?.state?.renders > 0, null, { timeout: 60000 });

  const requested = process.argv[2];
  const ids = requested === 'all'
    ? await page.$$eval('.preset[data-preset]', (els) => els.map((e) => e.dataset.preset))
    : ['classic-oil', 'impressionist', 'swirl', 'watercolour', 'cel', 'pointillism', 'charcoal'];

  const signatures = new Map();

  for (const id of ids) {
    const before = await page.evaluate(() => window.__painterly.state.renders);
    await page.click(`.preset[data-preset="${id}"]`);
    await page.waitForFunction(
      (n) => window.__painterly.state.renders > n && !window.__painterly.state.busy,
      before, { timeout: 120000 }
    );

    const stats = await page.evaluate(() => {
      const c = window.__painterly.viewer.painted;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, sum2 = 0, hash = 0;
      const n = d.length / 4;
      for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
        sum += v;
        sum2 += v * v;
      }
      for (let i = 0; i < d.length; i += 4013) hash = (hash * 31 + d[i]) % 1e9;
      const mean = sum / n;
      return { w: c.width, h: c.height, mean, sd: Math.sqrt(sum2 / n - mean * mean), hash };
    });

    if (!(stats.sd > 8)) throw new Error(`preset ${id} produced a flat image (sd=${stats.sd})`);
    if (signatures.has(stats.hash)) {
      throw new Error(`preset ${id} is pixel-identical to ${signatures.get(stats.hash)}`);
    }
    signatures.set(stats.hash, id);

    await page.locator('#viewport').screenshot({ path: `${OUT}${id}.png` });
    console.log(`  ✓ ${id.padEnd(16)} ${stats.w}×${stats.h}  mean=${stats.mean.toFixed(1)} sd=${stats.sd.toFixed(1)}`);
  }

  // Full-resolution export path.
  const download = page.waitForEvent('download', { timeout: 180000 });
  await page.click('#exportBtn');
  await page.selectOption('#exportScale', '0.5');
  await page.click('#exportConfirm');
  const file = await download;
  const saved = `${OUT}exported-${file.suggestedFilename()}`;
  await file.saveAs(saved);
  console.log(`  ✓ export           ${file.suggestedFilename()}`);

  if (errors.length) throw new Error(`console errors:\n${errors.join('\n')}`);

  await writeFile(`${OUT}report.json`,
    JSON.stringify({ presets: [...signatures.values()], export: saved }, null, 2));
  console.log('\n  All checks passed. Screenshots in ./out\n');
  await browser.close();
} catch (err) {
  console.error('\n  ✗ smoke test failed:', err.message, '\n');
  exitCode = 1;
} finally {
  server.kill();
  process.exit(exitCode);
}
