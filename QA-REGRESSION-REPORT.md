# HSE360 V8 — Pre-Release QA Report

## Static checks completed in the build workspace
- JavaScript syntax check: `node --check app.js` passed.
- Removed the dashboard month-object rendering defect that produced `[object Object]` labels.
- Removed the old permit-inclusive renewal scanning model from the frontend.
- Added organization-aware record queries to the frontend.
- Added tenant-aware RPC argumenting to all record create/update/delete operations.
- Added organization-scoped attachment paths.
- Added separate permit time-alert logic.
- Added exact three-class PTW model.
- Added role/permission UX for organization admins.
- Added organization switching and create-company workflow.
- Added no-access/pending-access states.
- Added print/PDF record output.
- Added the supplied NUHAS logo to the package.

## Database architecture checked in the migration file
- organization table
- organization settings
- organization memberships
- organization permissions
- organization-scoped reference sequence
- tenant columns on HSE records and audit events
- existing NUHAS data backfill
- active-membership checks
- module permission checks
- RLS on organizations, settings, memberships, HSE records, audit events and profiles
- audited record RPCs
- secure admin password reset integration
- storage policies with organization-prefixed paths

## Important live validation note
Static analysis cannot prove the live Supabase deployment is fully correct. The live regression list in `PRODUCTION-SETUP.md` must be executed against the actual project after the SQL migration and Edge Function deployment.

The package is therefore a production-targeted V8 release candidate, with the live verification step intentionally left explicit rather than claiming a browser/database test that was not executed from this environment.
- Import retry regression: passed; partial row failures now preserve the reviewed draft for correction/retry. The guard is static and does not simulate a live Supabase failure.


## V8.8.4 addendum — certificate renewal

- `qa/certificate-renewal-workflow.js`: deterministic normalized-key matching and predecessor/successor chain checks.
- `qa/certificate-duplicate-sql-static-smoke.js`: static guard for candidate organization-scoped uniqueness indexes and safe migration preflight.
- These are local checks; the SQL candidate has not been run in a real PostgreSQL/Supabase database.


## V8.8.6 addendum — certificate importer quality

- All 16 `qa/*.js` scripts pass after the importer changes.
- The certificate reader smoke tests cover noisy issuer rejection, award-style recipient extraction, PDF text item reflow, UAE day-first dates and OCR confidence/fallback behavior.
- These remain local helper/static checks; no in-browser OCR run against the original file or live storage/database test is claimed. See `V8.8.6-LOCAL-QA-REPORT.md`.

## V8.8.8 checkpoint (2026-10-12)
- Added `qa/password-recovery-privacy-smoke.js` to guard against user-facing recovery-email enumeration.
- All 18 local QA scripts passed and `node --check app.js` passed.
- These checks do not constitute live Supabase, browser E2E, or tenant-isolation testing.

## V8.8.9 usability/reporting checkpoint (2026-10-12)
- `node --check app.js`: PASS.
- All 19 `qa/*.js` scripts passed individually, including `qa/v889-usability-smoke.js` (19 source-level regression guards).
- Added dashboard quick-capture and period presets, controlled report metadata/print output, record document control, fire checklist print layout, notification navigation badges, searchable multi-select JSA starter reuse and draft-first permit entry.
- Live browser, authenticated Supabase, cross-tenant, storage and actual PDF-rendering tests were not run. See `V8.8.9-LOCAL-QA-REPORT.md`.

## V8.8.10 founder attribution checkpoint (2026-10-12)
- Full name `Danish Bilal Shaikh` and title `Founder & Developer` now appear in the main app footer, sidebar, login and workspace-access/onboarding states.
- LinkedIn profile `https://www.linkedin.com/in/odanisho/` is a clickable external link with safe `rel` attributes.
- Static founder-credit smoke test: 7/7 passed; complete QA suite: 20/20 passed; JavaScript syntax passed.
- Not browser-tested or deployed. See `V8.8.10-LOCAL-QA-REPORT.md`.


## V8.10.0 cumulative regression update — 12 October 2026

- `node --check app.js`: PASS.
- `qa/session-draft-recovery-smoke.js`: PASS (8 source assertions).
- `qa/fire-checklist-template-smoke.js`: PASS (8 source assertions).
- Entire `qa/*.js` suite: 23/23 PASS.
- Browser smoke attempt: NOT RUN to completion; Chromium reported `ERR_BLOCKED_BY_ADMINISTRATOR` for localhost and file URLs. It is not counted as passed.
- Live Supabase/database/RLS/Storage, generated PDF visual review and production deployment: NOT RUN.


## V8.10.1 regression update — 13 October 2026

- Added cross-register global search suggestions, permission-filtered at the UI layer, keyboard navigation, outside-click dismissal and dark/responsive styling.
- `qa/global-search-command-palette-smoke.js`: 10/10 checks pass.
- Full cumulative local suite: 24/24 scripts pass.
- Authenticated browser and live Supabase validation remain pending.


## V8.10.2 regression update — 13 October 2026

- Added mobile global-search entry point and clear control where the previous search input was hidden.
- Escape/outside-click/result selection dismiss the mobile search; accessible label/state are kept in sync.
- Pressing Enter for a no-match query no longer opens Observations unexpectedly.
- `qa/global-search-command-palette-smoke.js`: 10/10 PASS.
- `qa/mobile-global-search-smoke.js`: 12/12 PASS.
- Full suite and package integrity results are recorded in `V8.10.2-LOCAL-QA-REPORT.md`.
- Mobile/desktop browser E2E and live Supabase checks remain pending.

## V8.10.3 regression update — 13 October 2026

- `qa/role-training-requirement-matrix.js`: PASS (course/role scope, duplicate definitions, expiry derivation, exact evidence matching and export/wiring guards).
- `qa/audit-action-linkage.js`: PASS (linked/unlinked audit findings and filter wiring).
- `qa/serious-case-closure-linkage.js`: PASS (major/critical case closure requires an actual corrective action, while pre-existing closed cases are not newly blocked).
- `qa/waste-traceability-workflow.js`: PASS (movement date, destination, vendor, evidence, hazardous manifest, storage location, form/import preflight and draft exception).
- Full cumulative `qa/*.js` suite: 37/37 PASS; `node --check app.js`: PASS.
- These results are local deterministic tests. Supabase, RLS/storage, authentication, browser E2E and production deployment remain unverified and unchanged.
