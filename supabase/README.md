# Supabase V8 deployment package

Run `v8-multitenant.sql` once in the existing project.

Deploy `functions/admin-reset/index.ts` as the `admin-reset` Edge Function.

Do not run the old `registration-fix.sql` or `hardening-v6.sql` after V8. Those files belong to the pre-tenant architecture.
