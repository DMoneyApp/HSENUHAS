# NUHAS HSE360 — Real Workflow Priorities

This roadmap prioritizes daily HSE value over adding more disconnected screens. The app must be evaluated by whether records are captured once, assigned, acted on, verified and reusable as audit evidence.

## Implemented in this local V8.8.0 release

- **Source-to-CAPA link:** create a corrective action directly from supported observation, incident, near-miss, inspection, audit, NCR, risk, permit and selected operational records.
- **Accountability fields:** action description, responsible person, due date, priority and effectiveness-check prompt are required/available.
- **Traceability:** source record reference and ID are stored with the action; the source detail view lists linked actions.
- **Permission gate:** the UI checks the current user's `actions.create` permission; record creation uses the existing audited tenant-aware RPC. Backend policy still requires live verification.
- **Existing certificate reader:** PDF text extraction/OCR suggestion remains review-before-save; source PDF is not yet retained by that feature.

## Recommended implementation order

### P0 — Prove the platform works securely
1. Reconcile the release package with actual GitHub `main`, live Pages files and live Supabase migrations. The repository currently shows 9 commits and includes `supabase/`, `qa/`, and `templates/`; the Pages page did not expose readable content through the current inspection. Local network access to `github.com` is unavailable to this coding workspace, so no push or repository checkout was performed.
2. Run authenticated smoke tests in a non-production/test organization for sign-in, create/read/update, permissions, company switching, attachment upload/download and recovery.
3. Verify company isolation with two test organizations and users; confirm no cross-tenant read/write via direct API calls, not only hidden buttons.
4. Inspect the live Storage bucket and RLS policies before changing them. Do not run migration SQL until a current schema export and backup are available.

### P1 — Daily HSE operating loop
1. Complete observation/inspection/incident → corrective action → owner/due date → evidence → effectiveness verification → closure. Add explicit verification result and verifier/time before allowing verified closure.
2. Make the action register a genuine work queue: overdue, due soon, unassigned, critical, by department/owner; one-click open source record; filter/export; clear aging calculations.
3. Certificate, permit, NOC, statutory inspection, operator competency and training records should share a document/validity model: secure source file, issuer/reference, issue/expiry, owner, review status, reminders (e.g. 90/60/30/7 days), renewal history and superseded-file handling. OCR is a suggestion only; human confirmation is required.
4. Make permit lifecycle explicit: draft → submitted → authorised by an approved role → active → suspended/handed over → closed; enforce safety fields and validity server-side, and alert on overlapping high-risk work. A draft is never work authorisation.
5. Standardize inspection schedules and checklist versions, allow mobile photo capture, create linked actions for failed items, and record who performed/verified the check.

### P2 — Connected compliance evidence
1. Training matrix derived from people, role/competency requirements and certificates; due/expired workers visible to supervisors.
2. Chemical/SDS register with hazard classification, incompatibility notes, storage location, quantity, SDS revision and review date. Never infer compatibility as an AI decision without expert confirmation.
3. Equipment register connecting asset ID, statutory certificates, maintenance, inspection findings, permits and competent operators.
4. Audit plans mapped to controlled clauses/requirements; findings create linked actions; closure includes objective evidence and effectiveness check.
5. Controlled document lifecycle: revision, owner, approver, effective date, review date, superseded versions and acknowledgement where needed.

### P3 — Useful intelligence after data quality is proven
1. Dashboard KPIs must show the data coverage and source definition, link to the filtered register, and distinguish zero from missing/unrecorded data.
2. Trend near misses, repeat findings, overdue actions and high-potential events; do not label this predictive AI without validated evidence.
3. Optional AI assistant may summarize uploaded documents, draft reports and suggest fields/controls. Keep AI output visibly unverified, require human review, protect tenant boundaries and document provider retention/costs. No model should authorise permits, certify compliance or close actions automatically.
4. Offline drafts only after conflict-aware sync, audit trail and retry behaviour are tested.

## Non-goals / anti-filler rules
- No fake/sample records in operational views.
- No KPI cards without reliable source data and drill-through.
- No AI badge unless a real configured model/engine is used.
- No button without a complete action, permission check, error state and test.
- No claim of ISO/ADOSH compliance based solely on software features. Requirements must be checked against current authoritative UAE/company sources and the applicable scope.

## External design references reviewed
- EHS Insight, *Key Features to Look for in EHS Software* (2026): https://www.ehsinsight.com/blog/key-features-to-look-for-in-ehs-software
- UK HSE, *Health and safety management systems*: https://www.hse.gov.uk/managing/management-system/
- ISO, *ISO 45001 occupational health and safety management systems*: https://www.iso.org/cms/%20render/live/en/sites/isoorg/contents/data/standard/06/37/63787.html

These references inform feature priorities only; they do not establish NUHAS's legal compliance.

## V8.10.3 workflow completion update — 13 October 2026

- Added a configured role/course matrix to competency records using separate `Employee Evidence` and `Role Requirement` purposes. Course codes and employee codes are explicit; duplicate/incomplete requirements are excluded from matching and surfaced for correction. Conditional requirements are not counted as mandatory gaps. Expiry is derived only when a refresh interval was supplied in an approved requirement.
- Added audit review for findings with no linked corrective action and a frontend gate preventing new closure of major/critical incidents or accidents without an actual linked action.
- Waste collection/transfer/disposal now has a shared front-end traceability preflight used by form submission and CSV imports; unfinished movements can remain Draft.
- All 37 local QA scripts pass. These guards do not substitute for server-side controls or competent HSE approval. Per user direction, Supabase work is deferred; no configuration/database/production changes or GitHub deployment occurred.
