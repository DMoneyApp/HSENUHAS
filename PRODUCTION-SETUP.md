# Production setup checklist

## Supabase
1. Create project.
2. SQL Editor → run `supabase/schema.sql`.
3. Storage → New private bucket: `hse-attachments`.
4. Add storage policies allowing authenticated users to upload/read only their own folder (`auth.uid() = (storage.foldername(name))[1]::uuid`) and admins to read all if desired.
5. Deploy the Edge Function `admin-reset` with `SUPABASE_SERVICE_ROLE_KEY` configured as a secret.

## GitHub Pages
1. Copy `config.example.js` to `config.js`.
2. Add URL and anon key.
3. Push the repository.
4. Repository → Settings → Pages → deploy from main/root.

## First Admin
Register your own account, then run:
`update public.profiles set role='super_admin' where username='YOUR_USERNAME';`

Never put the service-role key in `config.js`, GitHub, browser code, or a public repository.
