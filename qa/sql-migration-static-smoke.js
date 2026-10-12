'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase', 'v8.6-enhancements.sql'), 'utf8');
const functions = [...sql.matchAll(/create\s+or\s+replace\s+function\s+public\.([a-z0-9_]+)[\s\S]*?\$\$;/gi)];
assert.ok(functions.length >= 3, 'Expected incremental migration functions');
for (const match of functions) {
  const body = match[0];
  if (/security\s+definer/i.test(body)) {
    assert.match(body, /set\s+search_path\s*=\s*''/i, `SECURITY DEFINER function ${match[1]} must pin an empty search_path`);
  }
}
assert.match(sql, /using\s*\(\s*user_id\s*=\s*auth\.uid\(\)\s+and\s+public\.is_org_member/i, 'Notification state must be user- and organization-scoped');
assert.match(sql, /public\.is_org_admin\(auth\.uid\(\),\s*p_org_id\)/i, 'Permit approval must require an organization admin');
assert.match(sql, /hse360_validate_permit_authorization\(p_org_id/i, 'Permit RPCs must invoke server-side approval validation');
assert.match(sql, /bucket_id\s*=\s*'org-branding'[\s\S]*?public\.is_org_admin/i, 'Branding write policies must be scoped to organization admins');
console.log('SQL MIGRATION STATIC SMOKE: PASSED');
