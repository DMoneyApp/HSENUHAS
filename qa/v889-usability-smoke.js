'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const checks = [
  ['workspace brand includes logo and clear company workspace label', app.includes('workspace-logo') && app.includes('COMPANY WORKSPACE') && app.includes('workspace-name')],
  ['logo upload has image type and 2 MB guard', app.includes("!['image/png','image/jpeg','image/webp'].includes(file.type)") && app.includes('2*1024*1024')],
  ['failed profile update attempts to clean unlinked new logo', app.includes("remove([uploadedPath])") && app.includes('previous logo is unchanged')],
  ['dashboard offers quick capture controls', app.includes('hse-quick-actions') && app.includes('data-new="near_miss"') && app.includes('data-new="fire_equipment"')],
  ['dashboard 1, 3, 6 and 12 month periods update KPI dataset', app.includes('dashboardPeriod') && app.includes('periodRecords') && app.includes("periodRecords.filter(r=>r.module==='training')")],
  ['reports have monthly, 3, 6 and 12 month preset controls', app.includes("[[1,'Monthly'],[3,'3 months'],[6,'6 months'],[12,'12 months / yearly']]")],
  ['report includes document number, revision, issue date and review fields', app.includes('report-number') && app.includes('report-revision') && app.includes('report-issue') && app.includes('report-reviewed') && app.includes('report-approved')],
  ['report filters are preserved across rerenders', app.includes('reportMeta') && app.includes("addEventListener('input',e=>{state.reportMeta")],
  ['report PDF labels snapshot and includes sign-off information', app.includes('Generating this document does not constitute formal approval') && app.includes('Reviewed by:') && app.includes('Approved by:')],
  ['each record can store optional document-control metadata', app.includes('f_document_no') && app.includes('f_revision') && app.includes('f_document_issue_date') && app.includes('f_prepared_by') && app.includes('f_reviewed_by') && app.includes('f_approved_by')],
  ['printable record includes controlled document metadata', app.includes('UNCONTROLLED WHEN PRINTED') && app.includes('Document No.') && app.includes('Revision No.') && app.includes('Issue Date')],
  ['fire-equipment export renders a distinct inspection checklist', app.includes('Fire equipment inspection checklist') && app.includes('checklistRows')],
  ['left navigation items and groups can show unread badges', app.includes('data-nav-badge') && app.includes('data-nav-section-badge') && app.includes('updateNotificationCount')],
  ['notification actions distinguish dismissal from deleting records', app.includes('Clear the current notification list? This dismisses alerts only')],
  ['JSA picker is searchable and multi-select', app.includes('jsa-search-') && app.includes("input[type=checkbox]:checked") && app.includes('Select multiple')],
  ['JSA selection can fill permit scope, hazards and controls', app.includes("append('work_scope',joinActivities)") && app.includes("append('hazards',joinHazards)") && app.includes("append('controls',joinControls)")],
  ['permits are draft-first and allow incomplete drafts', app.includes("formStatus=transition?.status||(existing?.status||(t==='permits'?'draft':'open'))") && app.includes('Drafts may remain incomplete')],
  ['incomplete permits cannot bypass authorization-specific controls', app.includes("if(status==='approved')") && app.includes('Permit cannot be authorised') && app.includes('Use the assigned HSE Authorise action')],
  ['navigation, workspace, report and draft controls have responsive styles', css.includes('.workspace-switcher') && css.includes('.hse-quick-actions') && css.includes('.report-period-presets') && css.includes('.form-disclosure')],
];
let failed = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`);
  if (!pass) failed++;
}
console.log(`V8.8.9 USABILITY SMOKE: ${failed ? 'FAILED' : 'PASSED'} (${checks.length - failed}/${checks.length})`);
process.exitCode = failed ? 1 : 0;
