const fs=require('fs');const path=require('path');const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const checks=[
['record attachment upload and RPC are inside a try/catch recovery boundary',/try\{[\s\S]{0,2600}catch\(saveError\)/.test(app)],
['save failure leaves the form open for retry',/Save failed\. Your form remains open so you can retry\./.test(app)],
['save failure restores the save button',/const restoreSaveButton=\(\)=>\{if\(btn\)\{btn\.disabled=false;btn\.textContent=recordId\?'Save changes':'Save '\+m\.singular\}\}/.test(app)],
['uploaded attachment cleanup is attempted after failed save',/const cleanupFailedUpload=async\(\)=>\{if\(!uploadedPath\)return true;try\{const result=await sb\.storage\.from\('hse-attachments'\)\.remove\(\[uploadedPath\]\)/.test(app)],
['cleanup failure is explicitly disclosed to the operator',/uploaded attachment could not be removed automatically; check storage before retrying/.test(app)],
['existing attachment is preserved when no replacement is selected',/if\(recordId&&!file\)attachment=state\.records\.find\(r=>r\.id===recordId\)\?\.attachment\|\|null/.test(app)],
['record loading resets spinner state in finally',/async function loadRecords\(\)[\s\S]{0,1200}finally\{state\.loading=false;\}/.test(app)],
['thrown record-load failures show actionable retry message',/Could not load records\. Check your connection and retry\./.test(app)],
['auth session bootstrap handles thrown network failures',/catch\(sessionError\)[\s\S]{0,250}Unable to connect to the sign-in service/.test(app)],
['auth state transition errors return to a usable sign-in screen',/catch\(authStateError\)[\s\S]{0,250}Unable to open your workspace/.test(app)],
['Supabase schema and RPC names are unchanged',/create_hse_record[\s\S]*update_hse_record/.test(app)],
['no new SQL migration or production configuration added in this increment',!fs.existsSync(path.join(__dirname,'..','supabase','migrations','v8107'))]
];let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}console.log(`${checks.length-failed}/${checks.length} V8.10.7 network resilience checks passed`);process.exit(failed?1:0);
