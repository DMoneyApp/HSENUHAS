const fs=require('fs');const assert=require('assert');const vm=require('vm');
const app=fs.readFileSync(__dirname+'/../app.js','utf8');
function getFunction(name){const m=app.match(new RegExp(`^  function ${name}\\([^\\n]*\\)\\{[\\s\\S]*?^  \\}`,'m'));assert(m,`function ${name} should exist`);return m[0]}
const names=['permitOverlapPairs','permitOverlapRecordIds','recordQualityMatches'];
const source=names.map(getFunction).join('\n')+'\nthis.api={permitOverlapPairs,permitOverlapRecordIds,recordQualityMatches};';
const records=[
 {id:'hot1',module:'permits',status:'approved',location:'Rod Area',data:{permit_type:'hot_work',valid_from:'2026-10-13T08:00',valid_until:'2026-10-13T12:00'}},
 {id:'critical1',module:'permits',status:'open',location:' rod   area ',data:{permit_type:'critical_work',critical_type:'lifting',valid_from:'2026-10-13T10:00',valid_until:'2026-10-13T14:00'}},
 {id:'gen2',module:'permits',status:'in_progress',location:'Rod Area',data:{permit_type:'general_work',valid_from:'2026-10-13T11:00',valid_until:'2026-10-13T13:00'}},
 {id:'other',module:'permits',status:'approved',location:'Chemical Store',data:{permit_type:'hot_work',valid_from:'2026-10-13T09:00',valid_until:'2026-10-13T17:00'}},
 {id:'touching',module:'permits',status:'approved',location:'Rod Area',data:{permit_type:'critical_work',valid_from:'2026-10-13T14:00',valid_until:'2026-10-13T16:00'}},
 {id:'draft',module:'permits',status:'draft',location:'Rod Area',data:{permit_type:'hot_work',valid_from:'2026-10-13T09:00',valid_until:'2026-10-13T17:00'}},
 {id:'missingLocation',module:'permits',status:'approved',data:{permit_type:'critical_work',valid_from:'2026-10-13T09:00',valid_until:'2026-10-13T17:00'}}
];
const context={state:{records},today:()=> '2026-10-13'};vm.runInNewContext(source,context);const api=context.api;
const pairs=api.permitOverlapPairs(records);
assert.strictEqual(pairs.length,3,'hot/critical overlap pairs include active higher-risk permit against another active permit in same location');
assert(pairs.some(p=>p.a.id==='hot1'&&p.b.id==='critical1'||p.a.id==='critical1'&&p.b.id==='hot1'));
assert(pairs.some(p=>p.a.id==='critical1'&&p.b.id==='gen2'||p.a.id==='gen2'&&p.b.id==='critical1'));
assert(!pairs.some(p=>p.a.id==='hot1'&&p.b.id==='touching'||p.a.id==='touching'&&p.b.id==='hot1'),'touching boundaries are not a time overlap');
assert(!pairs.some(p=>p.a.id==='other'||p.b.id==='other'),'different locations are ignored');
assert(!pairs.some(p=>p.a.id==='draft'||p.b.id==='draft'),'drafts are not treated as live permits');
assert(!pairs.some(p=>p.a.id==='missingLocation'||p.b.id==='missingLocation'),'no inferred location is used');
const ids=api.permitOverlapRecordIds(records);assert(ids.has('hot1')&&ids.has('critical1')&&ids.has('gen2'));assert(!ids.has('other')&&!ids.has('draft'));
assert.strictEqual(api.recordQualityMatches('permits',records[0],'permit_overlap_review'),true,'overlap filter is wired to the affected active records');
assert.strictEqual(api.recordQualityMatches('permits',records[3],'permit_overlap_review'),false);
assert(app.includes("action('Potential overlapping hot / critical work'"),'permit overlap review is visible in permit quality panel');
console.log('PERMIT OVERLAP REVIEW SMOKE: PASSED (11 logic scenarios plus 2 wiring assertions)');
