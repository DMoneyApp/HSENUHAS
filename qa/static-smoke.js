const fs = require('fs');
const cp = require('child_process');
const root = require('path').resolve(__dirname, '..');
const required = [
  'index.html','app.js','styles.css','config.js','manifest.webmanifest','assets/nuhas-logo.jpg',
  'supabase/v8-multitenant.sql','supabase/functions/admin-reset/index.ts','README.md','PRODUCTION-SETUP.md'
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
console.log(failed ? 'STATIC SMOKE: FAILED' : 'STATIC SMOKE: PASSED');
process.exit(failed?1:0);
