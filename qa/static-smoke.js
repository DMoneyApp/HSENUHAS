const fs = require('fs');
const cp = require('child_process');
const root = require('path').resolve(__dirname, '..');
const required = [
  'index.html','app.js','styles.css','config.js','manifest.webmanifest','assets/nuhas-logo.jpg',
  'supabase/v8-multitenant.sql','supabase/v8.6-enhancements.sql','supabase/functions/admin-reset/index.ts','qa/import-parser-smoke.js','qa/import-retry-regression.js','qa/certificate-reader-smoke.js','qa/certificate-attachment-workflow.js','qa/certificate-renewal-workflow.js','qa/certificate-duplicate-sql-static-smoke.js','qa/compliance-renewal-reminders.js','supabase/v8.8.4-certificate-duplicate-guard.sql','V8.8.6-CHANGELOG.md','V8.8.6-LOCAL-QA-REPORT.md','README.md','PRODUCTION-SETUP.md'
];
let failed = false;
for (const f of required) {
  if (!fs.existsSync(require('path').join(root,f))) { console.error('MISSING',f); failed = true; }
}
const app = fs.readFileSync(require('path').join(root,'app.js'),'utf8');
const sql = fs.readFileSync(require('path').join(root,'supabase/v8-multitenant.sql'),'utf8');
const mustNot = ['[object Object]','Work at Height|Confined Space|Electrical Work|Lifting Operation|Excavation|Line Breaking|Chemical Work'];
for (const x of mustNot) {
  if (app.includes(x)) { console.error('UNEXPECTED LEGACY STRING', x); failed = true; }
}
for (const x of ['organization_id','organization_memberships','records_select','create_hse_record(uuid,text,date','update_hse_record(uuid,uuid,date','delete_hse_record(uuid,uuid)']) {
  if (!sql.includes(x)) { console.error('MISSING SECURITY/CRUD MARKER',x); failed=true; }
}
try { cp.execFileSync('node',['--check',require('path').join(root,'app.js')],{stdio:'inherit'}); }
catch { failed=true; }
const enhancementSql = fs.readFileSync(require('path').join(root,'supabase/v8.6-enhancements.sql'),'utf8');
for (const x of ['user_notification_state','hse360_validate_permit_authorization','is_org_admin','org_branding_insert','APPROVE']) {
  if (!enhancementSql.includes(x)) { console.error('MISSING V8.6 MIGRATION MARKER',x); failed = true; }
}
for (const x of ['function handleImportFile','function importReviewedRows','function importRowIssues','function handleCertificatePDF','function ocrPdfPages','function guessCertificateFields','jsa_templates','Import / Extract','user_notification_state']) {
  if (!app.includes(x)) { console.error('MISSING V8.6 APP MARKER',x); failed = true; }
}
console.log(failed ? 'STATIC SMOKE: FAILED' : 'STATIC SMOKE: PASSED');
process.exit(failed?1:0);
