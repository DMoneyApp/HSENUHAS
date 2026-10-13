const fs=require('fs'),path=require('path');const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const checks=[
['blank import dates remain blank unless explicitly opted into today',/const eventDate=rawEventDate\?parsedEventDate:\(importDraft\.useTodayForBlankDates\?today\(\):''\)/.test(app)],
['blank dates are flagged during import review',/if\(!model\._rawEventDate&&!importDraft\.useTodayForBlankDates\)issues\.push/.test(app)],
['review UI exposes explicit today-date opt-in',/id="import-use-today"/.test(app)&&/useTodayForBlankDates=e\.target\.checked/.test(app)],
['workbook import retains all worksheet names',/sheetNames=wb\.SheetNames\|\|\[\]/.test(app)&&/workbookBuffer,sheetNames,selectedSheet/.test(app)],
['workbook preview allows choosing another worksheet',/id="import-sheet"/.test(app)&&/importDraft\.selectedSheet=e\.target\.value/.test(app)],
['generic PDF import attempts browser OCR when text is poor',/if\(certificateTextNeedsOCR\(text\)\)[\s\S]{0,400}ocrPdfPages\(pdf,Math\.min\(10,pdf\.numPages\)/.test(app)],
['OCR output is retained as reviewable extracted text',/headers=\['extracted_text'\];rows=\[\[text\.slice\(0,100000\)\]\]/.test(app)],
['module exports flatten module-specific fields',/Object\.entries\(r\.data\|\|\{\}\)\.forEach/.test(app)],
['report CSV includes document control metadata',/report_number:[\s\S]{0,300}revision:[\s\S]{0,300}issue_date:[\s\S]{0,300}reporting_from:[\s\S]{0,300}prepared_by:/.test(app)],
['formula-injection-safe encoder remains in use',/function csvCell\(v\)[\s\S]{0,450}formulaLike/.test(app)]
];let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++}console.log(`${checks.length-fail}/${checks.length} import/export quality checks passed`);process.exit(fail?1:0);
