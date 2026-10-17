'use strict';
const fs=require('fs'),path=require('path');const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const checks=[
 ['direct CSV import prompts before replacing blank dates with today',/blankDateRows>0\?confirm\(/.test(s)&&/Choose OK to explicitly use today/.test(s)],
 ['declining today fallback skips undated rows with an error reason',/Event date is blank; row skipped because today-date fallback was not approved/.test(s)],
 ['invalid source dates are reported instead of substituted',/Invalid event date: \$\{rawDate\}/.test(s)&&/normalizeImportDate\(rawDate\)/.test(s)],
 ['individual row saves catch returned errors and thrown connection failures',/try\{\s*const \{error\}=await sb\.rpc\('create_hse_record'/.test(s)&&/catch\(e\)\{reject\(e\?\.message\|\|'Network error while saving this row\.'\)\}/.test(s)],
 ['failed rows produce downloadable row-level error CSV',/__source_row/.test(s)&&/__error/.test(s)&&/download\(csv,`\$\{module\}-import-errors-/.test(s)],
 ['imports report created, duplicate and failed row counts',/\$\{ok\} imported, \$\{skipped\} duplicate\(s\) skipped, \$\{fail\} row\(s\) need correction/.test(s)],
 ['duplicate matching detects source and in-file duplicates',/importDuplicate\(model,module,seen\)/.test(s)],
 ['bulk imported permits remain drafts',/module==='permits'\?'draft'/.test(s)],
 ['waste traceability preflight also applies to direct CSV import',/if\(module==='waste'\)\{const blockers=wasteMovementBlockingIssues/.test(s)],
 ['network error after creation avoids claiming rows were rolled back',/successful rows are not automatically rolled back/.test(s)&&/Import completed but records could not be refreshed/.test(s)]
];let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} - ${name}`);if(!ok)failed++}console.log(`V8.10.8 CSV IMPORT RECOVERY: ${checks.length-failed}/${checks.length} passed`);process.exitCode=failed?1:0;
