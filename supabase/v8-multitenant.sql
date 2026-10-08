-- HSE360 V8 — multi-organization, tenant-isolated production migration
-- Designed to upgrade the existing V7 schema already running on Supabase.
-- Run this SQL once in Supabase SQL Editor.
-- It does NOT read or expose passwords. Passwords remain in Supabase Auth.

begin;

-- -----------------------------------------------------------------------------
-- 0) Core tenant tables
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null unique,
  join_code text not null unique,
  logo_url text,
  address text,
  country text default 'United Arab Emirates',
  industry text,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  numbering_prefix text not null default 'HSE360',
  primary_color text not null default '#159a5b',
  secondary_color text not null default '#f0a51a',
  timezone text not null default 'Asia/Dubai',
  date_format text not null default 'DD/MM/YYYY',
  compliance_frameworks jsonb not null default '["ISO 45001","ISO 14001","ISO 9001","ISO 50001","ADOSH"]'::jsonb,
  permit_types jsonb not null default '["general","hot_work","critical"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'guest',
  status text not null default 'pending' check (status in ('pending','active','suspended','rejected')),
  department text,
  permissions jsonb not null default '{}'::jsonb,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_memberships_user_idx on public.organization_memberships(user_id, status);
create index if not exists organization_memberships_org_idx on public.organization_memberships(organization_id, status);
create index if not exists organizations_slug_idx on public.organizations(slug);

-- Keep Supabase Auth's actual sign-in email separate from the optional recovery email.
-- This prevents username login lookup from exposing a user's recovery address.
alter table public.profiles add column if not exists auth_email text;
update public.profiles p set auth_email=u.email from auth.users u where u.id=p.id and (p.auth_email is null or p.auth_email='');

-- Tenant ownership columns on existing records.
alter table public.hse_records add column if not exists organization_id uuid references public.organizations(id);
alter table public.audit_events add column if not exists organization_id uuid references public.organizations(id);
-- Legacy hse_reference_seq is a PostgreSQL sequence, not a table; V8 uses organization_reference_seq below.

-- New tenant-aware sequence table. Existing references remain unchanged; new references are isolated per company/module/year.
create table if not exists public.organization_reference_seq (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module text not null,
  year integer not null,
  last_no integer not null default 0,
  primary key (organization_id, module, year)
);

-- -----------------------------------------------------------------------------
-- 1) Helper functions
-- -----------------------------------------------------------------------------
create or replace function public.default_permissions_for_role(p_role text)
returns jsonb
language plpgsql
immutable
as $$
declare
  v jsonb := '{}'::jsonb;
  m text;
  mods text[] := array[
    'observations','incidents','near_miss','first_aid','accidents','inspections','actions',
    'training','tbt','drills','manhours','permits','risk','chemicals','waste','energy',
    'audit','ncr','documents','legal','objectives','employees','ppe','competencies',
    'licenses','fire_equipment','third_party'
  ];
  all_mod jsonb := jsonb_build_object('view',true,'create',true,'edit_own',true,'edit_all',true,'delete_own',true,'delete_all',true);
  standard_mod jsonb := jsonb_build_object('view',true,'create',true,'edit_own',true,'edit_all',false,'delete_own',false,'delete_all',false);
  view_mod jsonb := jsonb_build_object('view',true,'create',false,'edit_own',false,'edit_all',false,'delete_own',false,'delete_all',false);
  guest_mod jsonb := jsonb_build_object('view',false,'create',false,'edit_own',false,'edit_all',false,'delete_own',false,'delete_all',false);
begin
  if p_role in ('super_admin','hse_admin') then
    foreach m in array mods loop v := v || jsonb_build_object(m, all_mod); end loop;
  elsif p_role in ('hse_engineer','hse_officer') then
    foreach m in array mods loop v := v || jsonb_build_object(m, standard_mod); end loop;
    -- User management, organization settings and audit trail are admin-only UI areas.
  elsif p_role in ('supervisor','management','auditor') then
    foreach m in array mods loop v := v || jsonb_build_object(m, view_mod); end loop;
  elsif p_role = 'employee' then
    foreach m in array mods loop v := v || jsonb_build_object(m, guest_mod); end loop;
    v := v || jsonb_build_object(
      'observations', standard_mod,
      'near_miss', standard_mod
    );
  else
    foreach m in array mods loop v := v || jsonb_build_object(m, guest_mod); end loop;
  end if;
  return v;
