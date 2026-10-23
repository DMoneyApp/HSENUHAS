-- NUHAS HSE360 V8.11.1 — organisation-scoped controlled document master
-- Apply to STAGING first. This migration does not alter existing HSE records.
begin;

create table if not exists public.org_document_control_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  prefix text not null default 'ORG' check (prefix ~ '^[A-Z0-9_-]{2,20}$'),
  default_issue_date date not null default current_date,
  number_format text not null default '{PREFIX}/{CODE}/{SEQ}',
  revision_default text not null default '00',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint org_document_control_format_tokens check (
    position('{PREFIX}' in number_format)>0 and
    position('{CODE}' in number_format)>0 and
    position('{SEQ}' in number_format)>0
  )
);

create table if not exists public.org_document_master (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_name text not null check (length(trim(document_name)) between 2 and 240),
  document_code text not null check (document_code ~ '^[A-Z0-9_-]{2,30}$'),
  prefix text not null default 'ORG' check (prefix ~ '^[A-Z0-9_-]{2,20}$'),
  sequence_no integer not null default 1 check (sequence_no between 1 and 999999),
  document_no text not null,
  revision_no text not null default '00',
  issue_date date not null default current_date,
  effective_from date not null default current_date,
  effective_to date,
  reviewer_name text,
  approver_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint org_document_master_effective_dates check (effective_to is null or effective_to >= effective_from),
  constraint org_document_master_org_docno_unique unique (organization_id, document_no)
);
create index if not exists org_document_master_org_name_idx on public.org_document_master(organization_id, lower(document_name));
create index if not exists org_document_master_org_code_idx on public.org_document_master(organization_id, document_code);

create table if not exists public.org_document_master_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.org_document_master(id) on delete cascade,
  snapshot jsonb not null,
  change_type text not null default 'updated',
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null
);
create index if not exists org_document_master_history_doc_idx on public.org_document_master_history(organization_id,document_id,changed_at desc);

alter table public.org_document_control_settings enable row level security;
alter table public.org_document_master enable row level security;
alter table public.org_document_master_history enable row level security;

drop policy if exists org_document_control_settings_select on public.org_document_control_settings;
create policy org_document_control_settings_select on public.org_document_control_settings for select to authenticated
using (public.is_org_member(auth.uid(),organization_id));
drop policy if exists org_document_control_settings_insert on public.org_document_control_settings;
create policy org_document_control_settings_insert on public.org_document_control_settings for insert to authenticated
with check (public.is_org_admin(auth.uid(),organization_id));
drop policy if exists org_document_control_settings_update on public.org_document_control_settings;
create policy org_document_control_settings_update on public.org_document_control_settings for update to authenticated
using (public.is_org_admin(auth.uid(),organization_id)) with check (public.is_org_admin(auth.uid(),organization_id));
drop policy if exists org_document_master_select on public.org_document_master;
create policy org_document_master_select on public.org_document_master for select to authenticated
using (public.is_org_member(auth.uid(),organization_id));
drop policy if exists org_document_master_insert on public.org_document_master;
create policy org_document_master_insert on public.org_document_master for insert to authenticated
with check (public.is_org_admin(auth.uid(),organization_id));
drop policy if exists org_document_master_update on public.org_document_master;
create policy org_document_master_update on public.org_document_master for update to authenticated
using (public.is_org_admin(auth.uid(),organization_id)) with check (public.is_org_admin(auth.uid(),organization_id));
drop policy if exists org_document_master_delete on public.org_document_master;
create policy org_document_master_delete on public.org_document_master for delete to authenticated
using (public.is_org_admin(auth.uid(),organization_id));
drop policy if exists org_document_master_history_select on public.org_document_master_history;
create policy org_document_master_history_select on public.org_document_master_history for select to authenticated
using (public.is_org_member(auth.uid(),organization_id));

create or replace function public.log_org_document_master_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.org_document_master_history(organization_id,document_id,snapshot,change_type,changed_by)
    values(new.organization_id,new.id,to_jsonb(new),'created',auth.uid());
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.organization_id <> old.organization_id then
      raise exception 'Document master entries cannot be moved between organisations';
    end if;
    insert into public.org_document_master_history(organization_id,document_id,snapshot,change_type,changed_by)
    values(old.organization_id,old.id,to_jsonb(old),'updated',auth.uid());
    new.updated_at := now();
    if new.updated_by is null then new.updated_by := auth.uid(); end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    insert into public.org_document_master_history(organization_id,document_id,snapshot,change_type,changed_by)
    values(old.organization_id,old.id,to_jsonb(old),'deleted',auth.uid());
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists org_document_master_history_trigger on public.org_document_master;
create trigger org_document_master_history_trigger
before insert or update or delete on public.org_document_master
for each row execute function public.log_org_document_master_history();

revoke all on public.org_document_control_settings, public.org_document_master, public.org_document_master_history from anon;
grant select,insert,update,delete on public.org_document_control_settings, public.org_document_master to authenticated;
grant select on public.org_document_master_history to authenticated;

commit;
