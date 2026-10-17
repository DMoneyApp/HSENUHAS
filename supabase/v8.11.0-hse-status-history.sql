-- V8.11.0 operational status history and closure integrity.
-- Candidate migration only. Review the deployed schema and apply to staging first.
create or replace function public.enforce_hse_status_history()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_history jsonb := '[]'::jsonb;
  v_old_status text;
  v_new_status text;
  v_effective timestamptz;
  v_remark text;
  v_open_actions integer;
begin
  if v_actor is not null then
    select coalesce(full_name,username,'User') into v_actor_name from public.profiles where id=v_actor;
  end if;
  v_actor_name := coalesce(v_actor_name,'System');
  v_new_status := lower(coalesce(nullif(trim(new.status),''),'open'));

  if tg_op='INSERT' then
    new.status := v_new_status;
    new.data := (coalesce(new.data,'{}'::jsonb) - 'update_history' - 'status_recorded_at' - 'status_recorded_by' - 'status_recorded_by_name')
      || jsonb_build_object('status_recorded_at',v_now,'status_recorded_by',v_actor,'status_recorded_by_name',v_actor_name,
        'update_history',jsonb_build_array(jsonb_build_object('previous_status',null,'new_status',v_new_status,'remark','Record created','actor_id',v_actor,'actor_name',v_actor_name,'recorded_at',v_now)));
    return new;
  end if;

  v_old_status := lower(coalesce(nullif(trim(old.status),''),'open'));
  v_history := case when jsonb_typeof(old.data->'update_history')='array' then old.data->'update_history' else '[]'::jsonb end;
  v_remark := coalesce(nullif(trim(new.data->>'latest_update_remark'),''),nullif(trim(new.data->>'closure_remark'),''),nullif(trim(new.data->>'reopen_reason'),''),nullif(trim(new.data->>'remarks'),''),'');

  if v_new_status='closed' and v_old_status<>'closed' and new.module in ('observations','near_miss','incidents','accidents','first_aid','actions') then
    if coalesce(trim(new.data->>'completion_work'),'')='' and coalesce(trim(new.data->>'completion_evidence'),'')='' then raise exception 'Record the corrective work and completion evidence before closure'; end if;
    if coalesce(trim(new.data->>'completion_person'),'')='' and coalesce(trim(new.data->>'verifier'),'')='' then raise exception 'Record who completed or verified the work before closure'; end if;
    if coalesce(trim(new.data->>'closure_remark'),trim(new.data->>'latest_update_remark'),'')='' then raise exception 'Closure remarks are required'; end if;
    begin v_effective := (new.data->>'effective_completion_at')::timestamptz; exception when others then v_effective := null; end;
    if v_effective is null then raise exception 'Effective completion date and time are required'; end if;
    if v_effective>v_now then raise exception 'Effective completion time cannot be in the future'; end if;
    if v_effective<v_now-interval '1 minute' and coalesce(trim(new.data->>'backdate_reason'),'')='' then raise exception 'A reason is required for retrospective completion'; end if;
    if new.module in ('observations','near_miss','incidents','accidents','first_aid') then
      select count(*) into v_open_actions from public.hse_records a where a.organization_id=new.organization_id and a.module='actions'
        and (a.data->>'source_record_id'=new.id::text or a.data->>'related_reference'=new.reference_no)
        and lower(coalesce(a.status,'')) not in ('closed','cancelled','void','draft');
      if v_open_actions>0 then raise exception 'Close outstanding linked corrective actions before closing this case'; end if;
      if new.module in ('incidents','accidents') and lower(coalesce(new.data->>'severity','')) in ('major','critical') and not exists(
        select 1 from public.hse_records a where a.organization_id=new.organization_id and a.module='actions'
        and (a.data->>'source_record_id'=new.id::text or a.data->>'related_reference'=new.reference_no)) then
        raise exception 'A major or critical case needs a linked corrective action before closure';
      end if;
    end if;
  end if;
  if v_old_status='closed' and v_new_status<>'closed' and new.module in ('observations','near_miss','incidents','accidents','first_aid','actions') and coalesce(trim(new.data->>'reopen_reason'),trim(new.data->>'latest_update_remark'),trim(new.data->>'remarks'),'')='' then
    raise exception 'A reason is required to reopen a closed record';
  end if;

  if v_new_status is distinct from v_old_status or new.data->>'latest_update_remark' is distinct from old.data->>'latest_update_remark'
    or new.data->>'closure_remark' is distinct from old.data->>'closure_remark' or new.data->>'reopen_reason' is distinct from old.data->>'reopen_reason'
    or new.data->>'remarks' is distinct from old.data->>'remarks' then
    v_history := v_history || jsonb_build_array(jsonb_build_object('previous_status',v_old_status,'new_status',v_new_status,'remark',v_remark,
      'closure_work',new.data->>'completion_work','completion_person',new.data->>'completion_person','effective_completion_at',new.data->>'effective_completion_at',
      'backdate_reason',new.data->>'backdate_reason','reopen_reason',new.data->>'reopen_reason','actor_id',v_actor,'actor_name',v_actor_name,'recorded_at',v_now));
    new.data := (coalesce(new.data,'{}'::jsonb) - 'update_history' - 'status_recorded_at' - 'status_recorded_by' - 'status_recorded_by_name')
      || jsonb_build_object('update_history',v_history,'status_recorded_at',v_now,'status_recorded_by',v_actor,'status_recorded_by_name',v_actor_name);
  else
    new.data := (coalesce(new.data,'{}'::jsonb) - 'update_history' - 'status_recorded_at' - 'status_recorded_by' - 'status_recorded_by_name')
      || jsonb_build_object('update_history',v_history,'status_recorded_at',old.data->'status_recorded_at','status_recorded_by',old.data->'status_recorded_by','status_recorded_by_name',old.data->'status_recorded_by_name');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hse_status_history on public.hse_records;
create trigger trg_hse_status_history
before insert or update of status,data on public.hse_records
for each row execute function public.enforce_hse_status_history();

revoke all on function public.enforce_hse_status_history() from public, anon, authenticated;

