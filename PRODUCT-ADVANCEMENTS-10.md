# NUHAS HSE360 — Ten product advancements adopted for V8.10.0

Purpose: combine proven interaction patterns from established EHS, inspection and field-work products into one cohesive NUHAS HSE360 workflow. This is an adoption map, not a claim that every vendor feature or paid AI service is reproduced. We do not copy proprietary source code, trademarks or brand UI.

## Ten advancements

1. **Mobile-first quick capture and progressive disclosure** — short first-step entry for hazards, near misses, first aid, permits, JSAs and fire checks; secondary document-control/closure fields remain discoverable. Inspired by SafetyCulture and MaintainX field entry.
2. **Recoverable in-progress forms** — the current browser tab session autosaves form values, offers explicit restore/discard, scopes drafts by user and company, omits file contents, and removes the draft after successful submission. Inspired by field continuity/offline patterns; this is not full offline sync and does not survive the tab session ending.
3. **Reusable inspection checklists** — weekly fire extinguisher visual, monthly detailed fire-equipment, and monthly hose-reel/hydrant starters. They never pre-mark checks as OK; submitted checklist items require actual results, and NOT OK requires follow-up plus a remarks/action note. Inspired by SafetyCulture template-first inspections.
4. **Company-managed reusable JSA library** — use built-in and saved company templates, search, multi-select activities and bring hazards/controls into the actual work form. Templates are starter material and require site-specific review. Inspired by Intelex permit/JSA linkage.
5. **Permit-to-work risk linkage and controlled authorisation** — exactly General Work, Hot Work and Critical Work classes, connected JSA fields, draft-first handling and safety-critical authorisation checks. Inspired by Intelex permit status and work-risk visibility.
6. **Corrective-action accountability** — source-linked actions include owner, priority, due date and closure/effectiveness evidence with an independent verifier in the UI. The backend guards remain candidate SQL until staging/live validation.
7. **Expiry and compliance renewal watch** — 90/60/30/7-day bands, overdue/invalid expiry review and exportable renewal list; in-app calculation occurs when the application runs, not a proven server-side scheduler. Inspired by integrated compliance products.
8. **Document-to-register assisted import** — supported spreadsheet/text/PDF/DOCX extraction is staged for mapping/review, duplicates are guarded and partial failure can be retried; certificate OCR suggestions must be user verified. Inspired by Cority human-in-the-loop data capture. No paid AI API is required.
9. **Controlled reports and evidence exports** — period filters and report/register print-to-PDF include company branding, reference/document number, revision, issue date, reporting period and sign-off spaces; CSV/JSON data exports remain available. Report generation does not certify approval.
10. **Actionable notification center and traceability** — read/clear controls, source navigation, unread counters and sidebar/module badges; clear/dismiss does not close an underlying action. Remote persistence depends on required Supabase schema/policies being available.

## Product research references

- SafetyCulture platform and inspections: https://safetyculture.com/platform/ and https://public-library.safetyculture.io/products/safetyculture-sample-inspection-checklist-vtmw7p2dflh8aazl
- Intelex permit-to-work and JSA linkage: https://www.intelex.com/products/applications/permit-work-software/
- VelocityEHS incident and action management: https://www.ehs.com/solution/safety/incident-management/ and https://www.ehs.com/solution/safety/action-management/
- MaintainX work requests and offline mode: https://help.getmaintainx.com/about-work-requests and https://help.getmaintainx.com/offline-mode
- Cority incident management and learning: https://www.cority.com/corityone/incident-management-software/ and https://www.cority.com/corityone/learning-management/

## Limitations and learning from product pitfalls

- Avoid demo-only dashboard values; metrics with no source records should show missing/unrecorded rather than an assumed zero.
- Avoid long, repetitive forms where a reviewed template or staged import can reduce retyping.
- Template reuse must not become auto-approval. Site-specific job conditions, hazards, controls and gas/isolation evidence need a qualified human review.
- Do not advertise offline mode as complete just because in-tab draft recovery exists; authoritative records are not synchronized until the user saves.
- Do not treat dismissed alerts as completed actions.
- Do not market local static QA as proof of RLS, browser end-to-end, live report rendering or production readiness.

## V8.10.1 integration addendum

Cross-register search suggestions now search records already loaded for the active workspace, apply module view permission filtering in the UI, support keyboard selection and open record detail drawers. This improves findability but is not a server-side full-text search and does not replace RLS.

## Release state

V8.10.0 adds recoverable in-tab form drafts and fire checklist starters on top of the V8.9.0 cumulative work. Source-level and helper checks can validate deterministic logic, but authenticated browser and Supabase tests are still required before operational release.


## V8.10.2 mobile findability addendum

The global record search is now reachable on narrow mobile screens via a dedicated search toggle. The input expands above the page, focuses automatically, can be cleared, dismisses with Escape/outside click and closes when a result opens. An unmatched Enter press no longer redirects to Observations, avoiding a misleading module jump. It still searches only records loaded in the active workspace and still relies on backend RLS for real access enforcement.

## V8.10.3 implementation addendum — 13 October 2026

The role-specific training matrix, audit-action linkage review, major/critical serious-case closure guard and waste movement traceability checks are implemented in the local cumulative codebase. The matrix accepts explicit, approved course scope and exact employee/course code matching, exports its rows to CSV, and surfaces configuration gaps rather than turning an empty requirements library into false non-compliance. Waste form and CSV import share the same preflight. See `V8.10.3-CHANGELOG.md` and `V8.10.3-FEATURE-COMPLETION-AND-LIMITATIONS.md`. Browser and backend integration acceptance remains pending.
