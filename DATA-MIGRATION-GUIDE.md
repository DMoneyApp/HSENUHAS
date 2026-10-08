# NUHAS HSE360 V7 — Workforce, Compliance & Asset Register

This V7 adds daily-use registers for:
- Employees
- PPE issue records linked to employee code/name and issue date
- Competency & Authorisations: First Aider, Fire Fighter, External Training and operator authorisations
- Licences, certificates and contracts
- Fire equipment monthly register
- 3rd-party inspection/validity register

## Two-month renewal alert rule
Any record in Competency, Licences or 3rd Party Inspections with an expiry/validity date on or before two calendar months from today, and not marked renewed/closed/compliant/valid/completed, appears in the dashboard attention list and notification bell.

The alert persists until the record is updated/renewed or marked with an appropriate completed/valid status.

## Source material incorporated
- The supplied License/Certificates presentation is represented in `templates/licenses-certificates-starter.csv`.
- The supplied fire equipment workbook is represented in `templates/fire-equipment-register.csv`.
- The visible PPE issue rows from the supplied screenshot are represented in `templates/ppe-issue-starter.csv`.
- The visible third-party inspection rows from the supplied screenshot are represented in `templates/third-party-inspections-starter.csv`.

These starter CSVs are for review/import and do not silently alter the live database.

## Import
V7 adds CSV import on module registers. Import is restricted to `super_admin`, `hse_admin` and `hse_engineer`. Existing records are not overwritten.

Before importing production data, review the CSV values and dates.
