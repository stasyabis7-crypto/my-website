#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const spreadsheet = '1ZM9ecNLEQ0Q8GL8j_FzwKSi3lRyiIKDAZ2mjzrfkPKc';
const tabs = [{ name: 'main page', gid: 0, minimum: 18 }, { name: '1 project', gid: 13097733, minimum: 58 }, { name: '2 project', gid: 2133069706, minimum: 58 }];

function parseCSV(source) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (character === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (character === ',' || character === '\n' || character === '\r')) {
      row.push(value); value = '';
      if (character !== ',') {
        rows.push(row); row = [];
        if (character === '\r' && source[i + 1] === '\n') i++;
      }
    } else value += character;
  }
  if (quoted) throw Error('Incomplete CSV response');
  if (value || row.length) { row.push(value); rows.push(row); }
  while (rows.length && rows.at(-1).every(cell => !cell.trim())) rows.pop();
  return rows;
}

async function loadSnapshot(fetcher = fetch) {
  const sheets = await Promise.all(tabs.map(async tab => {
    const endpoint = new URL('https://docs.google.com/spreadsheets/d/' + spreadsheet + '/gviz/tq');
    endpoint.searchParams.set('tqx', 'out:csv');
    endpoint.searchParams.set('headers', '1');
    endpoint.searchParams.set('gid', tab.gid);
    endpoint.searchParams.set('range', 'A1:C120');
    const response = await fetcher(endpoint, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(tab.name + ': HTTP ' + response.status);
    const csv = await response.text();
    if (csv.length > 500000 || /^\s*</.test(csv)) throw Error(tab.name + ': expected a bounded public CSV response');
    const rows = parseCSV(csv.replace(/^\uFEFF/, ''));
    if (rows.length < tab.minimum || rows[0][1] !== 'EN' || rows[0][2] !== 'RU') throw Error(tab.name + ': missing bilingual columns or rows');
    rows.slice(1).forEach((row, i) => {
      if (!row[1]?.trim() || !row[2]?.trim()) throw Error(tab.name + ': missing EN/RU text in row ' + (i + 2));
    });
    return { name: tab.name, rows: rows.map(row => row.slice(0, 3).map(value => value || null)) };
  }));
  return { spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/' + spreadsheet + '/edit', sheets };
}

if (require.main === module) loadSnapshot().then(snapshot => {
  // All three tabs are validated before replacing the local snapshot.
  fs.writeFileSync(path.join(root, 'site/languages/editorial-source.json'), JSON.stringify(snapshot, null, 2) + '\n');
  execFileSync(process.execPath, [path.join(__dirname, 'prepare-editorial-copy.js')], { stdio: 'inherit' });
  console.log('Editorial copy: fetched all three Google Sheets tabs.');
}).catch(error => { console.error('Text sync failed; deployment stopped: ' + error.message); process.exitCode = 1; });

module.exports = { parseCSV, loadSnapshot };
