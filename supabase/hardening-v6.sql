-- NUHAS HSE360 V6 hardening / audit integrity upgrade
-- Run AFTER the existing NUHAS schema + registration-fix.sql + upgrade-v5.sql.

-- 1) Make usernames truly case-insensitive and prevent duplicate usernames.
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));

-- 2) Make first-account bootstrap deterministic under concurrent signups.
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

  perform pg_advisory_xact_lock(hashtextextended('nuhas_hse360_bootstrap', 0));

  if exists(select 1 from public.profiles where lower(username)=lower(v_username)) then
    raise exception 'Username already exists';
  end if;

  select count(*) into v_existing_count from public.profiles;
  v_role := case when v_existing_count = 0 then 'super_admin' else 'employee' end;

  insert into public.profiles(
    id, username, email, full_name, department, role, active, must_change_password
  ) values (
    new.id, v_username, v_recovery_email, v_full_name, v_department, v_role, true, false
  );

  return new;
end;
$$;

-- 3) Controlled user access management: only Super Admin may change role/status.
create or replace function public.admin_update_profile(
  p_user_id uuid,
  p_role text,
  p_active boolean
)
returns public.profiles
language plpgsql
security definer
set search_path=public
as $$
declare r public.profiles;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only Super Admin can change user role or status';
  end if;
  if p_user_id=auth.uid() and p_active=false then
    raise exception 'You cannot disable your own account';
  end if;
  if p_role not in ('super_admin','hse_admin','hse_engineer','supervisor','employee','contractor','management','auditor') then
    raise exception 'Invalid role';
  end if;
  update public.profiles
  set role=p_role, active=p_active
  where id=p_user_id
  returning * into r;
  if r.id is null then raise exception 'User not found'; end if;
  insert into public.audit_events(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'UPDATE_ACCESS','profile',r.id,jsonb_build_object('username',r.username,'role',r.role,'active',r.active));
  return r;
end;
$$;
grant execute on function public.admin_update_profile(uuid,text,boolean) to authenticated;

-- 4) Force HSE record changes through audited RPCs rather than direct table writes.
revoke insert, update, delete on public.hse_records from authenticated;

-- 5) Audit-event reads remain restricted to HSE admins.
revoke insert, update, delete on public.audit_events from authenticated;

-- 6) Useful indexes for daily operational views.
create index if not exists hse_records_created_by_idx on public.hse_records(created_by);
create index if not exists hse_records_created_at_idx on public.hse_records(created_at desc);
create index if not exists hse_records_module_date_idx on public.hse_records(module,event_date desc);
