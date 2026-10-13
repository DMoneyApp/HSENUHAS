const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const app = fs.readFileSync(__dirname + '/../app.js', 'utf8');
function getFunction(name) {
  const match = app.match(new RegExp(`^  function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^  \\}`, 'm'));
  assert(match, `function ${name} should exist`);
  return match[0];
}
const source = getFunction('employeeTrainingCoverageRows') + '\nthis.coverage=employeeTrainingCoverageRows;';
const records = [
  {id:'e1',module:'employees',reference_no:'EMP-1',summary:'Ali',department:'Production',data:{employee_code:'E001',employee_name:'Ali',department_name:'Production',active_status:'Active'}},
  {id:'e2',module:'employees',reference_no:'EMP-2',summary:'Ali',department:'CNC',data:{employee_code:'E002',employee_name:'Ali',department_name:'CNC',active_status:'Active'}},
  {id:'e3',module:'employees',reference_no:'EMP-3',summary:'Inactive Ali',data:{employee_code:'E003',employee_name:'Ali',active_status:'Inactive'}},
  {id:'t1',module:'training',event_date:'2026-10-10',data:{topic:'Chemical safety',participants:2,duration:'1.5',attendee_employee_codes:'e001, E002'}},
  {id:'b1',module:'tbt',event_date:'2026-10-11',data:{topic:'Heat stress',participants:1,duration:'0.25',attendee_employee_codes:'E001'}},
  {id:'t2',module:'training',event_date:'2026-10-09',data:{topic:'Emergency',participants:4,duration:'1',attendee_employee_codes:'E999'}}
];
const context = {state:{records},recs:module=>records.filter(r=>r.module===module)};
vm.runInNewContext(source,context);
const data=context.coverage();
assert.strictEqual(data.rows.length,2,'inactive workers are excluded from active coverage rows');
const e1=data.rows.find(r=>r.code==='E001');
const e2=data.rows.find(r=>r.code==='E002');
assert.strictEqual(e1.training,1,'training participation links by explicit employee code');
assert.strictEqual(e1.tbt,1,'TBT participation links by explicit employee code');
assert.strictEqual(e1.sessions,2);
assert.strictEqual(e1.hours,1.75,'session duration is counted once for each explicitly listed participant');
assert.strictEqual(e2.training,1,'same-name employees do not share attendance history');
assert.strictEqual(e2.tbt,0);
assert.deepStrictEqual(Array.from(data.unknownCodes),['E999'],'unknown attendee code is surfaced for review');
assert.strictEqual(data.sessionCount,3);
assert.strictEqual(data.sessionsWithCodes,3);
assert(app.includes("tbt:[['topic','TBT topic'" ) && app.includes("['attendee_employee_codes','Attendee employee codes (comma / line separated)'") , 'TBT and training forms both provide a dedicated employee-code field');
assert(app.includes("if(['training','tbt'].includes(module))return filter==='training_missing_attendance'"), 'missing-attendance filter covers training and TBT');
assert(app.includes('data-export-training-matrix') && app.includes('exportEmployeeTrainingCoverage'), 'employee training history CSV export is wired');
console.log('EMPLOYEE TRAINING COVERAGE WORKFLOW: PASSED (11 matching/counting scenarios plus 3 wiring assertions)');