end;
$$;

create or replace function public.is_org_member(p_user_id uuid, p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.organization_memberships m
    where m.user_id=p_user_id and m.organization_id=p_org_id and m.status='active'
  );
$$;

create or replace function public.is_org_admin(p_user_id uuid, p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.organization_memberships m
    where m.user_id=p_user_id and m.organization_id=p_org_id and m.status='active'
      and m.role in ('super_admin','hse_admin')
  );
$$;

create or replace function public.has_module_permission(
  p_user_id uuid,
  p_org_id uuid,
  p_module text,
  p_action text,
  p_record_owner uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_role text;
  v_perms jsonb;
  v_value text;
begin
  select role, permissions into v_role, v_perms
  from public.organization_memberships
  where user_id=p_user_id and organization_id=p_org_id and status='active';
  if v_role is null then return false; end if;
  if v_role in ('super_admin','hse_admin') then return true; end if;
  if p_action='edit_all' or p_action='delete_all' then
    v_value := coalesce(v_perms -> p_module ->> p_action, 'false');
    return v_value::boolean;
  end if;
  if p_action in ('edit_own','delete_own') and p_record_owner is not null and p_record_owner=p_user_id then
    v_value := coalesce(v_perms -> p_module ->> p_action, 'false');
    return v_value::boolean;
  end if;
  v_value := coalesce(v_perms -> p_module ->> p_action, 'false');
  return v_value::boolean;
exception when others then
  return false;
end;
$$;

-- Keep legacy role checks available for any old helper code, but make them derive from org membership.
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.organization_memberships where user_id=uid and status='active' and role='super_admin');
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.organization_memberships where user_id=uid and status='active' and role in ('super_admin','hse_admin'));
$$;

-- -----------------------------------------------------------------------------
-- 2) Backfill the current NUHAS workspace exactly once
-- -----------------------------------------------------------------------------
DO $$
declare
  v_org uuid;
  v_first_user uuid;
begin
  select id into v_org from public.organizations where slug='nuhas' limit 1;
  if v_org is null then
    select id into v_first_user from public.profiles order by created_at nulls last, id limit 1;
    insert into public.organizations(name,legal_name,slug,join_code,industry,created_by)
    values (
      'Emirates National Copper Factory – NUHAS',
      'Emirates National Copper Factory – NUHAS',
      'nuhas',
      'NUHAS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
      'Copper Electrical Products Manufacturing',
      v_first_user
    ) returning id into v_org;
  end if;

  insert into public.organization_settings(organization_id,numbering_prefix)
  values(v_org,'NUHAS')
  on conflict (organization_id) do nothing;

  insert into public.organization_memberships(organization_id,user_id,role,status,department,permissions,approved_at)
  select
    v_org,
    p.id,
    case when p.role in ('super_admin','hse_admin','hse_engineer','hse_officer','supervisor','employee','contractor','management','auditor') then p.role else 'guest' end,
    case when coalesce(p.active,true) then 'active' else 'suspended' end,
    p.department,
    public.default_permissions_for_role(case when p.role in ('super_admin','hse_admin','hse_engineer','hse_officer','supervisor','employee','contractor','management','auditor') then p.role else 'guest' end),
    case when coalesce(p.active,true) then now() else null end
  from public.profiles p
  on conflict (organization_id,user_id) do nothing;

  update public.hse_records set organization_id=v_org where organization_id is null;
  update public.audit_events set organization_id=v_org where organization_id is null;
end $$;

-- Existing rows must be tenant-owned before NOT NULL is enforced.
alter table public.hse_records alter column organization_id set not null;
-- audit_events may be empty in an older project; once backfilled, tenant ownership is safe.
alter table public.audit_events alter column organization_id set not null;

-- -----------------------------------------------------------------------------
-- 3) Registration trigger — no automatic company access for new signups
-- -----------------------------------------------------------------------------
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
  insert into public.profiles(id,username,email,auth_email,full_name,department,role,active,must_change_password)
  values(new.id,v_username,v_recovery_email,new.email,v_full_name,v_department,'guest',true,false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_nuhas on auth.users;
create trigger on_auth_user_created_nuhas
after insert on auth.users
for each row execute function public.handle_new_nuhas_user();

-- -----------------------------------------------------------------------------
-- 4) Username login lookup
-- -----------------------------------------------------------------------------
drop function if exists public.login_with_username(text,text);
create or replace function public.login_with_username(p_username text,p_password text)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_email text;
begin
  select coalesce(nullif(trim(auth_email),''), lower(username)||'@hse360.local') into v_email
  from public.profiles where lower(username)=lower(trim(p_username));
  if v_email is null then return null; end if;
  return jsonb_build_object('email',v_email);
