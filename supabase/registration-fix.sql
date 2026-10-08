-- NUHAS HSE360 — Registration Fix
-- Run this once in Supabase SQL Editor.
-- This replaces the old direct auth.users registration method with the
-- supported Supabase Auth signUp() flow + a secure profile trigger.

create or replace function public.handle_new_nuhas_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_recovery_email text;
  v_full_name text;
  v_department text;
  v_role text;
  v_existing_count integer;
begin
  v_username := nullif(trim(new.raw_user_meta_data->>'username'), '');
  v_recovery_email := nullif(lower(trim(new.raw_user_meta_data->>'recovery_email')), '');
  v_full_name := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_department := nullif(trim(new.raw_user_meta_data->>'department'), '');

  if v_username is null or v_username !~ '^[A-Za-z0-9._-]{3,40}$' then
    raise exception 'A valid NUHAS username is required';
  end if;

  -- The first registered account becomes the bootstrap Super Admin.
  -- All subsequent self-registered accounts are normal employees.
  select count(*) into v_existing_count from public.profiles;
  v_role := case when v_existing_count = 0 then 'super_admin' else 'employee' end;

  insert into public.profiles(
    id, username, email, full_name, department, role, active, must_change_password
  )
  values(
    new.id,
    v_username,
    v_recovery_email,
    v_full_name,
    v_department,
    v_role,
    true,
    false
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_nuhas on auth.users;

create trigger on_auth_user_created_nuhas
after insert on auth.users
for each row execute function public.handle_new_nuhas_user();

-- Remove the previous unsafe registration RPC that attempted to write directly
-- into Supabase's internal auth.users table.
drop function if exists public.register_nuhas_user(text,text,text,text,text);

-- Keep username lookup for login. Password verification is performed by
-- Supabase Auth, never by this function.
create or replace function public.login_with_username(
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e text;
begin
  select coalesce(email, lower(username) || '@nuhas.local')
    into e
  from public.profiles
  where lower(username) = lower(trim(p_username))
    and active = true;

  if e is null then
    return null;
  end if;

  return jsonb_build_object('email', e);
end;
$$;

grant execute on function public.login_with_username(text,text) to anon, authenticated;

-- IMPORTANT:
-- For NUHAS users who register without a recovery email, Supabase email
-- confirmation cannot be completed because the address is internal
-- (@nuhas.local). In Supabase Dashboard go to:
-- Authentication -> Providers -> Email
-- and disable "Confirm email" if you want username/password accounts
-- without recovery email to be able to sign in immediately.
