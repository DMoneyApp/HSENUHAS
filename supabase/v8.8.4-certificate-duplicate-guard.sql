-- NUHAS HSE360 V8.8.4 candidate: certificate duplicate protection.
-- Review and test in staging only. This migration intentionally stops if duplicate
-- license records already exist; investigate/resolve them with the record owners first.
-- Never delete certificate history automatically.

begin;

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.hse_records r
    WHERE r.module = 'licenses'
      AND NULLIF(lower(regexp_replace(coalesce(r.data->>'document_no',''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NOT NULL
      AND NULLIF(lower(regexp_replace(coalesce(r.data->>'authority',''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NOT NULL
      AND NULLIF(COALESCE(NULLIF(trim(r.data->>'expiry_date'), ''), CASE WHEN NULLIF(trim(r.data->>'issue_date'), '') IS NOT NULL THEN 'ISSUED:' || trim(r.data->>'issue_date') END), '') IS NOT NULL
    GROUP BY r.organization_id,
      lower(regexp_replace(coalesce(r.data->>'document_no',''), '[^a-zA-Z0-9]+', '', 'g')),
      lower(regexp_replace(coalesce(r.data->>'authority',''), '[^a-zA-Z0-9]+', '', 'g')),
      COALESCE(NULLIF(trim(r.data->>'expiry_date'), ''), CASE WHEN NULLIF(trim(r.data->>'issue_date'), '') IS NOT NULL THEN 'ISSUED:' || trim(r.data->>'issue_date') END)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'V8.8.4 stopped: duplicate certificate number/issuer/expiry keys already exist. Review duplicates per organization before retrying.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.hse_records r
    WHERE r.module = 'licenses'
      AND NULLIF(lower(regexp_replace(coalesce(r.data->>'document_no',''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NULL
      AND NULLIF(lower(regexp_replace(coalesce(nullif(r.data->>'document_name',''),r.summary,''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NOT NULL
      AND NULLIF(lower(regexp_replace(coalesce(r.data->>'authority',''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NOT NULL
      AND NULLIF(COALESCE(NULLIF(trim(r.data->>'expiry_date'), ''), CASE WHEN NULLIF(trim(r.data->>'issue_date'), '') IS NOT NULL THEN 'ISSUED:' || trim(r.data->>'issue_date') END), '') IS NOT NULL
    GROUP BY r.organization_id,
      lower(regexp_replace(coalesce(nullif(r.data->>'document_name',''),r.summary,''), '[^a-zA-Z0-9]+', '', 'g')),
      lower(regexp_replace(coalesce(r.data->>'authority',''), '[^a-zA-Z0-9]+', '', 'g')),
      COALESCE(NULLIF(trim(r.data->>'expiry_date'), ''), CASE WHEN NULLIF(trim(r.data->>'issue_date'), '') IS NOT NULL THEN 'ISSUED:' || trim(r.data->>'issue_date') END)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'V8.8.4 stopped: duplicate certificate title/issuer/expiry keys without certificate numbers exist. Review duplicates per organization before retrying.';
  END IF;
END;
$preflight$;

-- Unique within each organization, not across organizations. Different expiry
-- dates remain valid so reused certificate numbers can represent renewals.
CREATE UNIQUE INDEX IF NOT EXISTS hse_records_licenses_doc_no_issuer_expiry_uniq
ON public.hse_records (
  organization_id,
  lower(regexp_replace(coalesce(data->>'document_no',''), '[^a-zA-Z0-9]+', '', 'g')),
  lower(regexp_replace(coalesce(data->>'authority',''), '[^a-zA-Z0-9]+', '', 'g')),
  COALESCE(NULLIF(trim(data->>'expiry_date'), ''), CASE WHEN NULLIF(trim(data->>'issue_date'), '') IS NOT NULL THEN 'ISSUED:' || trim(data->>'issue_date') END)
)
WHERE module = 'licenses'
  AND NULLIF(lower(regexp_replace(coalesce(data->>'document_no',''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NOT NULL
  AND NULLIF(lower(regexp_replace(coalesce(data->>'authority',''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NOT NULL
  AND NULLIF(COALESCE(NULLIF(trim(data->>'expiry_date'), ''), CASE WHEN NULLIF(trim(data->>'issue_date'), '') IS NOT NULL THEN 'ISSUED:' || trim(data->>'issue_date') END), '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hse_records_licenses_title_issuer_expiry_uniq
ON public.hse_records (
  organization_id,
  lower(regexp_replace(coalesce(nullif(data->>'document_name',''),summary,''), '[^a-zA-Z0-9]+', '', 'g')),
  lower(regexp_replace(coalesce(data->>'authority',''), '[^a-zA-Z0-9]+', '', 'g')),
  COALESCE(NULLIF(trim(data->>'expiry_date'), ''), CASE WHEN NULLIF(trim(data->>'issue_date'), '') IS NOT NULL THEN 'ISSUED:' || trim(data->>'issue_date') END)
)
WHERE module = 'licenses'
  AND NULLIF(lower(regexp_replace(coalesce(data->>'document_no',''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NULL
  AND NULLIF(lower(regexp_replace(coalesce(nullif(data->>'document_name',''),summary,''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NOT NULL
  AND NULLIF(lower(regexp_replace(coalesce(data->>'authority',''), '[^a-zA-Z0-9]+', '', 'g')), '') IS NOT NULL
  AND NULLIF(COALESCE(NULLIF(trim(data->>'expiry_date'), ''), CASE WHEN NULLIF(trim(data->>'issue_date'), '') IS NOT NULL THEN 'ISSUED:' || trim(data->>'issue_date') END), '') IS NOT NULL;

COMMIT;