end;
$$;
grant execute on function public.login_with_username(text,text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5) Onboarding and organization administration
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(
  p_name text,
  p_legal_name text default null,
  p_slug text default null,
  p_industry text default null,
  p_country text default 'United Arab Emirates',
  p_address text default null
)
returns public.organizations
language plpgsql
security definer set search_path=public
as $$
declare
  v_org public.organizations;
  v_slug text := lower(trim(coalesce(p_slug,'')));
  v_join text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if length(trim(coalesce(p_name,''))) < 2 then raise exception 'Company name is required'; end if;
  if v_slug='' then
    v_slug := regexp_replace(lower(trim(p_name)),'[^a-z0-9]+','-','g');
    v_slug := trim(both '-' from v_slug);
    if v_slug='' then v_slug := 'company'; end if;
  end if;
  if exists(select 1 from public.organizations where slug=v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  end if;
  v_join := upper(regexp_replace(substr(v_slug,1,10),'[^A-Z0-9]','','g')) || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.organizations(name,legal_name,slug,join_code,industry,country,address,created_by)
  values(trim(p_name),nullif(trim(p_legal_name),''),v_slug,v_join,nullif(trim(p_industry),''),coalesce(nullif(trim(p_country),''),'United Arab Emirates'),nullif(trim(p_address),''),auth.uid())
  returning * into v_org;
  insert into public.organization_settings(organization_id,numbering_prefix) values(v_org.id,upper(regexp_replace(substr(v_slug,1,8),'[^A-Z0-9]','','g')));
  insert into public.organization_memberships(organization_id,user_id,role,status,department,permissions,approved_by,approved_at)
  values(v_org.id,auth.uid(),'super_admin','active',null,public.default_permissions_for_role('super_admin'),auth.uid(),now());
  insert into public.audit_events(organization_id,actor_id,action,target_type,target_id,details)
  values(v_org.id,auth.uid(),'CREATE_ORGANIZATION','organization',v_org.id,jsonb_build_object('name',v_org.name,'slug',v_org.slug));
  return v_org;
end;
$$;
grant execute on function public.create_organization(text,text,text,text,text,text) to authenticated;

create or replace function public.find_organization_by_join_code(p_join_code text)
returns table(id uuid,name text,slug text,logo_url text,industry text,country text)
language sql security definer set search_path=public
as $$
  select id,name,slug,logo_url,industry,country
  from public.organizations
  where active=true and upper(join_code)=upper(trim(p_join_code));
$$;
grant execute on function public.find_organization_by_join_code(text) to authenticated;

create or replace function public.join_organization(p_join_code text,p_department text default null)
returns public.organization_memberships
language plpgsql security definer set search_path=public
as $$
declare v_org public.organizations; v_m public.organization_memberships;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into v_org from public.organizations where active=true and upper(join_code)=upper(trim(p_join_code));
  if v_org.id is null then raise exception 'Company access code not found'; end if;
  insert into public.organization_memberships(organization_id,user_id,role,status,department,permissions)
  values(v_org.id,auth.uid(),'guest','pending',nullif(trim(p_department),''),public.default_permissions_for_role('guest'))
  on conflict (organization_id,user_id) do update
    set department=coalesce(excluded.department,organization_memberships.department),
        status=case when organization_memberships.status='active' then 'active' else 'pending' end,
        updated_at=now()
  returning * into v_m;
  return v_m;
end;
$$;
grant execute on function public.join_organization(text,text) to authenticated;

drop function if exists public.my_organizations();
create or replace function public.my_organizations()
returns table(id uuid,name text,legal_name text,slug text,logo_url text,address text,industry text,country text,member_id uuid,role text,status text,department text,permissions jsonb,join_code text)
language sql security definer set search_path=public
as $$
  select o.id,
         case when m.status='active' then o.name else null end,
         case when m.status='active' then o.legal_name else null end,
         case when m.status='active' then o.slug else null end,
         case when m.status='active' then o.logo_url else null end,
         case when m.status='active' then o.address else null end,
         case when m.status='active' then o.industry else null end,
         case when m.status='active' then o.country else null end,
         m.id,m.role,m.status,m.department,m.permissions,
         case when m.status='active' and m.role in ('super_admin','hse_admin') then o.join_code else null end
  from public.organizations o
  join public.organization_memberships m on m.organization_id=o.id
  where m.user_id=auth.uid() and o.active=true
  order by case when m.status='active' then lower(o.name) else '' end;
$$;
grant execute on function public.my_organizations() to authenticated;

create or replace function public.admin_list_members(p_org_id uuid)
returns table(member_id uuid,user_id uuid,username text,email text,full_name text,department text,role text,status text,permissions jsonb,last_login_at timestamptz,created_at timestamptz,approved_at timestamptz)
language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_org_admin(auth.uid(),p_org_id) then raise exception 'Access denied'; end if;
  return query
  select m.id,p.id,p.username,p.email,p.full_name,coalesce(m.department,p.department),m.role,m.status,m.permissions,p.last_login_at,m.created_at,m.approved_at
  from public.organization_memberships m
  join public.profiles p on p.id=m.user_id
  where m.organization_id=p_org_id
  order by case when m.status='pending' then 0 else 1 end, lower(coalesce(p.full_name,p.username));
end;
$$;
grant execute on function public.admin_list_members(uuid) to authenticated;

create or replace function public.admin_update_member(
  p_org_id uuid,
  p_member_id uuid,
  p_role text,
  p_status text,
  p_department text,
  p_permissions jsonb
)
returns public.organization_memberships
language plpgsql security definer set search_path=public
as $$
declare v_m public.organization_memberships; v_perms jsonb;
begin
  if not public.is_org_admin(auth.uid(),p_org_id) then raise exception 'Access denied'; end if;
  if p_role not in ('super_admin','hse_admin','hse_engineer','hse_officer','supervisor','employee','contractor','management','auditor','guest') then raise exception 'Invalid role'; end if;
  if p_status not in ('pending','active','suspended','rejected') then raise exception 'Invalid status'; end if;
  if p_member_id is null then raise exception 'Member is required'; end if;
  if exists(select 1 from public.organization_memberships z where z.id=p_member_id and z.user_id=auth.uid() and z.status='active' and z.role='super_admin') and p_status<>'active' then raise exception 'The current Super Admin cannot deactivate their own access'; end if;
  if exists(select 1 from public.organization_memberships z where z.id=p_member_id and z.user_id=auth.uid() and z.status='active' and z.role='super_admin' and p_role<>'super_admin') and not exists(select 1 from public.organization_memberships z where z.organization_id=p_org_id and z.status='active' and z.role='super_admin' and z.user_id<>auth.uid()) then raise exception 'Keep at least one Super Admin in the company'; end if;
  v_perms := coalesce(p_permissions,public.default_permissions_for_role(p_role));
  update public.organization_memberships
  set role=p_role,status=p_status,department=nullif(trim(p_department),''),permissions=v_perms,
      approved_by=case when p_status='active' then auth.uid() else approved_by end,
      approved_at=case when p_status='active' then coalesce(approved_at,now()) else approved_at end,
      updated_at=now()
  where id=p_member_id and organization_id=p_org_id
  returning * into v_m;
  if v_m.id is null then raise exception 'Membership not found'; end if;
  insert into public.audit_events(organization_id,actor_id,action,target_type,target_id,details)
  values(p_org_id,auth.uid(),'UPDATE_MEMBER','membership',v_m.id,jsonb_build_object('user_id',v_m.user_id,'role',v_m.role,'status',v_m.status));
  return v_m;
end;
$$;
grant execute on function public.admin_update_member(uuid,uuid,text,text,text,jsonb) to authenticated;

create or replace function public.admin_update_organization(
  p_org_id uuid,
  p_name text,
  p_legal_name text,
  p_industry text,
  p_country text,
  p_address text,
  p_logo_url text,
  p_numbering_prefix text
)
returns public.organizations
language plpgsql security definer set search_path=public
as $$
declare v_o public.organizations;
begin
  if not public.is_org_admin(auth.uid(),p_org_id) then raise exception 'Access denied'; end if;
  update public.organizations set name=trim(p_name),legal_name=nullif(trim(p_legal_name),''),industry=nullif(trim(p_industry),''),country=coalesce(nullif(trim(p_country),''),country),address=nullif(trim(p_address),''),logo_url=nullif(trim(p_logo_url),''),updated_at=now()
  where id=p_org_id returning * into v_o;
  if v_o.id is null then raise exception 'Organization not found'; end if;
  update public.organization_settings set numbering_prefix=coalesce(nullif(regexp_replace(upper(trim(p_numbering_prefix)),'[^A-Z0-9]','','g'),''),numbering_prefix),updated_at=now() where organization_id=p_org_id;
  return v_o;
end;
$$;
grant execute on function public.admin_update_organization(uuid,text,text,text,text,text,text,text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) Tenant-aware reference generation and audited CRUD
-- -----------------------------------------------------------------------------
create or replace function public.next_hse_reference(p_org_id uuid,p_module text,p_year integer)
returns text
language plpgsql security definer set search_path=public
as $$
declare
  v_no integer;
  v_prefix text;
  v_code text;
begin
  if not public.is_org_member(auth.uid(),p_org_id) then raise exception 'Access denied'; end if;
  v_code := upper(coalesce((select code from (values
    ('observations','OB'),('incidents','INC'),('near_miss','NM'),('first_aid','FA'),('accidents','ACC'),('inspections','INS'),('actions','CAR'),
    ('training','TR'),('tbt','TBT'),('drills','DRL'),('manhours','MH'),('permits','PTW'),('risk','RA'),('chemicals','CHM'),('waste','WST'),('energy','ENR'),
    ('audit','AUD'),('ncr','NCR'),('documents','DOC'),('legal','LEG'),('objectives','OBJ'),('employees','EMP'),('ppe','PPE'),('competencies','CMP'),
    ('licenses','LIC'),('fire_equipment','FIR'),('third_party','TPV')
  ) as x(module,code) where module=p_module), 'REC'));
  v_prefix := coalesce((select numbering_prefix from public.organization_settings where organization_id=p_org_id),'HSE360');
  insert into public.organization_reference_seq(organization_id,module,year,last_no) values(p_org_id,p_module,p_year,1)
  on conflict (organization_id,module,year) do update set last_no=public.organization_reference_seq.last_no+1
  returning last_no into v_no;
  return v_prefix || '-' || v_code || '-' || p_year::text || '-' || lpad(v_no::text,5,'0');
end;
$$;

-- Remove unsafe legacy signatures so the old app cannot bypass tenant context.
drop function if exists public.create_hse_record(text,date,text,text,text,text,jsonb,jsonb);
drop function if exists public.update_hse_record(uuid,date,text,text,text,text,jsonb,jsonb);
drop function if exists public.delete_hse_record(uuid);

create or replace function public.create_hse_record(
  p_org_id uuid,
  p_module text,
  p_event_date date,
  p_location text,
  p_department text,
  p_status text,
  p_summary text,
  p_data jsonb default '{}'::jsonb,
  p_attachment jsonb default null
)
returns public.hse_records
language plpgsql security definer set search_path=public
as $$
declare
  v_r public.hse_records;
  v_ref text;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.has_module_permission(auth.uid(),p_org_id,p_module,'create') then raise exception 'You do not have permission to create % records',p_module; end if;
  select coalesce(full_name,username) into v_name from public.profiles where id=auth.uid();
  v_ref := public.next_hse_reference(p_org_id,p_module,extract(year from coalesce(p_event_date,current_date))::integer);
  insert into public.hse_records(organization_id,module,reference_no,event_date,location,department,status,summary,data,attachment,created_by,created_by_name)
  values(p_org_id,p_module,v_ref,coalesce(p_event_date,current_date),nullif(trim(p_location),''),nullif(trim(p_department),''),coalesce(nullif(trim(p_status),''),'open'),trim(p_summary),coalesce(p_data,'{}'::jsonb),p_attachment,auth.uid(),v_name)
  returning * into v_r;
  insert into public.audit_events(organization_id,actor_id,action,target_type,target_id,details)
  values(p_org_id,auth.uid(),'CREATE','hse_record',v_r.id,jsonb_build_object('reference_no',v_r.reference_no,'module',v_r.module));
  return v_r;
end;
$$;
grant execute on function public.create_hse_record(uuid,text,date,text,text,text,text,jsonb,jsonb) to authenticated;

create or replace function public.update_hse_record(
  p_org_id uuid,
  p_id uuid,
  p_event_date date,
  p_location text,
  p_department text,
  p_status text,
  p_summary text,
  p_data jsonb,
  p_attachment jsonb default null
)
returns public.hse_records
language plpgsql security definer set search_path=public
as $$
declare r public.hse_records;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into r from public.hse_records where id=p_id and organization_id=p_org_id;
  if r.id is null then raise exception 'Record not found'; end if;
  if not (public.has_module_permission(auth.uid(),p_org_id,r.module,'edit_own',r.created_by) or public.has_module_permission(auth.uid(),p_org_id,r.module,'edit_all',r.created_by)) then raise exception 'You do not have permission to edit this record'; end if;
  update public.hse_records set event_date=coalesce(p_event_date,event_date),location=nullif(trim(p_location),''),department=nullif(trim(p_department),''),status=coalesce(nullif(trim(p_status),''),status),summary=trim(p_summary),data=coalesce(p_data,'{}'::jsonb),attachment=p_attachment,updated_at=now() where id=p_id returning * into r;
  insert into public.audit_events(organization_id,actor_id,action,target_type,target_id,details)
  values(p_org_id,auth.uid(),'UPDATE','hse_record',r.id,jsonb_build_object('reference_no',r.reference_no,'module',r.module));
  return r;
end;
$$;
grant execute on function public.update_hse_record(uuid,uuid,date,text,text,text,text,jsonb,jsonb) to authenticated;

create or replace function public.delete_hse_record(p_org_id uuid,p_id uuid)
returns void
language plpgsql security definer set search_path=public
as $$
declare r public.hse_records;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into r from public.hse_records where id=p_id and organization_id=p_org_id;
  if r.id is null then raise exception 'Record not found'; end if;
  if not (public.has_module_permission(auth.uid(),p_org_id,r.module,'delete_own',r.created_by) or public.has_module_permission(auth.uid(),p_org_id,r.module,'delete_all',r.created_by)) then raise exception 'You do not have permission to delete this record'; end if;
  delete from public.hse_records where id=p_id;
  insert into public.audit_events(organization_id,actor_id,action,target_type,target_id,details)
  values(p_org_id,auth.uid(),'DELETE','hse_record',r.id,jsonb_build_object('reference_no',r.reference_no,'module',r.module));
end;
$$;
grant execute on function public.delete_hse_record(uuid,uuid) to authenticated;

create or replace function public.touch_last_login()
returns void language plpgsql security definer set search_path=public as $$ begin if auth.uid() is null then raise exception 'Not authenticated'; end if; update public.profiles set last_login_at=now() where id=auth.uid(); end $$;
grant execute on function public.touch_last_login() to authenticated;

create or replace function public.complete_password_change()
returns void language plpgsql security definer set search_path=public as $$ begin if auth.uid() is null then raise exception 'Not authenticated'; end if; update public.profiles set must_change_password=false where id=auth.uid(); end $$;
grant execute on function public.complete_password_change() to authenticated;

-- -----------------------------------------------------------------------------
-- 7) RLS — the database, not the UI, enforces company separation
-- -----------------------------------------------------------------------------
-- Remove pre-V8 public policies on the HSE360 tables so permissive legacy policies
-- cannot accidentally combine with the V8 tenant policies.
DO $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename in ('profiles','organizations','organization_settings','organization_memberships','hse_records','audit_events')
  loop
    execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
