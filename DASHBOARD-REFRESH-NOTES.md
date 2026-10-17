# HSE360 V8.4 Dashboard Refresh

## What changed
- Replaced the sparse dashboard layout with a branded operational welcome panel, workspace/date context, KPI row, priority queue, trend analysis, training exposure, permit status, renewal watch, high-use register shortcuts, and recent records.
- Added interactive 1M / 3M / 6M / 12M activity chart period controls.
- The dashboard uses current workspace records already loaded by the app; it does not invent compliance percentages.
- Kept existing Supabase schema and authentication untouched. No SQL migration is required for this dashboard-only update.
- Responsive layout changes for desktop, tablet, and mobile.

## Product research used as inspiration (not copied)
- VelocityEHS: integrated incident/near-miss capture, corrective actions, reporting/trend analysis, mobile-first field capture, AI-assisted analysis concepts. https://www.ehs.com/solution/safety/
- Intelex: connected audit/inspection workflows, CAPA/root-cause tracking, permit management, risk assessment, and management analytics. https://www.intelex.com/products/applications/
- SafetyCulture/iAuditor integration documentation: inspection exports and action management workflows. https://learn.microsoft.com/en-us/connectors/safetyculture/

## Important limitations
This package is a dashboard-focused visual/interaction upgrade, not the completion of all outstanding requests. It does not yet implement the requested ISO-controlled PDF report generator, document OCR extraction pipeline, reusable JSA library, notification persistence/read/clear workflow, or the company branding storage RLS fix. Those need separate implementation and live validation. The current logo upload may still return an RLS policy error until the storage policy is corrected.

## Checks
- `node --check app.js`: passed.
- `node qa/static-smoke.js`: passed.
- Live browser, role/RLS, and Supabase data verification: not performed by this package build.
