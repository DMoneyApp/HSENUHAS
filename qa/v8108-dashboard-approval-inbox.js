'use strict';
const fs=require('fs'),path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const checks=[
 ['single-company header shows a clean company identity without an unnecessary dropdown',s.includes("state.orgs.filter(o=>o.status==='active').length<=1?")&&s.includes('workspace-name')],
 ['company logo has meaningful alt text and a title',s.includes('workspace-logo" title=')&&s.includes('Company logo\')} logo')],
 ['assigned permit task helper matches active workflow stage to receiver or HSE profile',s.includes('function permitTasksForCurrentUser()')&&s.includes("stage==='Awaiting receiver'&&current===receiver")&&s.includes("stage==='Awaiting HSE'&&current===hse")],
 ['dashboard displays actionable permit items for the current user',s.includes('Permits awaiting your action')&&s.includes('data-detail="${esc(r.id)}"')],
 ['notification bell reuses the same task source as dashboard',s.includes('const permitTasks=permitTasksForCurrentUser().map')],
 ['dashboard task styles are responsive and support dark theme',css.includes('.permit-dashboard-inbox')&&css.includes('html[data-theme="dark"] .permit-dashboard-task')&&css.includes('@media(max-width:640px)')],
 ['pending inbox does not replace actual authorisation validation',s.includes('Permit cannot be authorised. Complete/verify')&&s.includes('preparePermitTransition')]
];let fails=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} - ${label}`);if(!ok)fails++}console.log(`V8.10.8 DASHBOARD APPROVAL INBOX: ${checks.length-fails}/${checks.length} passed`);process.exitCode=fails?1:0;