end $$;

-- The legacy profile-access RPC is no longer the V8 authorization path.
drop function if exists public.admin_update_profile(uuid,text,boolean);
drop function if exists public.register_nuhas_user(text,text,text,text,text);

alter table public.organizations enable row level security;
alter table public.organization_settings enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.hse_records enable row level security;
alter table public.audit_events enable row level security;
alter table public.profiles enable row level security;

-- Profiles: own profile only. Admin directory is supplied by the audited RPC.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select to authenticated using (id=auth.uid());

-- Organizations: a user can see only organizations where they are an active member.
drop policy if exists org_select_members on public.organizations;
create policy org_select_members on public.organizations for select to authenticated using (public.is_org_member(auth.uid(),id));
drop policy if exists org_update_admin on public.organizations;
create policy org_update_admin on public.organizations for update to authenticated using (public.is_org_admin(auth.uid(),id)) with check (public.is_org_admin(auth.uid(),id));

-- Settings: members can read settings; admins can update.
drop policy if exists org_settings_select_members on public.organization_settings;
create policy org_settings_select_members on public.organization_settings for select to authenticated using (public.is_org_member(auth.uid(),organization_id));
drop policy if exists org_settings_update_admin on public.organization_settings;
create policy org_settings_update_admin on public.organization_settings for update to authenticated using (public.is_org_admin(auth.uid(),organization_id)) with check (public.is_org_admin(auth.uid(),organization_id));

