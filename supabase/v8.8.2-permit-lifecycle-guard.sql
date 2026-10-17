-- NUHAS HSE360 V8.8.2 candidate: database-side work permit lifecycle guard.
-- REVIEW/TEST ONLY. Back up and validate on staging before considering production.
-- Expected dependencies: public.hse_records, public.is_org_admin(uuid,uuid),
-- public.hse360_validate_permit_authorization(uuid,jsonb), and auth.uid().
-- This trigger complements (does not replace) tenant RLS, the audited record RPCs,
-- permit-issuer/receiver operational procedure, or field verification before work starts.

create or replace function public.hse360_enforce_permit_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text := lower(btrim(coalesce(new.status, '')));
  v_old_status text;
  v_is_admin boolean := false;
  v_material_change boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.module <> 'permits' then return new; end if;

    if v_status not in ('draft','pending_approval','approved','suspended','closed','expired') then
      raise exception 'Invalid work-permit status: %', new.status using errcode = '23514';
    end if;

    if v_status in ('suspended','closed','expired') then
      raise exception 'A new work permit must begin as Draft or Pending Approval; use the lifecycle to suspend, close or expire an existing permit.' using errcode = '23514';
    end if;

    if v_status = 'approved' then
      v_is_admin := auth.uid() is not null and public.is_org_admin(auth.uid(), new.organization_id);
      if not v_is_admin then
        raise exception 'Only an active organization administrator may approve a work permit.' using errcode = '42501';
      end if;
      perform public.hse360_validate_permit_authorization(new.organization_id, coalesce(new.data, '{}'::jsonb));
    end if;
    return new;
  end if;

  -- This protects permit records from being converted into a different module or tenant.
  if (old.module = 'permits' or new.module = 'permits') and (new.module is distinct from old.module or new.organization_id is distinct from old.organization_id) then
    raise exception 'A work permit cannot change module or organization.' using errcode = '23514';
  end if;
  if new.module <> 'permits' then return new; end if;

  if v_status not in ('draft','pending_approval','approved','suspended','closed','expired') then
    raise exception 'Invalid work-permit status: %', new.status using errcode = '23514';
  end if;
  v_old_status := lower(btrim(coalesce(old.status, '')));

  -- Explicit transition model. Closed and expired permits are terminal; create a new
  -- permit for new work rather than reopening a historical authorisation.
  if v_status is distinct from v_old_status then
    if v_old_status not in ('draft','pending_approval','approved','suspended','closed','expired') then
      raise exception 'Legacy permit has an unknown status; review/migrate it before transition.' using errcode = '23514';
    end if;
    if not (
      (v_old_status = 'draft' and v_status in ('pending_approval','closed')) or
      (v_old_status = 'pending_approval' and v_status in ('draft','approved','closed')) or
      (v_old_status = 'approved' and v_status in ('suspended','closed','expired')) or
      (v_old_status = 'suspended' and v_status in ('approved','closed','expired'))
    ) then
      raise exception 'Work-permit transition % -> % is not allowed.', v_old_status, v_status using errcode = '23514';
    end if;

    if v_old_status in ('approved','suspended') or v_status in ('approved','suspended') then
      v_is_admin := auth.uid() is not null and public.is_org_admin(auth.uid(), new.organization_id);
      if not v_is_admin then
        raise exception 'Only an active organization administrator may approve, suspend, resume, close or expire an approved/suspended permit.' using errcode = '42501';
      end if;
    end if;
  end if;

  v_material_change := new.data is distinct from old.data
    or new.summary is distinct from old.summary
    or new.location is distinct from old.location
    or new.department is distinct from old.department
    or new.event_date is distinct from old.event_date;

  -- A permit kept in Approved status must not be materially altered by a non-admin;
  -- and material changes must pass the same full validation as initial approval.
  if v_status in ('approved','suspended') and v_material_change then
    v_is_admin := auth.uid() is not null and public.is_org_admin(auth.uid(), new.organization_id);
    if not v_is_admin then
      raise exception 'Only an active organization administrator may alter an approved or suspended work permit.' using errcode = '42501';
    end if;
    if v_status = 'approved' then
      perform public.hse360_validate_permit_authorization(new.organization_id, coalesce(new.data, '{}'::jsonb));
    end if;
  elsif v_status = 'approved' and v_old_status <> 'approved' then
    perform public.hse360_validate_permit_authorization(new.organization_id, coalesce(new.data, '{}'::jsonb));
  end if;

  return new;
end;
$$;

revoke all on function public.hse360_enforce_permit_lifecycle() from public;

drop trigger if exists hse_records_enforce_permit_lifecycle on public.hse_records;
create trigger hse_records_enforce_permit_lifecycle
before insert or update of organization_id, module, status, summary, location, department, event_date, data
on public.hse_records
for each row execute function public.hse360_enforce_permit_lifecycle();

comment on function public.hse360_enforce_permit_lifecycle() is
  'V8.8.2 candidate: database-side permit status transition and active-detail guard. Staging validation required.';
