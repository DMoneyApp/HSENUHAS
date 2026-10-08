# NUHAS HSE360 v5 — Premium Production UI

A professional responsive HSE + IMS command-center frontend for **Emirates National Copper Factory – NUHAS** using GitHub Pages + Supabase.

## What is included
- Premium responsive command center and management analytics
- Mobile-first sidebar/navigation and quick actions
- Username/password authentication with optional recovery email
- Super Admin bootstrap for the first registered account (via the existing registration trigger)
- HSE registers for observations, incidents, near miss, first aid, accidents/LTI, inspections, CAPA, training, TBT, drills, manhours, permits, risk, chemicals, waste, energy, audits, NCR/CAPA, document control, legal compliance and IMS objectives
- Live Supabase record loading and realtime updates
- Dynamic record forms with validation and private attachments
- Automatic reference numbers through the existing `create_hse_record` RPC
- CSV export and JSON backup
- Risk scoring and live management metrics
- User directory and secure admin password reset workflow
- Audit trail view
- Light/dark workspace preference
- PWA manifest

## Important
Do not put a Supabase secret/service-role key in GitHub. `config.js` must contain only the project URL and public/publishable key.

## Upgrade sequence for the existing project
1. Keep your working `config.js` exactly as it is.
2. Replace `index.html`, `app.js`, `styles.css`, `manifest.webmanifest` with the files in this package.
3. Because your existing project already has the original schema and registration-fix trigger, run `supabase/upgrade-v5.sql` in Supabase SQL Editor.
4. Keep Authentication → Sign In / Providers → Allow new users to sign up ON and Confirm email OFF for the current username-first workflow.
5. Deploy `supabase/functions/admin-reset/index.ts` as the `admin-reset` Edge Function. Its service/secret key must remain a Supabase secret and must never be committed to GitHub.
6. Hard refresh the GitHub Pages site (Ctrl+F5).

## Registration
The current project uses the supported Supabase `auth.signUp()` path. A database trigger creates the corresponding `profiles` row. The first profile becomes `super_admin`; subsequent self-registration defaults to `employee`.

## Security
- Passwords are handled by Supabase Auth and are never stored in the frontend.
- Admins can reset a password but cannot read an existing password.
- The admin reset function runs server-side and requires an authorized admin JWT.
- HSE attachments use a private storage bucket and signed URLs.
- RLS remains the primary database authorization boundary.
