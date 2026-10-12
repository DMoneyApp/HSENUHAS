# NUHAS HSE360 — Working Master Checkpoint

Checkpoint: 12 October 2026, V8.8.5 local candidate.

## Source tree
Current working directory: `/mnt/data/hse360_v883_work`. It was extracted from the last packaged cumulative release candidate `NUHAS-HSE360-V8.8.3-CONSOLIDATED-PACKAGE.zip` and amended in place. This folder is the cumulative local worktree for this development session. No GitHub push or production database change has occurred.

## V8.8.4 implementation added
- Certificate review UI has a Previous certificate selector, populated from the active company's loaded Licences & Certificates records.
- The save path normalizes certificate key fields and checks for duplicates before uploading a PDF. A detected duplicate stops upload and offers to open the existing record. The logic considers number, issuer and expiry; it falls back to title/issuer/validity if either side lacks a number. Different expiry dates may represent legitimate renewal.
- Renewal record JSON includes `renewal_of_record_id`, `renewal_of_reference`, `renewal_record_type`, and existing `related_reference`.
- Record details show predecessor and successor records. Register summary shows renewal reference and expiry.
- `supabase/v8.8.4-certificate-duplicate-guard.sql` adds a transactional preflight plus tenant-scoped partial unique indexes; it is only a candidate. It stops when matching legacy duplicates are found; it does not delete data. It supports an identity fallback to issue date when expiry is missing.
- Added `qa/certificate-renewal-workflow.js` and `qa/certificate-duplicate-sql-static-smoke.js`, and added them to static smoke requirements.

## Current verification
- `node --check app.js`: PASS.
- All 15 QA scripts in `qa/*.js`: PASS in local Node runtime. The new certificate renewal workflow test now contains 24 deterministic/static assertions; the SQL duplicate guard test contains 13 static assertions.
- `pglast` and `psql` were not available, so the SQL candidate was only static-checked; no database parsing/execution or Supabase test occurred.
- Headless Chromium and authenticated browser runtime have not passed; a previous Chromium attempt timed out.
- The SHA-256 manifest must be regenerated after any code or documentation change; it is not a server deployment status indicator.

## Next priorities
1. Run the V8.8.4 migration on a fresh/restored non-production database that matches the actual target schema; fix parser/runtime issues discovered.
2. Test unique-index behavior: cross-tenant identical certificates allowed; within one tenant identical number+issuer+expiry prevented; same number with a distinct expiry allowed; missing-number title fallback; missing-expiry issue-date identity; legacy duplicate preflight abort.
3. Verify renewal chain links in browser detail screens and validate selected predecessor is in the active company record list.
4. Continue integration work on upload/download permissions, permit backend rules, closure/duplicate action guards, and authenticated CRUD.
5. Only make one final consolidated release ZIP when requested / when the feature set is ready; no patch ZIPs.


## V8.8.5 compliance renewal reminders
- Exact 90-day horizon and 90/60/30/7-day alert bands; expiry today and overdue statuses.
- ISO date validation uses UTC day difference; impossible/ambiguous expiry values are surfaced as invalid rather than silently ignored.
- `Valid`/`Compliant` do not hide a future expiry; explicitly `Renewed`, `Closed` and `Not in use` statuses are suppressed, and superseded certificate predecessors are excluded.
- Dashboard shows overdue, due in 7 days, due 8–90 days and invalid expiry counts; notification descriptions include expiry date, days and owner when available.
- `qa/compliance-renewal-reminders.js` added; all 16 local QA scripts pass. Notifications remain in-app only; no scheduled background email/push is configured.
