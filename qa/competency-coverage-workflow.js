const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const app = fs.readFileSync(__dirname + '/../app.js', 'utf8');
function getFunction(name) {
  const match = app.match(new RegExp(`^  function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^  \\}`, 'm'));
  assert(match, `function ${name} should exist`);
  return match[0];
}
const functions = ['complianceDaysRemaining','competencyExpiryState','isRoleRequirement','competencyCoverageRows'];
const source = functions.map(getFunction).join('\n') + '\nthis.coverage=competencyCoverageRows;';
const context = {
  today: () => '2026-10-12',
  state: {records: [
    {id:'e1',module:'employees',reference_no:'EMP-1',summary:'Ali',department:'Production',data:{employee_code:'E001',employee_name:'Ali',department_name:'Production',active_status:'Active'}},
    {id:'e2',module:'employees',reference_no:'EMP-2',summary:'Ali',department:'CNC',data:{employee_code:'E002',employee_name:'Ali',department_name:'CNC',active_status:'Active'}},
    {id:'e3',module:'employees',reference_no:'EMP-3',summary:'Sara',department:'HSE',data:{employee_name:'Sara',department_name:'HSE',active_status:'Active'}},
    {id:'e4',module:'employees',reference_no:'EMP-4',summary:'Inactive',data:{employee_code:'E004',employee_name:'Inactive',active_status:'Inactive'}},
    {id:'c1',module:'competencies',summary:'Forklift',data:{employee_code:'E001',employee_name:'Ali',expiry_date:'2026-10-01'}},
    {id:'c2',module:'competencies',summary:'First aider',data:{employee_code:'E001',employee_name:'Ali',expiry_date:'2026-10-22'}},
    {id:'c3',module:'competencies',summary:'Crane',data:{employee_code:'E002',employee_name:'Ali'}},
    {id:'c4',module:'competencies',summary:'Fire',data:{employee_name:'Sara',expiry_date:'2027-01-01'}}
  ]},
};
context.recs = module => context.state.records.filter(r => r.module === module);
vm.runInNewContext(source, context);
const rows = context.coverage('2026-10-12');
assert.strictEqual(rows.length, 3, 'inactive employees are excluded');
const ali1 = rows.find(r => r.code === 'E001');
const ali2 = rows.find(r => r.code === 'E002');
const sara = rows.find(r => r.name === 'Sara');
assert.strictEqual(ali1.linked, 2, 'employees link by code');
assert.strictEqual(ali1.status.expired, 1);
assert.strictEqual(ali1.status.due_30, 1);
assert.strictEqual(ali2.linked, 1, 'same-name employees do not share records when codes exist');
assert.strictEqual(ali2.status.missing_expiry, 1);
assert.strictEqual(sara.linked, 1, 'unique no-code name can be a fallback');
assert.strictEqual(sara.status.valid, 1);
assert(app.includes('data-export-competency-matrix') && app.includes('exportCompetencyCoverage'), 'coverage export is wired');
assert(app.includes('role-specific training') && app.includes('not automatically declared non-compliant'), 'missing records must be framed as review prompts, not compliance findings');
console.log('COMPETENCY COVERAGE WORKFLOW: PASSED (11 person-linkage/status scenarios plus 2 wiring assertions)');
