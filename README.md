# NUHAS HSE360 — Production GitHub + Supabase

Integrated HSE & IMS platform for **Emirates National Copper Factory – NUHAS**.

## Architecture
- GitHub: source code and GitHub Pages deployment.
- Supabase Auth: usernames/passwords and optional recovery email.
- Supabase PostgreSQL: shared HSE/IMS records.
- Supabase Storage: photographs and attachments.
- Supabase Edge Function: Admin password reset.

The browser never stores the Supabase service-role key and GitHub never stores user passwords.

## Setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Create a Storage bucket named `hse-attachments` and make it private.
4. Deploy `supabase/functions/admin-reset/index.ts` as an Edge Function with the Supabase CLI.
5. Copy `config.example.js` to `config.js` and enter the project URL + anon key.
6. Open the app locally or publish the repository through GitHub Pages.
7. Register your Admin account.
8. In SQL Editor, promote it: `update public.profiles set role='super_admin' where username='YOUR_USERNAME';`
9. Add the Supabase URL and anon key as repository/deployment configuration if you prefer generating `config.js` during deployment rather than committing it.

## Password recovery design
- Recovery email is optional at registration.
- If a recovery email exists, Supabase email recovery can be used.
- If no recovery email exists, the user contacts the NUHAS HSE360 Admin.
- Admin can issue a temporary password through the Edge Function.
- Passwords are not readable by Admin and are not committed to GitHub.

## Included modules
Dashboard, observations, incidents, near miss, first aid, accidents/LTI, inspections, corrective actions, training, TBT, mock drills, manhours, permits, risk assessments, chemicals, waste, energy, audits, NCR/CAPA, documents, legal compliance and IMS objectives.
