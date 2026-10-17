const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const app = fs.readFileSync(__dirname + '/../app.js', 'utf8');

const helperMatch = app.match(/  function inspectionValidationError\(d\)\{[\s\S]*?\n  \}/);
assert(helperMatch, 'pure inspection validator must exist');
const validationContext = {};
vm.runInNewContext(`${helperMatch[0]}; this.inspectionValidationError=inspectionValidationError;`, validationContext);
const validate = validationContext.inspectionValidationError;

assert(validate({inspection_result:'Select result',findings:'0',follow_up_required:'No'}).field === 'inspection_result', 'outcome must be explicitly selected');
assert(validate({inspection_result:'Pass',findings:'0',follow_up_required:'No'}) === null, 'clean pass with zero findings may be saved');
assert(validate({inspection_result:'Pass',findings:'1',follow_up_required:'Yes',failed_items:'broken guard',immediate_controls:'line stopped'})?.field === 'inspection_result', 'Pass must not contradict findings');
assert(validate({inspection_result:'Fail',findings:'0',follow_up_required:'Yes',failed_items:'broken guard',immediate_controls:'line stopped'})?.field === 'findings', 'failed outcome requires at least one finding');
assert(validate({inspection_result:'Fail',findings:'1',follow_up_required:'No',failed_items:'broken guard',immediate_controls:'line stopped'})?.field === 'follow_up_required', 'failed inspection requires follow-up flag');
assert(validate({inspection_result:'Fail',findings:'1',follow_up_required:'Yes',failed_items:'',immediate_controls:'line stopped'})?.field === 'failed_items', 'finding text is required');
assert(validate({inspection_result:'Fail',findings:'1',follow_up_required:'Yes',failed_items:'broken guard',immediate_controls:''})?.field === 'immediate_controls', 'immediate controls are required');
assert(validate({inspection_result:'Not completed',findings:'0',follow_up_required:'No',inspection_notes:''})?.field === 'inspection_notes', 'incomplete inspection requires a reason');
assert(validate({inspection_result:'Not completed',findings:'0',follow_up_required:'No',inspection_notes:'Area inaccessible'}) === null, 'incomplete inspection with reason may be recorded');
assert(validate({inspection_result:'Fail',findings:'1.5',follow_up_required:'Yes',failed_items:'broken guard',immediate_controls:'line stopped'})?.field === 'findings', 'finding count must be an integer');
assert(validate({inspection_result:'Unknown',findings:'0',follow_up_required:'No'})?.field === 'inspection_result', 'unrecognized result must be rejected');
assert(app.includes("x.module==='actions'&&(x.data?.source_record_id===r.id||x.data?.related_reference===r.reference_no)"), 'source detail must find actions by ID or reference');
assert(app.includes("source.module==='inspections'?[sd.failed_items?`Required corrective measure for failed item(s): ${sd.failed_items}`"), 'inspection findings should prefill the linked action with a permanent correction prompt');
assert(app.includes('const duplicate=state.records.find('), 'same-source active duplicate guard should be present');
console.log('INSPECTION WORKFLOW SMOKE: PASSED (4 source guards plus 11 validation scenarios)');
