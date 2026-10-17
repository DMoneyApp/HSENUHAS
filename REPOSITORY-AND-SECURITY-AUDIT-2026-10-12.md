# NUHAS HSE360 — Repository and Security Audit Checkpoint

Date: 2026-10-12
Baseline inspected: uploaded V8.8.8 cumulative ZIP; current local cumulative candidate V8.10.0 (cumulative through V8.8.9 and V8.9.0). Remote checks are read-only; no repository write or deployment was performed.

## Access and provenance
- The local archive extracts and passes ZIP integrity checks.
- An initial direct `git ls-remote` attempt could not resolve GitHub, but a later public repository web view was accessible and showed `main` metadata/source at V8.8.5. Its `VERSION.txt` explicitly labels that branch as local/not live-verified. The deployed Pages content was not readable through the inspection view, so the exact deployed commit remains unverified. Local V8.8.10 has not been pushed.
- The frontend is a single-page HTML/CSS/JavaScript application (`index.html`, `styles.css`, `app.js`) with Supabase JS loaded from a pinned CDN and public project configuration in `config.js`.
- `config.js` contains a Supabase publishable/anon key, not a service-role key. It is designed to be public; actual security depends on RLS and RPC enforcement.

## Local code findings
- `app.js` includes Supabase Auth login through `login_with_username`, sign-up, recovery, organization create/join, record CRUD through RPCs, company switching, audit-log display, and browser-persistent notification fallback.
- SQL files define a multi-tenant model, RLS policies, organization membership functions, audited HSE record RPCs, private `hse-attachments` storage, and candidate CAPA/permit/certificate triggers.
- Historical README/version headings were stale in earlier snapshots. The current local README and VERSION.txt identify the V8.10.0 cumulative candidate.
- Password recovery previously displayed a distinct message when an email was not registered, enabling account/recovery-email enumeration. V8.8.8 now returns a generic user-facing result and only calls Supabase reset email when `recovery_email_registered` confirms a match. This reduces UI disclosure but does not remove timing-side channels or prove the RPC is safe against abuse.

## Security items requiring staging/live verification
- Confirm the deployed SQL schema matches all RPCs used by the current frontend.
- Inspect every `SECURITY DEFINER` function's ownership, grants, `search_path`, caller authorization and tenant scope. Some older migrations use `set search_path=public`; do not assume all deployed functions match the newer hardened candidates.
- Verify `recovery_email_registered` authorization, rate limiting, and behavior against unauthenticated direct RPC calls. The generic UI response is not a substitute for backend rate limiting.
- Test company isolation using two real test tenants and direct API calls.
- Test Storage read/write/delete policies with member, non-member, uploader and administrator identities.
- Apply the candidate CAPA, linked-action, permit and certificate uniqueness migrations only after schema reconciliation and staging tests.
- Run authenticated browser flows. Prior headless Chromium attempt timed out; browser end-to-end is not passed.

## Scope gaps against the master brief
The existing app has many modules represented in a shared record engine, but the presence of a module or navigation item does not prove the full business workflow is implemented. Still to verify/complete include JSA template library/version approval; all three permit categories and their critical subtype-specific controls; accurate period-filtered dashboard analytics and KPI definitions; controlled PDF/print report templates; complete training/competency matrix; scheduled background reminders; DOCX/XLSX/PDF/CSV/TXT import coverage and per-format tests; robust cross-device offline synchronization/conflict handling (V8.10.0 adds session-only same-tab drafts, not full offline mode); and full mobile/browser acceptance tests.

## Test results for this checkpoint
- `node --check app.js`: PASS on the final local candidate.
- All 23 `qa/*.js` scripts: PASS on the V8.10.0 candidate; see `V8.10.0-LOCAL-QA-REPORT.md`.
- Tests are mostly deterministic helper and static source checks. They are not authenticated integration, live Supabase, cross-tenant, or browser E2E tests.

## Deployment boundary
No GitHub push, live Supabase migration, data reset, or production data modification was performed.

## V8.8.9 local checkpoint addendum
- Local frontend now has defensive logo image validation and cleanup attempt if the organization update fails; this does not establish that live bucket policies or profile saving work.
- JSA multi-select is a frontend starter library and must not be treated as an approved site-specific risk assessment.
- Permit drafts may remain incomplete, but the client still applies checks before approval. Backend authorization and lifecycle enforcement require direct RPC/integration testing; client-side checks alone are not a security boundary.
- Report metadata fields and print disclaimers improve document control but do not constitute formal approval, a validated controlled-document process, or evidence of ISO conformity by themselves.

## V8.8.10 reconciliation note

GitHub main identifies as V8.8.5 while the current local cumulative release is V8.8.10. The live Pages source could not be confirmed, and no GitHub write/deployment or production database mutation was performed. Local changes remain unshipped.


## V8.10.0 field-continuity addendum

- Added session-only, user/company-scoped form draft recovery. It does not store attachments, sync across devices, or provide a server-side authoritative draft. Session storage is not encrypted; use on trusted devices only.
- Added weekly and monthly fire-equipment checklist starters. New status controls default to “Select result”; failure cases require follow-up and remarks before a non-draft checklist can be submitted.
- Added `PRODUCT-ADVANCEMENTS-10.md` documenting ten cumulative product patterns and source references.
- Browser E2E could not be completed: this environment blocked both loopback HTTP and local-file Chromium navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore, no browser workflow is reported as passed.
