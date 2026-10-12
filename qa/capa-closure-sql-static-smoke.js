'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase', 'v8.8.1-capa-closure-guard.sql'), 'utf8');
assert.match(sql, /create\s+or\s+replace\s+function\s+public\.enforce_verified_action_closure/i);
assert.match(sql, /security\s+definer[\s\S]*?set\s+search_path\s*=\s*pg_catalog,\s*public/i, 'trigger function must pin its search_path');
for (const field of ['responsible','due_date','priority','verification','completion_evidence','effectiveness_status','verifier','verified_at']) {
  assert(sql.includes(`new.data->>'${field}'`), `closure trigger must inspect ${field}`);
}
assert.match(sql, /v_effectiveness\s+is\s+distinct\s+from\s+'effective'/i, 'only effective verification can close the action');
assert.match(sql, /regexp_replace\(v_verifier[\s\S]*?regexp_replace\(v_owner/i, 'verifier must differ from owner');
assert.match(sql, /v_verified_date\s*>\s*current_date/i, 'future verification dates must be rejected');
assert.match(sql, /old\.data->>'completion_evidence'[\s\S]*?old\.data->>'verified_at'[\s\S]*?return\s+new/i, 'unchanged legacy closed actions must remain editable without resetting closure');
assert.match(sql, /before\s+insert\s+or\s+update\s+of\s+module,\s*status,\s*data/i, 'trigger must cover create and update');
assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.enforce_verified_action_closure\(\)\s+from\s+public/i, 'trigger function execute must not be publicly granted');
console.log('CAPA CLOSURE SQL STATIC SMOKE: PASSED (12 guard assertions)');