-- Memberships: self + same-org admins can read. Changes go through RPC only.
drop policy if exists membership_select on public.organization_memberships;
create policy membership_select on public.organization_memberships for select to authenticated using (user_id=auth.uid() or public.is_org_admin(auth.uid(),organization_id));
revoke insert,update,delete on public.organization_memberships from authenticated;

-- HSE records: active org membership + module view permission. Direct mutations are disabled; audited RPCs perform writes.
drop policy if exists records_select on public.hse_records;
drop policy if exists records_insert on public.hse_records;
drop policy if exists records_update on public.hse_records;
drop policy if exists records_delete on public.hse_records;
create policy records_select on public.hse_records for select to authenticated
using (public.has_module_permission(auth.uid(),organization_id,module,'view',created_by));
revoke insert,update,delete on public.hse_records from authenticated;

-- Audit events: same-org admins only.
drop policy if exists audit_select on public.audit_events;
create policy audit_select on public.audit_events for select to authenticated using (public.is_org_admin(auth.uid(),organization_id));
revoke insert,update,delete on public.audit_events from authenticated;

-- -----------------------------------------------------------------------------
-- 8) Indexes and updated_at triggers
-- -----------------------------------------------------------------------------
create index if not exists hse_records_org_module_date_idx on public.hse_records(organization_id,module,event_date desc);
create index if not exists hse_records_org_created_at_idx on public.hse_records(organization_id,created_at desc);
create index if not exists hse_records_org_reference_idx on public.hse_records(organization_id,reference_no);
create index if not exists hse_records_org_creator_idx on public.hse_records(organization_id,created_by);
create index if not exists audit_events_org_created_at_idx on public.audit_events(organization_id,created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();

drop trigger if exists org_settings_updated_at on public.organization_settings;
create trigger org_settings_updated_at before update on public.organization_settings for each row execute function public.set_updated_at();

drop trigger if exists memberships_updated_at on public.organization_memberships;
create trigger memberships_updated_at before update on public.organization_memberships for each row execute function public.set_updated_at();

drop trigger if exists hse_records_updated_at on public.hse_records;
create trigger hse_records_updated_at before update on public.hse_records for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9) Storage
-- -----------------------------------------------------------------------------
insert into storage.buckets(id,name,public) values('hse-attachments','hse-attachments',false) on conflict (id) do nothing;
insert into storage.buckets(id,name,public) values('org-branding','org-branding',true) on conflict (id) do update set public=true;

