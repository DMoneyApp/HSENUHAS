# NUHAS HSE360 — V6 Deep QA / Regression Report

## Scope
Static code audit and hardening of the V5 application layer, with emphasis on daily HSE workflows, data integrity, authentication, mobile use, and management usability.

## Critical defects identified and corrected

1. **LTI KPI could remain zero incorrectly**
   - Cause: accident form stores `lti` as `"Yes"/"No"`, while the dashboard checked for boolean `true`.
   - Fix: dashboard now evaluates the stored value case-insensitively.

2. **Local date could roll back one day around UTC midnight**
   - Cause: `toISOString()` was used for today's date.
   - Fix: date generation now uses the browser's local calendar date.

3. **Edit/delete functionality was missing from record details**
   - Fix: detail drawer now provides Edit/Delete for the record owner or an HSE administrator.
   - Backend already contains audited update/delete RPCs.

4. **Audit CSV export was only a placeholder**
   - Fix: Audit Trail now exports actual audit events to CSV.

5. **No operational notification panel**
   - Fix: notification bell now surfaces overdue corrective actions, high/extreme risks, and expired permits and links directly to the relevant register.

6. **Management dashboard contained hard-coded compliance percentages**
   - Fix: removed fabricated percentages. Framework cards now show live linked-record coverage. Formal compliance percentages should only be configured from verified evidence.

7. **Risk score inputs were not constrained**
   - Fix: likelihood/severity are clamped to 1–5 and score/level are recalculated before save.

8. **Failed attachment upload could leave orphaned files after database failure**
   - Fix: newly uploaded attachment is removed if the record RPC fails.

9. **Global search did not provide a useful action from the dashboard**
   - Fix: Enter on the global search moves into a searchable register view.

10. **Bootstrap Super Admin race condition**
    - Fix: database hardening adds an advisory lock around first-account provisioning.

11. **Username uniqueness was case-sensitive at database level**
    - Fix: case-insensitive unique index added.

12. **Direct HSE record table writes could bypass the intended audited RPC workflow**
    - Fix: authenticated direct INSERT/UPDATE/DELETE privileges are revoked; application writes go through the security-definer RPCs.

13. **User access management was incomplete**
    - Fix: V6 database includes a Super Admin-only audited `admin_update_profile` RPC for role/status control.

## Existing functionality retained

- Supabase username/password authentication
- Optional recovery email
- Super Admin bootstrap account
- Temporary-password admin reset architecture
- Forced password change after admin reset
- RLS-protected records
- Private attachment bucket
- Automatic NUHAS reference numbers
- Realtime HSE record updates
- CSV export / JSON backup
- Light/dark theme
- Responsive desktop/tablet/mobile layout

## Remaining production validation

These items require live browser/Supabase testing against the user's deployed project and should be tested before declaring production release:

- Create an Observation and verify reference generation
- Upload an image and verify private storage access
- Edit an Observation
- Delete an Observation
- Verify dashboard KPI changes in realtime
- Verify Risk Assessment score and level
- Verify Training participant-hours
- Verify Work Permit expiry notification
- Verify admin password reset Edge Function deployment
- Verify user role/status management after running hardening SQL
- Verify mobile navigation and modal scrolling on a real phone
- Verify Supabase Realtime behavior across two browsers/devices

## Release principle

Do not treat the application as production-complete until the live regression checklist above passes.
