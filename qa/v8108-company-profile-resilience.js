'use strict';
const fs=require('fs'),path=require('path');const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=s.indexOf('  async function saveOrganization(){'),end=s.indexOf('\n  function renderPage()',start),fn=s.slice(start,end);
const checks=[
 ['company profile refuses a blank company name',/if\(!name\)\{toast\('Company name is required\.'/ .test(fn)],
 ['logo validation occurs before upload and allows PNG JPG WEBP up to 2 MB',/file\.type\)\|\|file\.size<=0\|\|file\.size>2\*1024\*1024/.test(fn)],
 ['organization save and storage work are inside a try/catch/finally',/try\{[\s\S]*admin_update_organization[\s\S]*catch\(error\)[\s\S]*finally\{restoreButton\(\)\}/.test(fn)],
 ['network/save failures clean up unlinked logo file on best-effort basis',/if\(uploadedPath&&!profileSaved\)[\s\S]*remove\(\[uploadedPath\]\)/.test(fn)],
 ['previous logo remains active when the profile save fails',/state\.activeOrg=\{\.\.\.state\.activeOrg,logo_url:previousLogo\}/.test(fn)],
 ['profile save distinguishes saved profile from failed refresh',/Company profile was saved, but the workspace could not refresh/.test(fn)],
 ['save button always recovers when still present',/finally\{restoreButton\(\)\}/.test(fn)&&/button\.disabled=false/.test(fn)]
];let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} - ${n}`);if(!ok)fail++}console.log(`V8.10.8 PROFILE RESILIENCE: ${checks.length-fail}/${checks.length} passed`);process.exitCode=fail?1:0;
