'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
assert.match(source, /data-export-renewals="1"/, 'Dashboard renewal watch must expose an export action');
assert.match(source, /\[data-export-renewals\].*exportComplianceRenewals/s, 'Export action must be wired to its handler');
const start = source.indexOf('  function exportComplianceRenewals()');
const end = source.indexOf('\n  async function exportAudit()', start);
assert.ok(start >= 0 && end > start, 'Dedicated renewal export handler must exist');
const fn = source.slice(start, end);
for (const field of ['reference_no', 'document_number', 'issuer', 'responsible', 'expiry_date', 'days_remaining', 'alert_band', 'renewal_status', 'renewed_by', 'record_id']) {
  assert.ok(fn.includes(field), `Renewal export should include ${field}`);
}
assert.match(fn, /expiryItems\(\)/, 'Export must use the same filtered active renewal-alert source as the dashboard');
assert.match(fn, /csvCell\(r\[k\]\)/, 'Values must be CSV-escaped');
assert.match(fn, /compliance-renewal-watch/, 'Export filename must be recognisable');
console.log('COMPLIANCE RENEWAL EXPORT: PASSED (15 assertions)');
