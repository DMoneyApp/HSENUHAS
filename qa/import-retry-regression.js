'use strict';
// Guards the reviewed-import retry behaviour: a partial failure must not discard
// the user's source draft after row-level errors are reported.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = fs.readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
assert.match(app, /if\(failed===0\)importDraft=null;/,
  'Import draft should only be discarded when no rows failed');
assert.match(app, /Keep the reviewed draft when any row failed/,
  'Retry behaviour should be documented beside the state transition');
assert.match(app, /if\(state\.page==='imports'\)renderImportPreview\(\);else renderPage\(\)/,
  'The preserved draft should be rendered again after import completes');
console.log('IMPORT RETRY REGRESSION: PASSED');
