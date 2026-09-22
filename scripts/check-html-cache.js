#!/usr/bin/env node
'use strict';

// Run against the published server: a local file check cannot verify HTTP policy.
const assert = require('node:assert/strict');
const base = process.argv[2] || 'https://stasyabis.com/';

async function verify() {
  for (const path of ['', 'index.html']) {
    const url = new URL(path, base);
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    assert.ok(response.ok, `${url}: HTTP ${response.status}`);
    const policy = response.headers.get('cache-control') || '';
    await response.body.cancel();
    assert.match(policy, /(?:^|,)\s*no-cache(?:\s|,|$)/i,
      `${url}: HTML must revalidate; received Cache-Control: ${policy || '(missing)'}`);
    assert.match(policy, /must-revalidate/i, `${url}: stale HTML must not be reused`);
    console.log(`${url.pathname}: ${policy}`);
  }
}

(async () => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try { await verify(); return; }
    catch (error) {
      if (attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
