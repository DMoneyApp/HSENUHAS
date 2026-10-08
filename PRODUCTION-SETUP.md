# HSE360 V8 — Production Deployment Sequence

This release is designed to upgrade the existing V7 NUHAS Supabase project.

## 1. Back up production data first
Use the Supabase dashboard to take/export a database backup before the migration. The migration preserves existing HSE records and moves them into the NUHAS tenant; it also removes the unsafe legacy create/update/delete RPC signatures that do not carry organization context.

## 2. Run the V8 tenant migration
Open Supabase → SQL Editor and run:

`supabase/v8-multitenant.sql`

The migration will:
- create organizations and membership tables;
- create the organization settings table;
- add `organization_id` to existing HSE and audit data;
- create the NUHAS organization if it does not already exist;
- backfill existing NUHAS profiles and HSE data into that organization;
- change new registrations to `guest` with no automatic company access;
- create tenant-aware audited record RPCs;
- apply organization-aware RLS;
- create organization-scoped numbering;
- create/secure attachment and branding buckets/policies.

## 3. Authentication settings
For the current username-first workflow:
- Authentication → Providers → Email: allow email/password sign-in.
- For accounts without recovery email, the application uses an internal auth email (`@hse360.local`). These accounts cannot use email self-recovery and must use administrator reset.
- If you enable mandatory email confirmation, users must complete confirmation before the application can finish onboarding.

## 4. Deploy the admin-reset Edge Function
Deploy `supabase/functions/admin-reset/index.ts` as:

`admin-reset`

The Edge Function requires the standard Supabase project secrets (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`) in the Supabase function environment. Never commit the service-role key to GitHub.

The function only permits an active organization Super Admin/HSE Admin to reset a user who belongs to the same organization, then marks `must_change_password=true`.

## 5. Replace GitHub Pages frontend
Keep the existing `config.js` publishable credentials.
Replace:
- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `assets/nuhas-logo.jpg`

Do not add the service-role key to any frontend file.

## 6. First login after migration
Your existing NUHAS users are automatically linked to the NUHAS organization using their existing roles. Verify:
- Super Admin access;
- HSE Engineer access;
- HSE Officer role if assigned;
- user directory;
- organization settings;
- existing HSE records remain visible under NUHAS.

## 7. New-company test
From an authenticated account, use Organization Settings → Create another company.
Expected result:
- a new empty workspace is created;
- the creator becomes Super Admin of that workspace;
- NUHAS data remains in NUHAS;
- top-bar workspace switching changes all data context;
- references use the new company's numbering prefix.

## 8. Required live regression test
Do not treat a production release as verified until these are tested in the live deployed environment:

### Authentication
- Existing username/password login
- New registration
- Registration has no automatic company access
- Join request stays pending
- Admin approval activates access
- Forgot password only works through recovery email
- Admin temporary password forces change on next login

### Tenant isolation
- NUHAS user sees NUHAS only
- New company starts empty
- Switching company changes all registers
- A user who is not a member of a company cannot query its records through the database API
- Pending/guest user sees no company HSE records

### Permissions
- Super Admin can edit/delete all
- HSE Engineer can see collective company records but can edit/delete only their own by default
- HSE Officer follows the same default
- Admin can grant Edit All/Delete All to selected modules
- Non-admin cannot access User Administration or Audit Trail

### PTW
- Only General, Hot Work and Critical Work appear as top-level permit classes
- Critical subtype changes the form correctly
- Valid From / Valid Until are date-time fields
- Expired/near-expiry permits alert as permit-time alerts
- Permit does not appear in the 2-month compliance-renewal alert
- Closed permits do not create active time alerts
- Hot-work fire controls save correctly
- Critical-work subtype fields save correctly

### Dashboard/UI
- HSE Activity month labels are normal text (`Jan`, `Feb`, etc.)
- No `[object Object]` appears
- NUHAS logo displays
- Mobile navigation opens/closes
- Record modal scrolls on a phone
- Print / Save as PDF opens a clean record print view
- CSV export opens in Excel
- Attachments upload and signed URLs open only for authorized members

## 9. Rollback principle
Do not attempt to "roll back" by re-running the old V7 SQL after V8. Restore the database backup if a full database rollback is required.

> V8.2 SQL hotfix: the legacy `hse_reference_seq` PostgreSQL sequence is intentionally left untouched. V8 uses `organization_reference_seq` for tenant-scoped numbering.


### V8.2 migration compatibility correction
V8.2 keeps the legacy input parameter name `uid` for `is_super_admin(uuid)` and `is_admin(uuid)` so PostgreSQL can replace the existing V7 functions without the 42P13 input-parameter-name error. Do not run the failed V8/V8.1 migration again; use this V8.2 SQL file.
