const fs=require('fs'),path=require('path');const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const tests=[
['register export flattens every module-specific data field',/Object\.entries\(r\.data\|\|\{\}\)\.forEach\(\(\[k,v\]\)=>\{row\[`data\.\$\{k\}`\]=/.test(app)],
['register export preserves common record identifiers and timestamps',/\['id','reference_no','event_date','status','department','location','summary','created_by_name','created_at','updated_at'\]/.test(app)],
['all-record export includes module labels and detailed fields',/function exportAll\(\)\{const rows=filteredRecords\(\);exportRowsCSV\(rows,[\s\S]{0,160}true\)/.test(app)],
['period report CSV includes report number and revision',/report_number:document\.getElementById\('report-number'\)\.value\.trim\(\),revision:document\.getElementById\('report-revision'\)\.value\.trim\(\)/.test(app)],
['period report CSV includes issue date and reporting range',/issue_date:document\.getElementById\('report-issue'\)\.value,reporting_from:x\.f,reporting_to:x\.t/.test(app)],
['period report CSV includes prepared reviewed approved metadata',/prepared_by:document\.getElementById\('report-prepared'\)[\s\S]{0,220}reviewed_by:[\s\S]{0,150}approved_by:/.test(app)],
['all exports share the formula-safe CSV cell encoder',/keys\.map\(csvCell\)\.join\(','\),\.\.\.flattened\.map\(r=>keys\.map\(k=>csvCell/.test(app)],
['nested module-specific objects are retained as JSON strings',/v&&typeof v==='object'\?JSON\.stringify\(v\):v/.test(app)],
['attachment metadata is exported when present',/attachment\.name|attachment\.size_bytes/.test(app)],
['legacy CSV export functions were replaced by the common exporter',/function exportRowsCSV\(/.test(app)&&!/function exportCSV\(module\)\{let rows=filteredRecords\(module\);.*const keys=\['reference_no','event_date'/.test(app)]
];let fail=0;for(const [name,ok] of tests){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++}console.log(`${tests.length-fail}/${tests.length} export completeness checks passed`);process.exit(fail?1:0);
