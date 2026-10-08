NUHAS HSE360 — Registration Fix

1. Replace app.js in GitHub with the included app.js.
2. Open Supabase SQL Editor and run supabase/registration-fix.sql once.
3. In Supabase Authentication > Providers > Email, disable Confirm email if you want accounts without a recovery email to log in immediately.
4. Wait for GitHub Pages to deploy, then hard-refresh the site.
5. Register the first account. The first account is automatically assigned super_admin.
6. Do not put the Supabase secret/service-role key into GitHub or config.js.

The first account bootstrap behavior is intentional for the initial NUHAS HSE360 setup. All later self-registered accounts default to employee.
