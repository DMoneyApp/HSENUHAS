'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
function extractFunctionSource(name) {
  const start = source.indexOf(`function ${name}(`); assert.ok(start >= 0, `Missing ${name}`);
  const open = source.indexOf('{', start); let depth = 0, quote = '', line = false, block = false;
  for (let i=open;i<source.length;i++) { const c=source[i],n=source[i+1];
    if(line){if(c==='\n')line=false;continue} if(block){if(c==='*'&&n==='/'){block=false;i++}continue}
    if(quote){if(c==='\\'){i++;continue}if(c===quote)quote='';continue}
    if(c==='/'&&n==='/'){line=true;i++;continue} if(c==='/'&&n==='*'){block=true;i++;continue}
    if(c==="'"||c==='"'||c==='`'){quote=c;continue} if(c==='{')depth++;if(c==='}'&&--depth===0)return source.slice(start,i+1);
  } throw new Error(`Unterminated ${name}`);
}
const csvCell = vm.runInNewContext(`(${extractFunctionSource('csvCell')})`);
assert.equal(csvCell('Normal text'), '"Normal text"');
assert.equal(csvCell('A "quoted", value'), '"A ""quoted"", value"');
assert.equal(csvCell('=HYPERLINK("https://bad.example")'), '"\'=HYPERLINK(""https://bad.example"")"');
assert.equal(csvCell('  +SUM(A1:A2)'), '"\'  +SUM(A1:A2)"');
assert.equal(csvCell('@SUM(1,2)'), '"\'@SUM(1,2)"');
assert.equal(csvCell('-cmd| /C calc'), '"\'-cmd| /C calc"');
assert.equal(csvCell('-125.50'), '"-125.50"');
assert.equal(csvCell(''), '""');
console.log('CSV EXPORT INJECTION SMOKE: PASSED (8 assertions)');
