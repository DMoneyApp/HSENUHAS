-- NUHAS HSE360 V8.10.9: retain the current record attachment when a client omits
-- p_attachment or supplies NULL. This RPC has no attachment-removal operation;
-- replacement remains supported by passing new attachment metadata.
-- Apply only after confirming the V8 tenant-aware schema is installed.

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
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.hse_records;
  v_old_status text;
  v_status text;
  v_name text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into r from public.hse_records where id=p_id and organization_id=p_org_id;
  if r.id is null then raise exception 'Record not found'; end if;
  v_old_status := r.status;
  if not (
    public.has_module_permission(auth.uid(),p_org_id,r.module,'edit_own',r.created_by)
    or public.has_module_permission(auth.uid(),p_org_id,r.module,'edit_all',r.created_by)
  ) then raise exception 'You do not have permission to edit this record'; end if;
  v_status := coalesce(nullif(trim(p_status),''),r.status);
  if r.module='permits' then
    if v_status not in ('draft','pending_approval','approved','suspended','closed','expired') then
      raise exception 'Invalid work-permit status';
    end if;
    if v_status='approved' then
      perform public.hse360_validate_permit_authorization(p_org_id,coalesce(p_data,'{}'::jsonb));
      select coalesce(full_name,username) into v_name from public.profiles where id=auth.uid();
      p_data := coalesce(p_data,'{}'::jsonb) || jsonb_build_object('approved_by_user_id',auth.uid(),'approved_by_name',v_name,'approved_at',now());
    elsif r.status='approved' and v_status<>'approved' then
      p_data := coalesce(p_data,'{}'::jsonb) || jsonb_build_object('approval_revoked_at',now(),'approval_revoked_by',auth.uid());
    end if;
  end if;
  update public.hse_records as target
  set event_date=coalesce(p_event_date,target.event_date),
      location=nullif(trim(p_location),''),
      department=nullif(trim(p_department),''),
      status=v_status,
      summary=trim(p_summary),
      data=coalesce(p_data,'{}'::jsonb),
      attachment=coalesce(p_attachment,target.attachment),
      updated_at=now()
  where target.id=p_id returning target.* into r;
  insert into public.audit_events(organization_id,actor_id,action,target_type,target_id,details)
  values(p_org_id,auth.uid(),case when r.module='permits' and v_status='approved' and v_old_status<>'approved' then 'APPROVE' else 'UPDATE' end,
         'hse_record',r.id,jsonb_build_object('reference_no',r.reference_no,'module',r.module,'status',r.status));
  return r;
end;
$$;

revoke all on function public.update_hse_record(uuid,uuid,date,text,text,text,text,jsonb,jsonb) from public;
grant execute on function public.update_hse_record(uuid,uuid,date,text,text,text,text,jsonb,jsonb) to authenticated;
