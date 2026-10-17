-- HSE360 V8.6 incremental enhancements.
-- Apply only after the existing V8 multi-tenant migration has been applied.
-- This migration is additive/backward-compatible and does not delete HSE records.
begin;

-- 1) Per-user notification read/dismiss state. Notifications themselves are derived
-- from HSE records; this table only stores a user's interaction with each alert.
create table if not exists public.user_notification_state (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  read_at timestamptz,
  dismissed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id, notification_key)
);
create index if not exists user_notification_state_user_idx
  on public.user_notification_state (organization_id, user_id, updated_at desc);

create or replace function public.hse360_notification_touch_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists user_notification_state_updated_at on public.user_notification_state;
create trigger user_notification_state_updated_at
before update on public.user_notification_state
for each row execute function public.hse360_notification_touch_updated_at();

alter table public.user_notification_state enable row level security;
drop policy if exists user_notice_select_own on public.user_notification_state;
drop policy if exists user_notice_insert_own on public.user_notification_state;
drop policy if exists user_notice_update_own on public.user_notification_state;
drop policy if exists user_notice_delete_own on public.user_notification_state;
create policy user_notice_select_own on public.user_notification_state
  for select to authenticated
  using (user_id = auth.uid() and public.is_org_member(auth.uid(), organization_id));
create policy user_notice_insert_own on public.user_notification_state
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_org_member(auth.uid(), organization_id));
create policy user_notice_update_own on public.user_notification_state
  for update to authenticated
  using (user_id = auth.uid() and public.is_org_member(auth.uid(), organization_id))
  with check (user_id = auth.uid() and public.is_org_member(auth.uid(), organization_id));
create policy user_notice_delete_own on public.user_notification_state
  for delete to authenticated
  using (user_id = auth.uid() and public.is_org_member(auth.uid(), organization_id));
grant select, insert, update, delete on public.user_notification_state to authenticated;

-- 2) Company logos are public assets by design, but upload/update/delete remains
-- restricted to company admins. Explicit SELECT policy is needed by Storage upload
-- with upsert and object checks. Recreate these policies deterministically.
insert into storage.buckets (id, name, public)
values ('org-branding', 'org-branding', true)
on conflict (id) do update set public = true;

drop policy if exists org_branding_select on storage.objects;
drop policy if exists org_branding_insert on storage.objects;
drop policy if exists org_branding_update on storage.objects;
drop policy if exists org_branding_delete on storage.objects;
create policy org_branding_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-branding'
    and public.is_org_member(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
create policy org_branding_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-branding'
    and public.is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
create policy org_branding_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-branding'
    and public.is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'org-branding'
    and public.is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
  );
create policy org_branding_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-branding'
    and public.is_org_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
  );


