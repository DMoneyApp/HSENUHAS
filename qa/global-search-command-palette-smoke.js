const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8');
const css = fs.readFileSync(require('path').join(__dirname, '..', 'styles.css'), 'utf8');
const checks = [
  ['global search has accessible combobox semantics', /setAttribute\('role','combobox'\)/.test(app) && /aria-autocomplete','list'/.test(app)],
  ['search results use listbox and option semantics', /role=\\?"listbox\\?"/.test(app) && /role=\\?"option\\?"/.test(app)],
  ['search spans loaded records rather than one hardcoded module', /state\.records\.filter\(r=>can\(r\.module,'view',r\)/.test(app)],
  ['search respects module view permissions', /state\.records\.filter\(r=>can\(r\.module,'view',r\)/.test(app)],
  ['search matches references and record fields', /r\.reference_no,r\.summary,r\.location,r\.department,r\.created_by_name,r\.status,r\.module,JSON\.stringify\(r\.data\|\|\{\}\)/.test(app)],
  ['search result count is capped', /\.slice\(0,8\)/.test(app)],
  ['keyboard supports arrows, enter and escape', /e\.key==='ArrowDown'/.test(app) && /e\.key==='ArrowUp'/.test(app) && /e\.key==='Escape'/.test(app) && /e\.key==='Enter'/.test(app)],
  ['search result opens the selected record detail', /detail\(id\)/.test(app) && /data-search-result/.test(app)],
  ['search overlay is styled for dark mode and mobile', /\.global-search-results/.test(css) && /data-theme="dark"\] \.global-search-results/.test(css) && /@media\(max-width:560px\)\{\.global-search-results/.test(css)],
  ['search overlay closes on outside click', /document\.addEventListener\('click',e=>\{if\(!wrap\?\.contains\(e\.target\)\)closeResults\(\);if\(topbar\?\.classList\.contains\('mobile-search-open'\).*setMobileSearchOpen\(false\)\}/.test(app)]
];
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); if (!pass) process.exitCode = 1; }
console.log(`${checks.filter(x=>x[1]).length}/${checks.length} global search checks passed`);
