-- NUHAS HSE360 V8.8.1 candidate migration: server-side verified corrective-action closure.
-- REVIEW/TEST ONLY. Apply to a backed-up staging database first; do not run blindly in production.
-- Expected base: public.hse_records, public.audit_events, and tenant-aware record RPCs from v8-multitenant.sql.

create or replace function public.enforce_verified_action_closure()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner text := nullif(btrim(coalesce(new.data->>'responsible', '')), '');
  v_priority text := lower(nullif(btrim(coalesce(new.data->>'priority', '')), ''));
  v_due_at text := nullif(btrim(coalesce(new.data->>'due_date', '')), '');
  v_due_date date;
  v_verification text := nullif(btrim(coalesce(new.data->>'verification', '')), '');
  v_evidence text := nullif(btrim(coalesce(new.data->>'completion_evidence', '')), '');
  v_effectiveness text := lower(nullif(btrim(coalesce(new.data->>'effectiveness_status', '')), ''));
  v_verifier text := nullif(btrim(coalesce(new.data->>'verifier', '')), '');
  v_verified_at text := nullif(btrim(coalesce(new.data->>'verified_at', '')), '');
  v_verified_date date;
begin
  if new.module <> 'actions' or lower(coalesce(new.status, '')) <> 'closed' then
    return new;
  end if;

  -- Allow unrelated edits to a legacy closed action whose closure signature is unchanged.
  -- If closure-critical values change, the record must satisfy the new gate.
  if tg_op = 'UPDATE'
     and old.module = 'actions'
     and lower(coalesce(old.status, '')) = 'closed'
     and old.data->>'responsible' is not distinct from new.data->>'responsible'
     and old.data->>'due_date' is not distinct from new.data->>'due_date'
     and old.data->>'priority' is not distinct from new.data->>'priority'
     and old.data->>'verification' is not distinct from new.data->>'verification'
     and old.data->>'completion_evidence' is not distinct from new.data->>'completion_evidence'
     and old.data->>'effectiveness_status' is not distinct from new.data->>'effectiveness_status'
     and old.data->>'verifier' is not distinct from new.data->>'verifier'
     and old.data->>'verified_at' is not distinct from new.data->>'verified_at' then
    return new;
  end if;

  if v_owner is null then
    raise exception 'Corrective action cannot close without a responsible owner.' using errcode = '23514';
  end if;
  if v_due_at is null or v_due_at !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Corrective action cannot close without a valid due date.' using errcode = '23514';
  end if;
  begin
    v_due_date := v_due_at::date;
  exception when others then
    raise exception 'Corrective action due date is not a valid calendar date.' using errcode = '23514';
  end;
  if v_priority is null or v_priority not in ('low','medium','high','critical') then
    raise exception 'Corrective action cannot close without a valid priority.' using errcode = '23514';
  end if;
  if v_verification is null then
    raise exception 'Define the acceptance/effectiveness criteria before closing the action.' using errcode = '23514';
  end if;
  if v_evidence is null then
    raise exception 'Describe objective completion evidence and its reference before closure.' using errcode = '23514';
  end if;
  if v_effectiveness is distinct from 'effective' then
    raise exception 'Corrective action cannot close until effectiveness is verified as Effective.' using errcode = '23514';
  end if;
  if v_verifier is null then
    raise exception 'Name the person who verified effectiveness.' using errcode = '23514';
  end if;
  if lower(regexp_replace(v_verifier, '\s+', ' ', 'g')) = lower(regexp_replace(v_owner, '\s+', ' ', 'g')) then
    raise exception 'Effectiveness verifier must be different from the action owner.' using errcode = '23514';
  end if;
  if v_verified_at is null or v_verified_at !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Enter a valid ISO verification date before closure.' using errcode = '23514';
  end if;
  begin
    v_verified_date := v_verified_at::date;
  exception when others then
    raise exception 'Verification date is not a valid calendar date.' using errcode = '23514';
  end;
  if v_verified_date > current_date then
    raise exception 'Verification date cannot be in the future.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_verified_action_closure() from public;

drop trigger if exists hse_records_enforce_verified_action_closure on public.hse_records;
create trigger hse_records_enforce_verified_action_closure
before insert or update of module, status, data
on public.hse_records
for each row execute function public.enforce_verified_action_closure();

comment on function public.enforce_verified_action_closure() is
  'V8.8.1 candidate: prevents unverified action closure; staging validation required before production use.';