-- 3) Server-side permit approval checks. Frontend checks improve usability, but
-- the RPC is the actual authorization boundary. Drafts may be incomplete; an
-- Approved permit must pass this validation server-side.
create or replace function public.hse360_validate_permit_authorization(
  p_org_id uuid,
  p_data jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  permit_type text := lower(coalesce(p_data->>'permit_type',''));
  critical_type text := lower(coalesce(p_data->>'critical_type',''));
  missing text[] := array[]::text[];
  vf timestamptz;
  vu timestamptz;
begin
  if auth.uid() is null or not public.is_org_admin(auth.uid(), p_org_id) then
    raise exception 'Only an active organization administrator may approve a work permit';
  end if;
  if nullif(btrim(coalesce(p_data->>'valid_from','')), '') is null
     or nullif(btrim(coalesce(p_data->>'valid_until','')), '') is null then
    raise exception 'Permit valid-from and valid-until date/time are required before approval';
  end if;
  begin
    vf := (p_data->>'valid_from')::timestamptz;
    vu := (p_data->>'valid_until')::timestamptz;
  exception when others then
    raise exception 'Permit validity date/time is invalid';
  end;
  if vu <= vf then raise exception 'Permit valid-until must be later than valid-from'; end if;
  if vu <= now() then raise exception 'An expired permit cannot be approved'; end if;
  if permit_type not in ('general_work','hot_work','critical_work') then
    raise exception 'Select one of the three defined permit classes';
  end if;
  if nullif(btrim(coalesce(p_data->>'requestor','')), '') is null then missing := array_append(missing,'requestor'); end if;
  if nullif(btrim(coalesce(p_data->>'responsible_person','')), '') is null then missing := array_append(missing,'responsible person'); end if;
  if nullif(btrim(coalesce(p_data->>'risk_reference','')), '') is null then missing := array_append(missing,'risk assessment / JSA reference'); end if;
  if nullif(btrim(coalesce(p_data->>'hazards','')), '') is null then missing := array_append(missing,'hazards'); end if;
  if nullif(btrim(coalesce(p_data->>'controls','')), '') is null then missing := array_append(missing,'required controls'); end if;
  if nullif(btrim(coalesce(p_data->>'permit_issuer','')), '') is null then missing := array_append(missing,'permit issuer'); end if;
  if nullif(btrim(coalesce(p_data->>'permit_receiver','')), '') is null then missing := array_append(missing,'permit receiver'); end if;
  if permit_type = 'hot_work' then
    if coalesce(p_data->>'combustible_removed','') <> 'Yes' then missing := array_append(missing,'combustibles removed/protected'); end if;
    if coalesce(p_data->>'fire_extinguisher','') <> 'Yes' then missing := array_append(missing,'fire extinguisher availability'); end if;
    if coalesce(p_data->>'fire_watch','') <> 'Yes' then missing := array_append(missing,'fire watch'); end if;
  elsif permit_type = 'critical_work' then
    if nullif(btrim(coalesce(p_data->>'competent_supervisor','')), '') is null then missing := array_append(missing,'competent supervisor'); end if;
    if critical_type = 'confined_space' then
      if coalesce(p_data->>'entry_monitoring','') <> 'Yes' then missing := array_append(missing,'continuous atmosphere monitoring'); end if;
      if nullif(btrim(coalesce(p_data->>'o2_required','')), '') is null then missing := array_append(missing,'oxygen test result'); end if;
      if nullif(btrim(coalesce(p_data->>'lel_required','')), '') is null then missing := array_append(missing,'LEL test result'); end if;
      if nullif(btrim(coalesce(p_data->>'attendant','')), '') is null then missing := array_append(missing,'confined-space attendant'); end if;
      if nullif(btrim(coalesce(p_data->>'rescue_equipment','')), '') is null then missing := array_append(missing,'rescue equipment / standby'); end if;
    elsif critical_type = 'work_at_height' then
      if nullif(btrim(coalesce(p_data->>'height_equipment','')), '') is null then missing := array_append(missing,'work-at-height equipment'); end if;
      if coalesce(p_data->>'harness','') <> 'Yes' then missing := array_append(missing,'fall-protection selection'); end if;
      if nullif(btrim(coalesce(p_data->>'height_rescue','')), '') is null then missing := array_append(missing,'work-at-height rescue plan'); end if;
    elsif critical_type = 'electrical' then
      if nullif(btrim(coalesce(p_data->>'authorized_electrician','')), '') is null then missing := array_append(missing,'authorized electrician'); end if;
      if coalesce(p_data->>'electrical_isolation','') <> 'Yes' then missing := array_append(missing,'electrical isolation'); end if;
      if coalesce(p_data->>'test_before_touch','') <> 'Yes' then missing := array_append(missing,'test-before-touch'); end if;
    elsif critical_type = 'lifting' then
      if nullif(btrim(coalesce(p_data->>'lifting_plan','')), '') is null then missing := array_append(missing,'approved lifting plan'); end if;
      if nullif(btrim(coalesce(p_data->>'lifting_equipment','')), '') is null then missing := array_append(missing,'lifting equipment identification'); end if;
      if nullif(btrim(coalesce(p_data->>'lifting_swl','')), '') is null then missing := array_append(missing,'SWL/capacity'); end if;
      if nullif(btrim(coalesce(p_data->>'operator','')), '') is null then missing := array_append(missing,'competent operator'); end if;
      if nullif(btrim(coalesce(p_data->>'rigger','')), '') is null then missing := array_append(missing,'competent rigger/banksman'); end if;
    elsif critical_type = 'excavation' then
      if nullif(btrim(coalesce(p_data->>'excavation_depth','')), '') is null then missing := array_append(missing,'excavation depth'); end if;
      if coalesce(p_data->>'underground_services','') <> 'Yes' then missing := array_append(missing,'underground services identification'); end if;
      if nullif(btrim(coalesce(p_data->>'safe_access','')), '') is null then missing := array_append(missing,'safe access/egress'); end if;
    elsif critical_type = 'line_breaking' then
      if nullif(btrim(coalesce(p_data->>'process_isolation','')), '') is null then missing := array_append(missing,'process isolation'); end if;
      if coalesce(p_data->>'depressurized','') <> 'Yes' then missing := array_append(missing,'depressurised/drained confirmation'); end if;
      if nullif(btrim(coalesce(p_data->>'chemical_ppe','')), '') is null then missing := array_append(missing,'chemical-specific PPE'); end if;
    elsif critical_type = 'chemical_work' then
      if nullif(btrim(coalesce(p_data->>'chemical_name','')), '') is null then missing := array_append(missing,'chemical name'); end if;
      if nullif(btrim(coalesce(p_data->>'sds_reference','')), '') is null then missing := array_append(missing,'SDS reference'); end if;
      if nullif(btrim(coalesce(p_data->>'exposure_controls','')), '') is null then missing := array_append(missing,'exposure controls'); end if;
      if nullif(btrim(coalesce(p_data->>'spill_response','')), '') is null then missing := array_append(missing,'spill response'); end if;
      if nullif(btrim(coalesce(p_data->>'compatibility','')), '') is null then missing := array_append(missing,'compatibility/segregation'); end if;
    elsif critical_type = 'energy_isolation' then
      if nullif(btrim(coalesce(p_data->>'loto_points','')), '') is null then missing := array_append(missing,'isolation points'); end if;
      if coalesce(p_data->>'zero_energy','') <> 'Yes' then missing := array_append(missing,'zero-energy verification'); end if;
      if coalesce(p_data->>'try_test','') <> 'Yes' then missing := array_append(missing,'try/test result'); end if;
      if nullif(btrim(coalesce(p_data->>'isolated_by','')), '') is null then missing := array_append(missing,'person performing isolation'); end if;
    elsif critical_type = 'other' then
      if nullif(btrim(coalesce(p_data->>'critical_controls','')), '') is null then missing := array_append(missing,'specific critical controls'); end if;
    else
      missing := array_append(missing,'valid critical-work subtype');
    end if;
  end if;
  if cardinality(missing) > 0 then
    raise exception 'Permit cannot be approved. Complete/verify: %', array_to_string(missing, ', ');
  end if;
end;
$$;
revoke all on function public.hse360_validate_permit_authorization(uuid,jsonb) from public;
grant execute on function public.hse360_validate_permit_authorization(uuid,jsonb) to authenticated;

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
language plpgsql security definer set search_path = ''
as $$
declare
  v_r public.hse_records;
  v_ref text;
  v_name text;
  v_status text := coalesce(nullif(trim(p_status),''),'open');
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.has_module_permission(auth.uid(),p_org_id,p_module,'create') then raise exception 'You do not have permission to create % records',p_module; end if;
  if p_module = 'permits' then
    v_status := coalesce(nullif(trim(p_status),''),'draft');
    if v_status not in ('draft','pending_approval','approved','suspended','closed','expired') then raise exception 'Invalid work-permit status'; end if;
    if v_status = 'approved' then perform public.hse360_validate_permit_authorization(p_org_id,coalesce(p_data,'{}'::jsonb)); end if;
  end if;
  select coalesce(full_name,username) into v_name from public.profiles where id=auth.uid();
  if p_module = 'permits' and v_status = 'approved' then
    p_data := coalesce(p_data,'{}'::jsonb) || jsonb_build_object('approved_by_user_id',auth.uid(),'approved_by_name',v_name,'approved_at',now());
  end if;
  v_ref := public.next_hse_reference(p_org_id,p_module,extract(year from coalesce(p_event_date,current_date))::integer);
  insert into public.hse_records(organization_id,module,reference_no,event_date,location,department,status,summary,data,attachment,created_by,created_by_name)
  values(p_org_id,p_module,v_ref,coalesce(p_event_date,current_date),nullif(trim(p_location),''),nullif(trim(p_department),''),v_status,trim(p_summary),coalesce(p_data,'{}'::jsonb),p_attachment,auth.uid(),v_name)
  returning * into v_r;
  insert into public.audit_events(organization_id,actor_id,action,target_type,target_id,details)
  values(p_org_id,auth.uid(),case when p_module='permits' and v_status='approved' then 'APPROVE' else 'CREATE' end,'hse_record',v_r.id,jsonb_build_object('reference_no',v_r.reference_no,'module',v_r.module,'status',v_r.status));
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
language plpgsql security definer set search_path = ''
as $$
declare
  r public.hse_records;
  v_status text;
  v_old_status text;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into r from public.hse_records where id=p_id and organization_id=p_org_id;
  if r.id is null then raise exception 'Record not found'; end if;
  v_old_status := r.status;
  if not (public.has_module_permission(auth.uid(),p_org_id,r.module,'edit_own',r.created_by) or public.has_module_permission(auth.uid(),p_org_id,r.module,'edit_all',r.created_by)) then raise exception 'You do not have permission to edit this record'; end if;
  v_status := coalesce(nullif(trim(p_status),''),r.status);
  if r.module='permits' then
    if v_status not in ('draft','pending_approval','approved','suspended','closed','expired') then raise exception 'Invalid work-permit status'; end if;
    if v_status='approved' then
      perform public.hse360_validate_permit_authorization(p_org_id,coalesce(p_data,'{}'::jsonb));
      select coalesce(full_name,username) into v_name from public.profiles where id=auth.uid();
      p_data := coalesce(p_data,'{}'::jsonb) || jsonb_build_object('approved_by_user_id',auth.uid(),'approved_by_name',v_name,'approved_at',now());
    elsif r.status='approved' and v_status<>'approved' then
      p_data := coalesce(p_data,'{}'::jsonb) || jsonb_build_object('approval_revoked_at',now(),'approval_revoked_by',auth.uid());
    end if;
  end if;
  update public.hse_records as target set event_date=coalesce(p_event_date,target.event_date),location=nullif(trim(p_location),''),department=nullif(trim(p_department),''),status=v_status,summary=trim(p_summary),data=coalesce(p_data,'{}'::jsonb),attachment=coalesce(p_attachment,target.attachment),updated_at=now() where target.id=p_id returning target.* into r;
  insert into public.audit_events(organization_id,actor_id,action,target_type,target_id,details)
  values(p_org_id,auth.uid(),case when r.module='permits' and v_status='approved' and v_old_status<>'approved' then 'APPROVE' else 'UPDATE' end,'hse_record',r.id,jsonb_build_object('reference_no',r.reference_no,'module',r.module,'status',r.status));
  return r;
end;
$$;
grant execute on function public.update_hse_record(uuid,uuid,date,text,text,text,text,jsonb,jsonb) to authenticated;

commit;
