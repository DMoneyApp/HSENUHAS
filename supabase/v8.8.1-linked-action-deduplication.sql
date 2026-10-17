-- NUHAS HSE360 V8.8.1 candidate migration: prevent exact duplicate active linked actions.
-- REVIEW/TEST ONLY: back up and test on a non-production Supabase project first.
-- Assumes public.hse_records and tenant-aware RPCs from v8-multitenant.sql exist.
-- This is a duplicate-safety guard, not a replacement for module permissions or RLS.

create or replace function public.prevent_duplicate_linked_action()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_source_id text := nullif(btrim(coalesce(new.data->>'source_record_id', '')), '');
  v_source_ref text := nullif(btrim(coalesce(new.data->>'related_reference', '')), '');
  v_norm_summary text := btrim(regexp_replace(lower(coalesce(new.summary, new.data->>'description', '')), '[^a-z0-9]+', ' ', 'g'));
  v_duplicate_reference text;
  v_old_source_id text;
  v_old_source_ref text;
  v_old_norm_summary text;
begin
  -- Only actions with a genuine source link are in scope. Unlinked standalone actions remain valid.
  if new.module <> 'actions'
     or lower(coalesce(new.status, '')) in ('closed', 'cancelled', 'canceled', 'void', 'expired')
     or (v_source_id is null and v_source_ref is null)
     or v_norm_summary = '' then
    return new;
  end if;

  -- Existing active records can still be edited when an unrelated field changes.
  -- Re-check only when the duplicate signature changes, or when inserting/reactivating.
  if tg_op = 'UPDATE' then
    v_old_source_id := nullif(btrim(coalesce(old.data->>'source_record_id', '')), '');
    v_old_source_ref := nullif(btrim(coalesce(old.data->>'related_reference', '')), '');
    v_old_norm_summary := btrim(regexp_replace(lower(coalesce(old.summary, old.data->>'description', '')), '[^a-z0-9]+', ' ', 'g'));
    if old.organization_id is not distinct from new.organization_id
       and old.module = 'actions'
       and lower(coalesce(old.status, '')) not in ('closed', 'cancelled', 'canceled', 'void', 'expired')
       and v_old_source_id is not distinct from v_source_id
       and v_old_source_ref is not distinct from v_source_ref
       and v_old_norm_summary is not distinct from v_norm_summary then
      return new;
    end if;
  end if;

  -- Transaction-scoped advisory locks serialize concurrent creations for each source.
  -- Acquire the ID lock before the reference lock consistently to avoid lock-order inversion.
  if v_source_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('hse360-linked-action-id'),
      pg_catalog.hashtext(new.organization_id::text || ':' || v_source_id)
    );
  end if;
  if v_source_ref is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('hse360-linked-action-ref'),
      pg_catalog.hashtext(new.organization_id::text || ':' || v_source_ref)
    );
  end if;

  select r.reference_no into v_duplicate_reference
  from public.hse_records r
  where r.organization_id = new.organization_id
    and r.module = 'actions'
    and r.id is distinct from new.id
    and lower(coalesce(r.status, '')) not in ('closed', 'cancelled', 'canceled', 'void', 'expired')
    and btrim(regexp_replace(lower(coalesce(r.summary, r.data->>'description', '')), '[^a-z0-9]+', ' ', 'g')) = v_norm_summary
    and (
      (v_source_id is not null and nullif(btrim(coalesce(r.data->>'source_record_id', '')), '') = v_source_id)
      or
      (v_source_ref is not null and nullif(btrim(coalesce(r.data->>'related_reference', '')), '') = v_source_ref)
    )
  limit 1;

  if v_duplicate_reference is not null then
    raise exception 'Duplicate active linked corrective action: %. Update the existing action instead.', v_duplicate_reference
      using errcode = '23505',
            hint = 'Open the existing active action or make the new action description materially different if it is a genuinely separate measure.';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_duplicate_linked_action() from public;

drop trigger if exists hse_records_prevent_duplicate_linked_action on public.hse_records;
create trigger hse_records_prevent_duplicate_linked_action
before insert or update of organization_id, module, status, summary, data
on public.hse_records
for each row execute function public.prevent_duplicate_linked_action();

comment on function public.prevent_duplicate_linked_action() is
  'V8.8.1 candidate: tenant-scoped exact-summary duplicate guard for active linked corrective actions. Validate on staging before production.';
