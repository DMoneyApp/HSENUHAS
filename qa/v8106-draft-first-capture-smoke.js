const fs = require('fs');
const path = require('path');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const tests = [
  ['every record form exposes an explicit Save draft action', /data-save-draft="\$\{t\}"/.test(app)],
  ['draft action changes status to draft before saving', /data-save-draft[\s\S]{0,260}status\.value='draft'[\s\S]{0,100}saveForm/.test(app)],
  ['draft button uses the existing save pipeline', /saveForm\(b\.dataset\.saveDraft,b\.dataset\.modal,b\.dataset\.recordId\|\|''\)/.test(app)],
  ['incomplete corrective-action drafts skip progression validation', /const isDraft=String\(get\('status'\)\|\|''\)\.toLowerCase\(\)==='draft';\s*const closureError=\(isDraft\|\|preserveLegacyClosure\)\?null:actionClosureValidationError/.test(app)],
  ['non-draft corrective actions retain closure validation', /actionClosureValidationError\(closureData,today\(\)\)/.test(app)],
  ['draft status remains in allowed status options', /\['draft','open','in_progress','closed'\]/.test(app)],
  ['local draft recovery remains available', /function wireLocalDraft/.test(app)],
  ['permit drafts remain distinct from approval', /A draft may be saved with partial details/.test(app)],
  ['draft action has explanatory title', /Save incomplete information without submitting or authorising it/.test(app)],
  ['Supabase create/update RPC names remain unchanged', /create_hse_record[\s\S]*update_hse_record/.test(app)],
];
let fail = 0;
for (const [name, ok] of tests) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fail++; }
console.log(`${tests.length - fail}/${tests.length} V8.10.6 draft-first capture checks passed`);
process.exit(fail ? 1 : 0);
