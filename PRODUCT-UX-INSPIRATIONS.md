# HSE360 product-pattern research and adoption map

Research date: 12 October 2026
Purpose: learn from established HSE/field-operations UX patterns. This is not a claim of partnership or certification.

## Patterns to adopt for NUHAS

| Product researched | Useful pattern | HSE360 direction | State in V8.8.9 |
|---|---|---|---|
| SafetyCulture | Mobile-ready checklists, reusable inspection templates, actions raised from findings and inspection/report export | Consistent checklist item outcomes, notes/evidence, linked actions and quick PDF/print output | Partially represented in existing inspections/linked CAPA; fire-equipment print format improved locally; fuller configurable checklist builder remains pending |
| VelocityEHS | Incident/near-miss field capture tied to corrective actions, reporting/trends, mobile workflow | Quick-create buttons, structured reporting and connect findings to owned/due-dated CAPA | Quick captures and existing linked-action flow are present locally; mobile/offline performance and live end-to-end link testing pending |
| Intelex | Permit-to-work with hazard/risk assessment, document control, approvals and auditability | Keep exactly three permit classes, reuse JSA content, distinguish Draft / Pending / Authorised states, control document number/revision/issue date | JSA reuse from permit and optional document-control print metadata added locally; live back-end lifecycle guard and controlled approval remain unverified |
| MaintainX | Simple front-line request capture, photo attachments, QR access and offline work capture | Reduce typing at source; support attachments; consider QR shortcuts and offline drafts when conflict-safe sync is designed | Dashboard quick-capture controls and optional fields added locally; QR and offline sync remain future work |

## Research sources

- SafetyCulture inspections/checklists and reporting: https://safetyculture.com/inspection-software/ and https://safetyculture.com/checklists/
- SafetyCulture Job Safety Analysis: https://safetyculture.com/topics/job-safety-analysis/
- VelocityEHS EHS software and incident management: https://www.ehs.com/solutions/ehs-management-software/ and https://www.ehs.com/solutions/incident-management-software/
- Intelex EHSQ software: https://www.intelex.com/products/ehs-software/
- MaintainX mobile/offline and work-request documentation: https://help.getmaintainx.com/ and https://www.getmaintainx.com/

## Implementation principles

- Borrow interaction patterns, not other products' branding, text, code or proprietary assets.
- Prefer free/browser-side tools and the existing Supabase architecture where practical; do not add paid AI/OCR services by default.
- Extracted document data must remain a suggestion until reviewed, validated and explicitly saved by an authorized user.
- HSE templates must be labelled as starters and assessed for the actual equipment, job, site and permit. Generic examples are not formal approvals.
- A saved draft must never be represented as authorization to perform work.
