'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const checks = [
  ['full founder and developer name is used', app.includes('Founder &amp; Developer: <strong>Danish Bilal Shaikh</strong>')],
  ['LinkedIn profile URL is clickable and uses safe external-link attributes', (app.match(/href="https:\/\/www\.linkedin\.com\/in\/odanisho\/" target="_blank" rel="noopener noreferrer"/g) || []).length >= 3],
  ['main application footer exposes the attribution', app.includes('class="site-developer-footer"')],
  ['sidebar credit links to LinkedIn', app.includes('side-footer') && app.includes('Danish Bilal Shaikh · LinkedIn ↗')],
  ['login and access/onboarding screens show founder credit', app.includes('auth-developer-credit') && app.includes('HSE360 onboarding') && app.includes('Founder &amp; Developer: <strong>Danish Bilal Shaikh</strong>')],
  ['mobile footer has responsive styling', css.includes('.site-developer-footer{') && css.includes('.site-developer-footer{gap:6px 12px')],
  ['README documents exact credit and user-provided profile', readme.includes('Founder & Developer: Danish Bilal Shaikh') && readme.includes('https://www.linkedin.com/in/odanisho/')],
];
let failed = 0;
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}`); if (!pass) failed++; }
console.log(`V8.8.10 FOUNDER CREDIT SMOKE: ${failed ? 'FAILED' : 'PASSED'} (${checks.length-failed}/${checks.length})`);
process.exitCode = failed ? 1 : 0;
