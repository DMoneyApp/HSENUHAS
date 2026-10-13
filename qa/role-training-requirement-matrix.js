const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const app = fs.readFileSync(__dirname + '/../app.js', 'utf8');
function getFunction(name) {
  const match = app.match(new RegExp(`^  function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^  \\}`, 'm'));
  assert(match, `function ${name} should exist`);
  return match[0];
}
function getConst(name) {
  const match = app.match(new RegExp(`^  const ${name}[^\\n]*`, 'm'));
  assert(match, `constant ${name} should exist`);
  return match[0];
}
const source = [
  getFunction('complianceDaysRemaining'),
  getConst('normalizeTrainingCode'),
  getConst('normalizeRequirementText'),
  getFunction('isRoleRequirement'),
  getFunction('trainingRequirementExpiry'),
  getFunction('trainingRequirementMatrixRows'),
  '\nthis.matrix=trainingRequirementMatrixRows; this.expiry=trainingRequirementExpiry;'
].join('\n');
const records = [
  {id:'e1',module:'employees',reference_no:'EMP-001',summary:'Aisha Operator',department:'Production',data:{employee_code:' EMP-001 ',employee_name:'Aisha Operator',designation:'Operator',department_name:'Production',employment_type:'NUHAS',active_status:'Active'}},
  {id:'e2',module:'employees',reference_no:'EMP-002',summary:'Rafi Electrician',department:'Maintenance',data:{employee_code:'EMP-002',employee_name:'Rafi Electrician',designation:'Electrician',department_name:'Maintenance',employment_type:'NUHAS',active_status:'Active'}},
  {id:'e3',module:'employees',reference_no:'EMP-003',summary:'No Code',department:'Production',data:{employee_name:'No Code',designation:'Operator',department_name:'Production',employment_type:'NUHAS',active_status:'Active'}},
  {id:'e4',module:'employees',reference_no:'EMP-004',summary:'Inactive',department:'Production',data:{employee_code:'EMP-004',employee_name:'Inactive',designation:'Operator',department_name:'Production',employment_type:'NUHAS',active_status:'Inactive'}},
  {id:'r1',module:'competencies',reference_no:'COMP-101',summary:'Forklift Safety',data:{record_purpose:'Role Requirement',course_code:'FORK-101',certificate:'Forklift Safety',required_for_designation:'All roles',required_for_department:'Production',required_for_employment_type:'NUHAS',requirement_strength:'Mandatory',refresh_interval_months:'24'}},
  {id:'r2',module:'competencies',reference_no:'COMP-102',summary:'Electrical Safety',data:{record_purpose:'Role Requirement',course_code:'ELEC-101',certificate:'Electrical Safety',required_for_designation:'All roles',required_for_department:'All departments',required_for_employment_type:'All',requirement_strength:'Mandatory',refresh_interval_months:'12'}},
  {id:'r3',module:'competencies',reference_no:'COMP-103',summary:'First Aid',data:{record_purpose:'Role Requirement',course_code:'FA-101',certificate:'First Aid',required_for_designation:'Operator',required_for_department:'Production',required_for_employment_type:'NUHAS',requirement_strength:'Mandatory'}},
  {id:'r4',module:'competencies',reference_no:'COMP-104',summary:'Duplicate course A',data:{record_purpose:'Role Requirement',course_code:'DUP-1',certificate:'Duplicate A',required_for_designation:'All roles',required_for_department:'All departments',required_for_employment_type:'All',requirement_strength:'Mandatory'}},
  {id:'r5',module:'competencies',reference_no:'COMP-105',summary:'Duplicate course B',data:{record_purpose:'Role Requirement',course_code:'dup-1',certificate:'Duplicate B',required_for_designation:'all roles',required_for_department:'all departments',required_for_employment_type:'all',requirement_strength:'mandatory'}},
  {id:'r6',module:'competencies',reference_no:'COMP-106',summary:'Incomplete requirement',data:{record_purpose:'Role Requirement',certificate:'Unconfigured course',requirement_strength:'Not assessed'}},
  {id:'c1',module:'competencies',reference_no:'CERT-001',summary:'Forklift certificate',data:{record_purpose:'Employee Evidence',employee_code:'emp-001',course_code:'fork-101',certificate:'Forklift Safety',issue_date:'2025-04-01',expiry_date:'2027-03-31'}},
  {id:'c2',module:'competencies',reference_no:'CERT-002',summary:'Electrical certificate',data:{record_purpose:'Employee Evidence',employee_code:'EMP-001',course_code:'ELEC-101',certificate:'Electrical Safety',issue_date:'2024-10-13'}},
  {id:'c3',module:'competencies',reference_no:'CERT-003',summary:'First aider card',data:{record_purpose:'Employee Evidence',employee_code:'EMP-001',course_code:'FA-101',certificate:'First Aid',issue_date:'2026-09-01',expiry_date:'2026-10-20'}},
  {id:'c4',module:'competencies',reference_no:'CERT-004',summary:'Other first aid',data:{record_purpose:'Employee Evidence',employee_code:'EMP-002',course_code:'FA-101',expiry_date:'2027-01-01'}}
];
const context = {state:{records},recs:module=>records.filter(r=>r.module===module),today:()=> '2026-10-13'};
vm.runInNewContext(source, context);
const result=context.matrix('2026-10-13');
assert.strictEqual(result.employees.length,3,'inactive employees are excluded');
assert.strictEqual(result.requirements.length,6,'role requirement records are kept separate from evidence');
assert.strictEqual(result.configurationGaps.length,3,'both duplicate records and the incomplete requirement must be surfaced');
assert.strictEqual(result.usableRequirements.length,3,'only requirements with validated scope/strength and no duplicate key are used');
const aisha=result.employees.find(r=>r.code.trim()==='EMP-001');
const rafi=result.employees.find(r=>r.code==='EMP-002');
const noCode=result.employees.find(r=>r.name==='No Code');
assert(aisha,'active employee is present');
assert.strictEqual(aisha.items.find(i=>i.courseCode==='FORK-101')?.status,'valid','code matching ignores case and surrounding whitespace');
assert.strictEqual(aisha.items.find(i=>i.courseCode==='ELEC-101')?.status,'expired','expiry can be derived from issue date and approved refresh interval');
assert.strictEqual(aisha.items.find(i=>i.courseCode==='FA-101')?.status,'due_30','near-term expiry is surfaced');
assert.strictEqual(aisha.mandatoryCount,3,'mandatory requirements are counted for the applicable employee');
assert.strictEqual(aisha.gapCount,1,'expired mandatory item is a gap; valid mandatory item is not');
assert.strictEqual(rafi.items.find(i=>i.courseCode==='ELEC-101')?.status,'missing','requirement without matching evidence remains a review gap');
assert.strictEqual(noCode.items.find(i=>i.courseCode==='ELEC-101')?.status,'employee_code_missing','no-code employees are not name-matched in matrix calculations');
assert.strictEqual(result.checks,7,'mandatory employee-course combinations counted deterministically');
assert.strictEqual(result.gaps,5,'missing and expired mandatory evidence are counted; due-soon treated as coverage with renewal warning');
assert.strictEqual(result.dueSoon,1);
assert.strictEqual(result.expired,1,'expired mandatory evidence is counted; missing employee code is kept distinct');
const derived=context.expiry({data:{issue_date:'2024-01-31'}},{data:{refresh_interval_months:'1'}},'2024-02-28');
assert.strictEqual(derived.expiry,'2024-02-29','derived monthly expiry clamps to target-month end including leap years');
assert.strictEqual(derived.derived,true);
const bad=context.expiry({data:{expiry_date:'not-a-date'}},{data:{}},'2026-10-13');
assert.strictEqual(bad.status,'invalid_expiry','invalid entered expiry is never treated as valid');
assert(app.includes("data-export-training-requirements-matrix") && app.includes('exportTrainingRequirementMatrix'),'role training matrix CSV export is wired');
assert(app.includes("data-new-role-requirement") && app.includes('wireCompetencyPurposeUI'),'role requirement creation and field visibility are wired');
assert(app.includes('A role requirement with the same course code') && app.includes('Requirement strength'),'duplicate requirements and unassessed strength are guarded');
console.log('ROLE TRAINING REQUIREMENT MATRIX: PASSED (15 data/status scenarios plus 3 UI/validation wiring assertions)');
