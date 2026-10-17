# NUHAS HSE360 — Product UX Inspiration and Adoption Map

**Current consolidated adoption map:** `PRODUCT-ADVANCEMENTS-10.md` lists ten patterns and their current implementation/pending validation status.

We study established HSE/workplace products for proven interaction patterns. This is not a claim that their full capabilities are reproduced, and no proprietary source code, branding or protected UI is copied.

## SafetyCulture — inspections, templates and follow-up

Public references:
- https://public-library.safetyculture.io/products/safetyculture-sample-inspection-checklist-vtmw7p2dflh8aazl
- https://safetyculture.com/platform/
- https://help.safetyculture.com/en-US/005883/

Adopted or planned patterns:
- Repeatable checklist templates with clear answer choices.
- Capture notes, media and follow-up actions at the finding level.
- Provide a report immediately after completing an inspection, while retaining later export options.
- Make corrective action traceability part of the inspection lifecycle.

HSE360 status: report/print support and source-linked actions exist in local code; a full configurable checklist builder and scheduled inspection engine remain pending.

## Intelex — connected permits, JSA and authorization

Public references:
- https://www.intelex.com/products/applications/permit-work-software/
- https://www.intelex.com/products/health-safety/applications/

Adopted or planned patterns:
- Connect a JSA/risk assessment to a permit rather than retyping the same hazards.
- Show permit state, validity and authorization clearly.
- Configure work-type-specific sections and required safety controls.
- Keep an auditable sequence of request, review, authorization, suspension and closure.

HSE360 status: JSA multi-select and reuse are available in local code; company-saved JSA templates were added in V8.9.0. Backend enforcement and live workflow validation remain pending.

## MaintainX — fast mobile capture and offline resilience

Public references:
- https://help.getmaintainx.com/create-a-work-request
- https://help.getmaintainx.com/offline-mode
- https://help.getmaintainx.com/mobile-vs-web-overview

Adopted or planned patterns:
- Keep first capture short; allow additional details later.
- Support photos/files from the field.
- Use clear pending/review states and navigation badges.
- If offline support is introduced, cache a controlled subset and surface sync/conflict state rather than silently overwriting records.

HSE360 status: quick-create actions and optional draft fields exist; robust offline draft synchronization is not implemented or verified.

## Cross-product lessons applied to the local candidate

- A form should start with the minimum useful capture and put secondary details in collapsible sections.
- A source finding should lead to an assigned, dated action with evidence and independent effectiveness verification.
- Reusable JSA templates should reduce retyping but remain subject to site-specific review.
- KPIs must link to real records and must not report missing data as zero.
- Generated reports must include document metadata but must not imply approval just because a PDF was generated.

## Avoided pitfalls

- No fake sample records in operational views.
- No invented compliance score based on record count.
- No automatic approval/closure by AI.
- No assumption that a feature works just because a UI element or SQL file exists.
- No paid cloud OCR/AI dependency introduced by default.
