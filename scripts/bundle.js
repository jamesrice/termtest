#!/usr/bin/env node
/**
 * bundle.js — produce dist/mission-control.html: the dashboard with the
 * current data INLINED, so it is one double-clickable file with no
 * dependencies. This is the hand-off artifact; the repo keeps only code.
 *
 * Run after build-data.js: node scripts/bundle.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dataFile = path.join(ROOT, 'data', 'dashboard-data.js');

let dataJs;
try {
  dataJs = fs.readFileSync(dataFile, 'utf8');
} catch {
  console.error('data/dashboard-data.js missing — run node scripts/build-data.js first');
  process.exit(1);
}

const TAG = '<script src="data/dashboard-data.js"></script>';
if (!html.includes(TAG)) {
  console.error(`index.html no longer contains ${TAG} — update bundle.js`);
  process.exit(1);
}
// </script> inside the data payload would terminate the inline tag early
const safe = dataJs.replace(/<\//g, '<\\/');
let bundled = html.replace(TAG, '<script>\n' + safe + '\n</script>');

// Inline local font files (Gilroy woff2) as data URIs so the bundle stays
// one self-contained file. Missing font files degrade to the CSS fallback
// stack rather than failing the build.
bundled = bundled.replace(/url\('(fonts\/[^']+\.woff2)'\)/g, (match, rel) => {
  const fontPath = path.join(ROOT, rel);
  try {
    const b64 = fs.readFileSync(fontPath).toString('base64');
    return `url('data:font/woff2;base64,${b64}')`;
  } catch {
    console.warn(`  (font ${rel} not found — bundle will use fallback fonts)`);
    return match;
  }
});

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const out = path.join(ROOT, 'dist', 'mission-control.html');
fs.writeFileSync(out, bundled);
console.log('Wrote', path.relative(ROOT, out), `(${(bundled.length / 1024).toFixed(0)} KB, fully self-contained)`);
