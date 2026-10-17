const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8');
const css = fs.readFileSync(require('path').join(__dirname, '..', 'styles.css'), 'utf8');
const checks = [
  ['mobile search toggle is rendered with an accessible name', /id="mobile-search-toggle"[^>]*aria-label="Open global search"/.test(app)],
  ['mobile search control reports expanded state', /mobileSearchToggle\?\.setAttribute\('aria-expanded',open\?'true':'false'\)/.test(app)],
  ['mobile search accessible name changes while open', /mobileSearchToggle\?\.setAttribute\('aria-label',open\?'Close global search':'Open global search'\)/.test(app)],
  ['activating mobile search focuses the search field', /if\(open\)\{setTimeout\(\(\)=>document\.getElementById\('global-search'\)\?\.focus\(\),0\)\}/.test(app)],
  ['search is dismissible with Escape without stealing desktop focus', /else if\(e\.key==='Escape'\)\{if\(!list\?\.hidden\)closeResults\(\);else if\(topbar\?\.classList\.contains\('mobile-search-open'\)\)\{setMobileSearchOpen\(false\);mobileSearchToggle\?\.focus\(\)\}return\}/.test(app)],
  ['mobile search closes after outside click', /topbar\?\.classList\.contains\('mobile-search-open'\).*setMobileSearchOpen\(false\)/.test(app)],
  ['mobile search closes after choosing a record', /syncSearchControls\(\);setMobileSearchOpen\(false\);detail\(id\)/.test(app)],
  ['clear-search control resets the state query', /clearSearch\?\.addEventListener\('click',\(\)=>\{gs\.value='';state\.query='';closeResults\(\);syncSearchControls\(\);gs\.focus\(\)\}\)/.test(app)],
  ['enter without matches no longer navigates to an unrelated module', /else if\(e\.key==='Enter'&&gs\.value\.trim\(\)\)\{e\.preventDefault\(\);return\}/.test(app) && !/else if\(e\.key==='Enter'&&gs\.value\.trim\(\)\)\{e\.preventDefault\(\);state\.query=gs\.value\.trim\(\);closeResults\(\);go\('observations'\);return\}/.test(app)],
  ['mobile search UI only activates at narrow breakpoint', /@media\(max-width:560px\)\{\s*\.mobile-search-toggle\{display:grid\}/.test(css)],
  ['search panel uses safe small-screen sizing and dynamic viewport height', /max-height:calc\(100dvh - 140px\)/.test(css)],
  ['dark theme uses the existing surface tokens rather than hardcoded light styles', /\.topbar\.mobile-search-open \.top-search\{[^}]*background:var\(--surface\)/.test(css)],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
console.log(`${checks.filter(x => x[1]).length}/${checks.length} mobile search checks passed`);
if (checks.some(x => !x[1])) process.exitCode = 1;