drop policy if exists hse_attachments_select on storage.objects;
create policy hse_attachments_select on storage.objects for select to authenticated
using (bucket_id='hse-attachments' and public.is_org_member(auth.uid(),(storage.foldername(name))[1]::uuid));
drop policy if exists hse_attachments_insert on storage.objects;
create policy hse_attachments_insert on storage.objects for insert to authenticated
with check (bucket_id='hse-attachments' and public.is_org_member(auth.uid(),(storage.foldername(name))[1]::uuid));
drop policy if exists hse_attachments_delete on storage.objects;
create policy hse_attachments_delete on storage.objects for delete to authenticated
using (bucket_id='hse-attachments' and (public.is_org_member(auth.uid(),(storage.foldername(name))[1]::uuid)) and ((storage.foldername(name))[2]=auth.uid()::text or public.is_org_admin(auth.uid(),(storage.foldername(name))[1]::uuid)));

drop policy if exists org_branding_insert on storage.objects;
create policy org_branding_insert on storage.objects for insert to authenticated
with check (bucket_id='org-branding' and public.is_org_admin(auth.uid(),(storage.foldername(name))[1]::uuid));
drop policy if exists org_branding_update on storage.objects;
create policy org_branding_update on storage.objects for update to authenticated
using (bucket_id='org-branding' and public.is_org_admin(auth.uid(),(storage.foldername(name))[1]::uuid))
with check (bucket_id='org-branding' and public.is_org_admin(auth.uid(),(storage.foldername(name))[1]::uuid));
drop policy if exists org_branding_delete on storage.objects;
create policy org_branding_delete on storage.objects for delete to authenticated
using (bucket_id='org-branding' and public.is_org_admin(auth.uid(),(storage.foldername(name))[1]::uuid));

commit;
