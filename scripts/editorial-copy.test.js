const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseCSV, loadSnapshot } = require('./sync-editorial-copy');
const source = JSON.parse(fs.readFileSync(path.join(__dirname, '../site/languages/editorial-source.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/deploy-hostinger.yml'), 'utf8');
assert(!workflow.includes('copy:sync'), 'Deployments must use the saved snapshot without consulting Google Sheets');
assert(!fs.readFileSync(path.join(__dirname, '../site/language.js'), 'utf8').includes('fetch('), 'Visitors must use local copy without fetching the spreadsheet');
assert.deepEqual(parseCSV('"component","EN","RU"\r\n"a","Hello, \"\"friend\"\"\nNext line","Привет"\r\n'), [
  ['component', 'EN', 'RU'], ['a', 'Hello, "friend"\nNext line', 'Привет']
]);
assert.throws(() => parseCSV('"unfinished'), /Incomplete/);
const gids = ['0', '13097733', '2133069706'];
function response(rows) {
  return { ok: true, text: async () => rows.map(row => row.map(cell => '"' + (cell || '').replaceAll('"', '""') + '"').join(',')).join('\r\n') };
}
(async () => {
  const snapshot = await loadSnapshot(async endpoint => {
    assert.equal(endpoint.searchParams.get('headers'), '1', 'Google must not infer several header rows');
    assert.equal(endpoint.searchParams.get('range'), 'A1:C120');
    return response(source.sheets[gids.indexOf(endpoint.searchParams.get('gid'))].rows);
  });
  assert.deepEqual(snapshot, source, 'CSV preserves multiline text, commas, quotes and both languages');
  await assert.rejects(loadSnapshot(async () => ({ ok: false, status: 403 })), /HTTP 403/);
  await assert.rejects(loadSnapshot(async () => ({ ok: true, text: async () => '<html>Sign in</html>' })), /CSV response/);
  await assert.rejects(loadSnapshot(async () => response([['component', 'EN', 'RU']])), /missing bilingual/);
  const damaged = source.sheets[0].rows.map(row => row.slice()); damaged[1][2] = '';
  await assert.rejects(loadSnapshot(async endpoint => response(endpoint.searchParams.get('gid') === '0' ? damaged : source.sheets[gids.indexOf(endpoint.searchParams.get('gid'))].rows)), /missing EN\/RU text/);
  console.log('Editorial import: live header contract, quoted multiline CSV, incomplete responses and missing translations verified.');
})().catch(error => { console.error(error); process.exitCode = 1; });
