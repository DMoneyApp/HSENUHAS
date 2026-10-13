const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const app = fs.readFileSync(__dirname + '/../app.js', 'utf8');
function getFunction(name) {
  const match = app.match(new RegExp(`^  function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^  \\}`, 'm'));
  assert(match, `function ${name} should exist`);
  return match[0];
}
const source=[getFunction('auditWorkflowIssues'),getFunction('recordQualityMatches'),'\nthis.issues=auditWorkflowIssues;this.matches=recordQualityMatches;'].join('\n');
const audit={id:'audit-1',module:'audit',reference_no:'AUD-2026-01',data:{audit_status:'Report Issued',findings:4,major_findings:1,report_reference:'AUD-RPT-1'}};
const records=[audit];
const context={state:{records},today:()=> '2026-10-13',complianceDaysRemaining:()=>1,permitOverlapRecordIds:()=>new Set(),FIRE_CHECK_FIELDS:[]};
vm.runInNewContext(source,context);
assert(context.issues(audit,'2026-10-13',records).includes('findings_without_linked_action'),'audit findings in report-issued phase need traceable actions');
assert(!context.issues({...audit,data:{...audit.data,audit_status:'Planned'}},'2026-10-13',records).includes('findings_without_linked_action'),'planned audits are not flagged before findings are issued');
assert(!context.issues({...audit,data:{...audit.data,findings:0}},'2026-10-13',records).includes('findings_without_linked_action'),'audits without findings do not need finding actions');
assert(!context.issues(audit,'2026-10-13',[...records,{id:'a1',module:'actions',data:{source_record_id:'audit-1'}}]).includes('findings_without_linked_action'),'source record ID linkage counts');
assert(!context.issues(audit,'2026-10-13',[...records,{id:'a2',module:'actions',data:{related_reference:'AUD-2026-01'}}]).includes('findings_without_linked_action'),'related reference linkage counts');
assert(context.issues(audit,'2026-10-13',[...records,{id:'a3',module:'actions',data:{related_reference:'OBS-2026-01'}}]).includes('findings_without_linked_action'),'unrelated actions do not satisfy the audit linkage');
assert(context.matches('audit',audit,'audit_findings_without_linked_action','2026-10-13'),'quality filter exposes the linkage gap');
assert(app.includes("action('Findings without linked corrective action'") && app.includes("audit_findings_without_linked_action"),'audit quality panel exposes an actionable filter');
console.log('AUDIT ACTION LINKAGE: PASSED (7 linkage/phase scenarios plus 2 UI/filter assertions)');
