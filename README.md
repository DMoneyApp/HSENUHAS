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
