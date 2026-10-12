# Supabase V8 deployment package

Run `v8-multitenant.sql` once in the existing project.

Deploy `functions/admin-reset/index.ts` as the `admin-reset` Edge Function.

Do not run the old `registration-fix.sql` or `hardening-v6.sql` after V8. Those files belong to the pre-tenant architecture.


## Later candidate migrations (review and stage before use)

The following V8.8.x SQL files are **not applied by this package** and must not be run blindly against production:

- `v8.8.1-linked-action-deduplication.sql` — prevents matching active linked actions.
- `v8.8.1-capa-closure-guard.sql` — corrective-action closure validation candidate.
- `v8.8.2-permit-lifecycle-guard.sql` — candidate permit lifecycle checks.
- `v8.8.4-certificate-duplicate-guard.sql` — preflight plus tenant-scoped unique indexes for certificate duplicate keys. The preflight raises an exception if matching existing keys are found; review history with record owners and resolve only under an approved data-change plan.

Take a database backup/export, reconcile the live schema and migration history, then run each applicable candidate in a non-production Supabase project and test both allowed and denied paths before scheduling production change control. Static SQL tests are not database execution tests.
