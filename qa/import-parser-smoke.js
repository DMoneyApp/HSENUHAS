'use strict';
// Exercises pure import helpers directly from app.js without loading the browser UI.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
function extractFunctionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Could not find ${name} in app.js`);
  const open = source.indexOf('{', start);
  assert.ok(open >= 0, `Could not find function body for ${name}`);
  let depth = 0, quote = '', lineComment = false, blockComment = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unterminated function body: ${name}`);
}
const context = { Date, String, Number, Math };
const loadFn = (name) => vm.runInNewContext(`(${extractFunctionSource(name)})`, context);
context.importCell = loadFn('importCell');
context.normalizeImportDate = loadFn('normalizeImportDate');
context.today = () => '2026-10-11';
context.state = { membership: { department: 'HSE' }, profile: { department: 'Operations' } };
context.importDraft = { fileName: 'test.csv', kind: 'table', headers: [], mapping: [] };
context.importRowModel = loadFn('importRowModel');
context.importRowIssues = loadFn('importRowIssues');
const parseCSV = loadFn('parseCSV');
const csvCell = loadFn('csvCell');

// CSV: commas, CRLF, embedded line breaks, escaped double quotes and blank rows.
assert.deepEqual(JSON.parse(JSON.stringify(parseCSV('name,description\r\n"Furnace, area","Line one\nLine ""two"""\r\n\r\n'))), [
  ['name', 'description'],
  ['Furnace, area', 'Line one\nLine "two"']
]);
assert.deepEqual(JSON.parse(JSON.stringify(parseCSV('a,b\n1,2\n3,4'))), [['a','b'],['1','2'],['3','4']]);
assert.throws(() => parseCSV('name,summary\n1,"unclosed'), /unclosed quoted field/i);
assert.equal(csvCell('A "quoted", value'), '"A ""quoted"", value"');

// Date parsing: ISO, UAE-style D/M/Y, time suffix, leap day and invalid dates.
assert.equal(context.normalizeImportDate('2026-10-11'), '2026-10-11');
assert.equal(context.normalizeImportDate('2026-10-11T08:30:00'), '2026-10-11');
assert.equal(context.normalizeImportDate('11/10/2026'), '2026-10-11');
assert.equal(context.normalizeImportDate('29/02/2024'), '2024-02-29');
assert.equal(context.normalizeImportDate('29/02/2025'), '');
assert.equal(context.normalizeImportDate('2026-02-31'), '');
assert.equal(context.normalizeImportDate('13/13/2026'), '');
assert.equal(context.normalizeImportDate(''), '');

// The actual import mapper must not silently replace an invalid nonblank date with today's date.
context.importDraft = {fileName:'bad-date.csv',kind:'table',headers:['event_date','location','summary'],mapping:['event_date','location','summary']};
let model = context.importRowModel(['31/02/2026','CNC Rod Area','Test record'],0,'observations');
assert.equal(model.event_date, '');
assert.match(context.importRowIssues(model,2).join(' '), /Date .*not valid/i);
model = context.importRowModel(['','CNC Rod Area','Test record'],0,'observations');
assert.equal(model.event_date, '2026-10-11');
assert.equal(context.importRowIssues(model,2).length, 0);
model = context.importRowModel(['11/10/2026','CNC Rod Area','Test record'],0,'observations');
assert.equal(model.event_date, '2026-10-11');
assert.equal(context.importRowIssues(model,2).length, 0);
model = context.importRowModel(['11/10/2026','CNC Rod Area',''],0,'observations');
assert.match(context.importRowIssues(model,2).join(' '), /Summary is blank/i);

console.log('IMPORT PARSER SMOKE: PASSED');
