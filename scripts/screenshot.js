#!/usr/bin/env node
/**
 * screenshot.js — proof-of-life captures for the mission-control dashboard.
 *
 * Opens index.html headlessly (file://), waits for it to render, then saves:
 *   screenshots/dashboard-full.png       — the entire page
 *   screenshots/panel-<name>.png         — one crop per [data-panel] element
 *
 * Run: node scripts/screenshot.js
 * (playwright is resolved from the global npm root if not installed locally)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return require(path.join(globalRoot, 'playwright'));
  }
}

(async () => {
  const { chromium } = loadPlaywright();
  const ROOT = path.join(__dirname, '..');
  const OUT = path.join(ROOT, 'screenshots');
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    // External resource failures (web fonts on an offline machine) are an
    // expected degradation path, not a broken page.
    if (m.type() === 'error' && !/Failed to load resource/i.test(m.text())) errors.push(m.text());
  });

  await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700); // let fonts settle

  await page.screenshot({ path: path.join(OUT, 'dashboard-full.png'), fullPage: true });
  console.log('  saved dashboard-full.png');

  const panels = await page.$$('[data-panel]');
  for (const panel of panels) {
    const name = await panel.getAttribute('data-panel');
    await panel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await panel.screenshot({ path: path.join(OUT, `panel-${name}.png`) });
    console.log(`  saved panel-${name}.png`);
  }

  await browser.close();

  if (errors.length) {
    console.error('\nPage errors detected:');
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  console.log(`\nDone: ${panels.length} panels + full page, zero page errors.`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
