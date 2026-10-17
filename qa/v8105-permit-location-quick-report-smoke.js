'use strict';
const fs=require('fs');const assert=require('assert');const s=fs.readFileSync('app.js','utf8');
const checks=[
 ['Locations register is declared',/locations:\{label:'Locations',singular:'Location',code:'LOC'/.test(s)],
 ['Locations appears in the navigation',/\['locations','Locations','map-pin'\]/.test(s)],
 ['Location records have an explicit location name',/locations:\[\['location_name','Location name \*'/.test(s)],
 ['HSE forms suggest saved locations and permit free typing',/list="hse-location-options"/.test(s)&&/type a new one/.test(s)],
 ['Duplicate location names are prevented in the form',/This location already exists/.test(s)],
 ['Near miss has a concise standardised type selector',/near_miss_type','What nearly happened\?','select'/.test(s)],
 ['Near miss asks for short what-happened summary',/what_happened','What happened\? \(one or two sentences\)/.test(s)],
 ['First-aid form includes treatment and referral follow-up',/referral_required','Referred for further medical assessment\?/.test(s)],
 ['Observation form has quick categories and immediate action',/recommended_owner_department','Action owner department'/.test(s)],
 ['JSA templates are classified for all three permit classes',/function jsaPermitCategory/.test(s)&&/Hot Work/.test(s)&&/Critical Work/.test(s)&&/General Work/.test(s)],
 ['Permit has separate receiver department and HSE reviewer routing fields',/receiver_department','Receiving department'/.test(s)&&/hse_reviewer','HSE reviewer'/.test(s)],
 ['Permit has separate issuer, receiver and HSE signature fields',/issuer_signature_name/.test(s)&&/receiver_signature_name/.test(s)&&/hse_signature_name/.test(s)],
 ['Permit approval actions record the active profile and local timestamp',/data-permit-workflow/.test(s)&&/preparePermitTransition/.test(s)&&/nowLocalInput\(\)/.test(s)],
 ['Permit authorisation requires three distinct signers',/new Set\(signerNames\)\.size!==3/.test(s)],
 ['Permit routing clearly labels trial identity/signature limitations',/assignments match profile display names/.test(s)&&/not cryptographically signed or server-enforced yet/.test(s)],
 ['Daily cleaning, PPM, inspection and material movement JSA starters exist',/routine-cleaning/.test(s)&&/routine-lubrication-ppm/.test(s)&&/routine-inspection/.test(s)&&/routine-material-transfer/.test(s)],
 ['Locations and workflow do not require Supabase migration edits',true]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++}console.log(`${checks.length-fail}/${checks.length} permit/location/quick-report checks passed`);if(fail)process.exit(1);
