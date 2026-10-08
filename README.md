# NUHAS HSE360 V7 — Professional HSE / IMS Platform

V7 extends the working Supabase-backed NUHAS HSE360 platform with daily-use workforce, PPE, competency, compliance and equipment controls.

## New operational modules
- Employees
- PPE Issue Register
- Competency & Authorisations
- Licences & Certificates
- Fire Equipment Register
- 3rd Party Inspections

## Renewal and compliance alerts
The application calculates a two-calendar-month renewal window for validity/expiry dates. Alerts appear in the dashboard attention area and notification bell and remain until the underlying record is renewed/updated or marked with an appropriate completed/valid status.

## CSV
Module registers include controlled CSV import for HSE administrators/engineers and CSV export for reporting.

## Existing foundation retained
- Supabase Auth
- Username login
- Optional recovery email
- Role-based access
- Super Admin
- Audited record RPCs
- Private attachments
- HSE/IMS modules
- Dashboard and management analytics

Keep `config.js` unchanged when replacing the frontend files.
