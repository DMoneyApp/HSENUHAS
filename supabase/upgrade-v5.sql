-- NUHAS HSE360 v5 safe upgrade for an existing production schema.
-- Run AFTER the original NUHAS schema + registration-fix SQL.
-- This does not expose passwords or service-role keys.

create or replace function public.touch_last_login()
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.profiles set last_login_at=now() where id=auth.uid();
end;
$$;
grant execute on function public.touch_last_login() to authenticated;

create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.profiles set must_change_password=false where id=auth.uid();
end;
$$;
grant execute on function public.complete_password_change() to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;
drop trigger if exists hse_records_updated_at on public.hse_records;
create trigger hse_records_updated_at before update on public.hse_records for each row execute function public.set_updated_at();

create or replace function public.update_hse_record(
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
language plpgsql
security definer
set search_path=public
as $$
declare r public.hse_records;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and active=true) then raise exception 'Account inactive'; end if;
  update public.hse_records
    set event_date=coalesce(p_event_date,event_date), location=p_location, department=p_department,
        status=p_status, summary=p_summary, data=coalesce(p_data,'{}'::jsonb), attachment=p_attachment
  where id=p_id
    and (created_by=auth.uid() or public.is_admin(auth.uid()))
  returning * into r;
  if r.id is null then raise exception 'Record not found or access denied'; end if;
  insert into public.audit_events(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'UPDATE','hse_record',r.id,jsonb_build_object('reference_no',r.reference_no,'module',r.module));
  return r;
end;
$$;
grant execute on function public.update_hse_record(uuid,date,text,text,text,text,jsonb,jsonb) to authenticated;

create or replace function public.delete_hse_record(p_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare r public.hse_records;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into r from public.hse_records where id=p_id;
  if r.id is null then raise exception 'Record not found'; end if;
  if r.created_by<>auth.uid() and not public.is_admin(auth.uid()) then raise exception 'Access denied'; end if;
  delete from public.hse_records where id=p_id;
  insert into public.audit_events(actor_id,action,target_type,target_id,details)
  values(auth.uid(),'DELETE','hse_record',r.id,jsonb_build_object('reference_no',r.reference_no,'module',r.module));
end;
$$;
grant execute on function public.delete_hse_record(uuid) to authenticated;

-- Direct table writes remain tightly controlled; the application uses security-definer RPCs.
drop policy if exists records_update on public.hse_records;
create policy records_update on public.hse_records for update to authenticated
using (created_by=auth.uid() or public.is_admin(auth.uid()))
with check (created_by=auth.uid() or public.is_admin(auth.uid()));

drop policy if exists records_delete on public.hse_records;
create policy records_delete on public.hse_records for delete to authenticated
using (created_by=auth.uid() or public.is_admin(auth.uid()));

-- Helpful indexes for the management dashboard.
create index if not exists hse_records_status_idx on public.hse_records(status);
create index if not exists hse_records_department_idx on public.hse_records(department);
create index if not exists audit_events_created_at_idx on public.audit_events(created_at desc);
