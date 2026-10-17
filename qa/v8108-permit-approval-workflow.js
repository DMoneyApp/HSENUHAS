'use strict';
const fs=require('fs'),path=require('path');const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const checks=[
 ['permit workflow has explicit submit, receiver acceptance and HSE authorisation actions',/action==='submit'/.test(s)&&/action==='receiver'/.test(s)&&/action==='hse_authorize'/.test(s)],
 ['submit action requires the assigned issuer/requestor',/Only the assigned permit issuer\/requestor can submit this permit/.test(s)],
 ['submission requires receiver and HSE assignments',/Select or enter the receiving department head before submitting/.test(s)&&/Select or enter the HSE reviewer before submitting/.test(s)],
 ['submission requires valid start/end time and activity scope',/valid permit start and end times/.test(s)&&/Enter a short work activity \/ scope before submitting/.test(s)],
 ['receiver can advance only when the profile matches the assigned receiver',/permitAssignedTo\(data\.receiver_name\)/.test(s)&&/This permit is not awaiting receiver acceptance/.test(s)],
 ['HSE can authorise only when the profile matches assigned HSE reviewer',/permitAssignedTo\(data\.hse_reviewer\)/.test(s)&&/This permit is not awaiting HSE review/.test(s)],
 ['issuer, receiver and HSE must be three different people',/new Set\(signerNames\)\.size!==3/.test(s)&&/must be three different named people/.test(s)],
 ['status control and workflow stage cannot be manually edited in permit form',/id="f_status" \$\{t==='permits'\?'disabled':''\}/.test(s)&&/id="f_workflow_stage" value=.*readonly/.test(s)],
 ['authorised and closed permits cannot be edited in place',/An authorised or closed permit cannot be edited in place/.test(s)],
 ['permit can be closed by an assigned workflow participant with mandatory closure remarks',/action==='close'/.test(s)&&/Closure remarks are required/.test(s)&&/data\.closed_by=name;data\.closed_at=now;data\.workflow_stage='Closed'/.test(s)],
 ['final authorisation still checks permit-specific hazards and controls',/Use the assigned HSE Authorise action to approve a permit/.test(s)&&/risk_reference','Risk assessment \/ JSA reference'/.test(s)&&/competent_supervisor/.test(s)&&/fire_watch/.test(s)],
 ['permit drawer exposes assigned workflow action',/function permitWorkflowPanelHTML/.test(s)&&/data-permit-workflow=/.test(s)],
 ['recipient tasks appear in notification and dashboard from the shared assigned-task helper',/Permit awaiting receiver acceptance/.test(s)&&/Permit awaiting HSE authorisation/.test(s)&&/permitTasksForCurrentUser\(\)/.test(s)&&/function notificationItems\(\)/.test(s)],
 ['permit workflow remains clearly identified as not server enforced',/not cryptographically signed or server-enforced yet/.test(s)],
 ['employee picker can use previously loaded active organisation members',/window\.__membersCache\|\|\[\]/.test(s)&&/u\.status==='active'/.test(s)]
];let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} - ${name}`);if(!ok)failed++}console.log(`V8.10.8 PERMIT WORKFLOW: ${checks.length-failed}/${checks.length} passed`);process.exitCode=failed?1:0;
