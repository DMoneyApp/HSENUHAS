## V8.3 HOTFIX
- Run `supabase/v8.3-hotfix.sql` once after V8.2.
- This fixes registration database errors caused by the legacy profile email requirement, adds a separate optional recovery email, prevents duplicate usernames, restricts self-service password recovery to registered recovery emails, and improves dynamic modal close/cancel handling.

# HSE360 Platform — V8 Final Architecture

## What this release is
V8 is the multi-organization foundation and production-oriented frontend for the HSE360 platform discussed for **Emirates National Copper Factory – NUHAS**.

It is designed around one HSE360 application with isolated company workspaces:

```text
HSE360 Platform
├── Emirates National Copper Factory – NUHAS
├── Company B
└── Company C
```

Each company has its own users, permissions, references, records, attachments and branding. A user may belong to more than one company and switch the active workspace from the top bar.

## Core security model
- Supabase Auth handles passwords. Passwords are never stored in GitHub and are never readable by an administrator.
- New self-registered accounts do **not** receive automatic company access.
- Users can request access to an existing company using its company access code, or create a completely new company workspace.
- New access requests are `pending` until a company administrator approves them.
- Supabase PostgreSQL RLS enforces company membership at the database boundary.
- HSE records include `organization_id` and new references are organization/module/year scoped.
- HSE record creation/update/deletion is performed through audited security-definer RPCs.
- File storage paths are organization-scoped.
- Organization administrators can issue temporary passwords through the Edge Function; they cannot see the user's existing password.

## Roles included
- **Super Admin** — full company control, users, permissions, settings and all HSE data.
- **HSE Admin** — administrator-level access inside that company.
- **HSE Engineer** — collective visibility with create/edit-own/delete-own by default; additional edit/delete rights can be granted.
- **HSE Officer** — same safe default as HSE Engineer.
- Supervisor / Management / Auditor — view-focused defaults.
- Employee — limited create/view defaults.
- Contractor / Guest — no HSE module visibility until permissions are granted.

Granular permissions are stored per organization membership and support View, Create, Edit Own, Edit All, Delete Own and Delete All by module.

## Work Permit model
The Work Permit register has exactly three top-level permit classes:
1. General Work Permit
2. Hot Work Permit
3. Critical Work Permit

Critical Work then uses a subtype for:
- Confined Space
- Work at Height
- Electrical Work
- Lifting Operation
- Excavation
- Line Breaking
- Chemical Work
- Energy Isolation / LOTO
- Other Critical Work

Permit records capture exact `Valid From` and `Valid Until` date/time, responsible persons, workers, performing company, risk/JSA reference, hazards, controls, PPE, isolation and approval/closure fields.

Hot Work adds fire-watch, combustible-material, extinguisher, spark-containment, gas-test and post-work fire-watch controls. Critical Work adds subtype-specific control fields.

### Permit alert correction
The compliance renewal engine intentionally **does not scan permit validity dates**.

Compliance renewal alerts are limited to validity-controlled compliance records such as licences, competencies and third-party inspections. Permits have their own time-sensitive alert engine and only alert when an active permit is expired or within four hours of expiry.

## Dashboard corrections
The V8 dashboard uses month strings (`Jan`, `Feb`, etc.) instead of month objects. This removes the previous `[object Object]` chart-label defect.

## Company branding
NUHAS branding uses the supplied company logo in `assets/nuhas-logo.jpg` as a local fallback for the NUHAS workspace. Company administrators can upload a company logo from Organization Settings; other company workspaces remain independently branded.

## Developer credit
The interface includes:

**HSE360 Platform — Developed by Danish Shaikh · @odanisho**

No unverified LinkedIn URL is hard-coded.

## Files
- `index.html` — application shell
- `app.js` — HSE360 V8 client application
- `styles.css` — responsive premium UI
- `config.js` — Supabase project URL + publishable key only
- `manifest.webmanifest` — PWA metadata
- `assets/nuhas-logo.jpg` — supplied NUHAS logo
- `supabase/v8-multitenant.sql` — tenant/RLS/RPC migration
- `supabase/functions/admin-reset/index.ts` — secure administrator password reset function
- `templates/` — starter import templates retained from V7

## Important deployment rule
Run `supabase/v8-multitenant.sql` **before** replacing the live frontend with V8. The V8 frontend expects the tenant-aware database functions and `organization_id` column.

Take a database backup/export before running the migration.

> V8.2 SQL hotfix: the legacy `hse_reference_seq` PostgreSQL sequence is intentionally left untouched. V8 uses `organization_reference_seq` for tenant-scoped numbering.


## Certificate / permit / NOC PDF reader (V8.7 reader, V8.8.3 attachment workflow, V8.8.4 renewal control)

Open **Import & Extract → Read a certificate, permit or NOC**, select a PDF up to 10 MB, and wait for selectable-text extraction or browser OCR. Review every suggested field (document type, number, issuer, issue date, expiry date) against the original, correct anything uncertain, then select **Save reviewed certificate**. The record is created in the active company's **Licences & Certificates** register using the existing create-record RPC and the signed-in user's permissions.

The OCR and field suggestions are assistive only, not authenticity verification or formal approval. Ambiguous dates are left blank. OCR currently processes at most the first 10 PDF pages and uses English recognition. From V8.8.3, after the user reviews the fields, the **original PDF is uploaded to the existing private `hse-attachments` bucket** and its path/name/size/type are linked to the certificate record through the audited create-record RPC. Upload uses the active organization and signed-in user in its storage path; if record creation fails, the UI attempts to remove the uploaded object and reports when cleanup cannot be confirmed. PDF.js/Tesseract.js are loaded from pinned public CDNs, so browser network access is required. There is no hosted AI API key or recurring AI API cost in this implementation.

