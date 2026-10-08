-- HSE360 V8.3 HOTFIX
-- Run once AFTER V8.2 migration. Safe to run again.
-- Fixes optional recovery email registration and dynamic modal UI is handled by app.js.

begin;

alter table public.profiles
  add column if not exists recovery_email text;

-- Preserve existing authentication emails and leave recovery email empty unless it was
-- already represented separately. Existing V7/V8 users keep auth_email for username login.
update public.profiles p
set auth_email = coalesce(nullif(p.auth_email,''), u.email)
from auth.users u
where u.id=p.id;

create or replace function public.handle_new_nuhas_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_username text := nullif(trim(new.raw_user_meta_data->>'username'),'');
  v_recovery_email text := nullif(lower(trim(new.raw_user_meta_data->>'recovery_email')),'');
  v_full_name text := nullif(trim(new.raw_user_meta_data->>'full_name'),'');
  v_department text := nullif(trim(new.raw_user_meta_data->>'department'),'');
begin
  if v_username is null or v_username !~ '^[A-Za-z0-9._-]{3,40}$' then
    raise exception 'A valid HSE360 username is required';
  end if;

  -- profiles.email is the legacy authentication-email field and may be NOT NULL.
  -- Store the actual Supabase Auth email there; the optional recovery address is separate.
  insert into public.profiles(
    id, username, email, auth_email, recovery_email,
    full_name, department, role, active, must_change_password
  )
  values(
    new.id, v_username, new.email, new.email, v_recovery_email,
    v_full_name, v_department, 'guest', true, false
  )
  on conflict (id) do update set
    username=excluded.username,
    email=excluded.email,
    auth_email=excluded.auth_email,
    recovery_email=excluded.recovery_email,
    full_name=excluded.full_name,
    department=excluded.department;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_nuhas on auth.users;
create trigger on_auth_user_created_nuhas
after insert on auth.users
for each row execute function public.handle_new_nuhas_user();

-- Admin directory should display the optional recovery email, not the hidden auth email.
drop function if exists public.admin_list_members(uuid);
create function public.admin_list_members(p_org_id uuid)
returns table(
  member_id uuid,user_id uuid,username text,email text,full_name text,department text,
  role text,status text,permissions jsonb,last_login_at timestamptz,created_at timestamptz,approved_at timestamptz
)
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_org_admin(auth.uid(),p_org_id) then raise exception 'Access denied'; end if;
  return query
  select m.id,p.id,p.username,p.recovery_email,p.full_name,
         coalesce(m.department,p.department),m.role,m.status,m.permissions,
         p.last_login_at,m.created_at,m.approved_at
  from public.organization_memberships m
  join public.profiles p on p.id=m.user_id
  where m.organization_id=p_org_id
  order by case when m.status='pending' then 0 else 1 end,
           lower(coalesce(p.full_name,p.username));
end;
$$;
grant execute on function public.admin_list_members(uuid) to authenticated;

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select not exists(
    select 1 from public.profiles where lower(username)=lower(trim(p_username))
  );
$$;
grant execute on function public.username_available(text) to anon, authenticated;

create or replace function public.recovery_email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.profiles
    where recovery_email is not null
      and lower(trim(recovery_email))=lower(trim(p_email))
  );
$$;
grant execute on function public.recovery_email_registered(text) to anon, authenticated;

commit;
