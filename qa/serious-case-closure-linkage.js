const fs=require('fs');const assert=require('assert');const vm=require('vm');
const app=fs.readFileSync(__dirname+'/../app.js','utf8');
function getFunction(name){const m=app.match(new RegExp(`^  function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^  \\}`,'m'));assert(m,`function ${name} should exist`);return m[0]}
const source=getFunction('seriousCaseClosureMissingAction')+'\nthis.guard=seriousCaseClosureMissingAction;';
const incident={id:'i1',module:'incidents',reference_no:'INC-001',status:'open',data:{severity:'Major'}};
const existing=[incident];const context={state:{records:existing}};vm.runInNewContext(source,context);
assert.strictEqual(context.guard('i1',incident,'closed','major','',existing),true,'major case cannot be newly closed without a linked action');
assert.strictEqual(context.guard('i1',incident,'closed','critical','',existing),true,'critical case cannot be newly closed without a linked action');
assert.strictEqual(context.guard('i1',incident,'in_progress','major','',existing),false,'open investigations can remain active without closure linkage');
assert.strictEqual(context.guard('i1',{...incident,status:'closed'},'closed','major','',existing),false,'editing a legacy closed record is not newly blocked');
assert.strictEqual(context.guard('i1',incident,'closed','minor','',existing),false,'minor cases are not subjected to the major / critical closure gate');
assert.strictEqual(context.guard('',null,'closed','major','ACT-001',[...existing,{id:'a1',module:'actions',reference_no:'ACT-001',data:{status:'open'}}]),false,'an explicitly linked existing action satisfies the presence requirement');
assert.strictEqual(context.guard('i1',incident,'closed','major','', [...existing,{id:'a1',module:'actions',data:{source_record_id:'i1'}}]),false,'source record linkage satisfies the presence requirement');
assert(app.includes('seriousCaseClosureMissingAction(recordId,existingCase,requestedStatus') && app.includes('A major / critical incident or accident cannot be closed until a linked corrective action exists'),'incident / accident save workflow enforces the closure gate');
console.log('SERIOUS CASE CLOSURE LINKAGE: PASSED (7 status/linkage scenarios plus 1 UI guard assertion)');