QA: run `node qa/certificate-reader-smoke.js`, `node qa/certificate-attachment-workflow.js`, and `node qa/certificate-renewal-workflow.js`. These tests cover field/date helpers, file validation, path scoping, duplicate matching and renewal-linkage patterns. They do **not** prove the live Storage policies or authenticated upload/download behavior; verify those end-to-end in a staging workspace.


## V8.8.0 linked corrective actions
From an eligible source record, select **Create corrective action**. Enter the specific action, owner and due date, then save. The action stores a source reference and source record ID; the source record detail view lists linked actions. Use the effectiveness-check field to define the evidence needed before closure. This is a workflow aid, not automatic closure verification.

See `HSE360-REAL-WORKFLOW-ROADMAP.md` for prioritized product improvements that focus on real daily HSE use rather than disconnected features.


## Release verification
See `V8.8.0-AUDIT-AND-TEST-REPORT.md` for the checks run and integration limitations. This is a local release candidate and has not been deployed.


## V8.8.1 local candidate — inspection finding follow-up
The inspection form now requires an explicit outcome and validates consistency between Pass/Fail, findings count, follow-up, failed-item details and immediate controls. Incomplete inspections need a recorded reason. The inspection detail view highlights this information, and the linked corrective-action dialog pre-fills the failed items as a starting draft, while requiring the user to review and assign an owner and due date. The corrective-action register shows owner, priority, deadline and source finding, with filters for owner, priority and due state, earliest-deadline sorting and an overdue count.

A candidate SQL migration, `supabase/v8.8.1-linked-action-deduplication.sql`, adds tenant-scoped duplicate checks for identical active linked actions. It is not applied. Review it in staging, test concurrent submissions, and back up the database before production use. The interface-level duplicate warning alone is not server-side enforcement.

See `V8.8.1-CHANGELOG.md`, `V8.8.1-IMPLEMENTATION-NOTES.md` and `V8.8.1-LOCAL-QA-REPORT.md`. This version remains local and is not deployed or production-verified.

The Actions register now includes owner, priority and deadline filters plus active-deadline sorting. Deadline states are calculated from each action's due date using the local calendar date; invalid or missing dates are explicitly surfaced instead of silently counted as valid.

## V8.8.2 local consolidated candidate — permit lifecycle and verification gates
This cumulative local package includes inspection finding validation, linked-action follow-up, action work-queue filtering, browser closure validation, and candidate SQL guards for corrective-action closure, duplicate active linked actions, and permit lifecycle transitions. The candidate SQL files are under `supabase/` and have only been checked by local static tests; they have not been executed against PostgreSQL/Supabase. A headless Chromium launch timed out, so live browser interaction is not verified.

Read `RELEASE-READINESS-AND-PENDING.md` before deployment. It defines required staging migrations, two-tenant/RLS testing, authenticated browser tests, private storage tests, admin-reset function checks, GitHub reconciliation and operational sign-off. Do not call this package production-verified until those checks have passed. No GitHub push or production database change was made while preparing this package.


## V8.8.3 local candidate — certificate source-PDF retention
The certificate reader now retains the original PDF in the private `hse-attachments` storage bucket and attaches the storage metadata to the newly created `licenses` record. It validates file type/size, uses the current organization/user storage path convention, requires the in-memory source file at save time, and attempts best-effort cleanup if the audited record RPC fails. The source PDF is cleared from browser memory after a successful save.

Run `node qa/certificate-attachment-workflow.js` to exercise deterministic file/path validation and static storage/RPC wiring checks. Live signed-URL access, organization storage policies and upload rollback behavior still require staging integration testing. See `V8.8.3-CHANGELOG.md`, `V8.8.3-LOCAL-QA-REPORT.md` and `RELEASE-READINESS-AND-PENDING.md`.


## V8.8.4 local candidate — certificate duplicate protection and renewal history
The certificate reader now offers an optional previous-certificate link before saving. It compares normalized document number, issuer and expiry before any PDF upload; when a number is not available it uses title/issuer/validity as a fallback. A likely exact duplicate blocks upload and offers to open the existing record. Different expiries are allowed so an actual renewal can be recorded and linked. Certificate detail views show predecessor and successor links, and register rows identify renewals/superseded records and show expiry. Superseded predecessors are excluded from the renewal-alert queue to avoid stale alerts after a replacement certificate is recorded.

`supabase/v8.8.4-certificate-duplicate-guard.sql` contains a **candidate** tenant-scoped database uniqueness guard. It first checks for pre-existing duplicate keys and aborts instead of altering/deleting historical data. Review duplicate findings and apply only in non-production staging first. The client check alone is not a concurrency or security boundary; the SQL candidate is not applied or live-verified. Tests: `node qa/certificate-renewal-workflow.js` and `node qa/certificate-duplicate-sql-static-smoke.js`. No GitHub push or production database change was made.


## V8.8.5 local candidate — renewal reminder windows
Compliance renewal alerts now use validated calendar-day arithmetic and a 90-day horizon, with alert bands at 90/60/30/7 days, expiry today, and overdue. Malformed non-empty expiry dates are flagged for correction. `Valid` / `Compliant` records no longer suppress imminent expiry alerts. The dashboard separates overdue, due in 7 days, due in 8–90 days and invalid dates. Notification detail includes the owner where available. The alerts are generated by the running app; this is not a server-side scheduled email or push-notification service.

Run `node qa/compliance-renewal-reminders.js` for date-window checks. See `V8.8.5-CHANGELOG.md`, `V8.8.5-LOCAL-QA-REPORT.md`, and the cumulative `RELEASE-READINESS-AND-PENDING.md`.
