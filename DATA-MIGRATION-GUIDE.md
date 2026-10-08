# HSE360 V8 — Data Migration Notes

## Existing NUHAS data
The V8 migration creates one tenant:

**Emirates National Copper Factory – NUHAS**

Existing `profiles` become members of that tenant using their current role (or `guest` when the role is not recognized). Existing `hse_records` and `audit_events` receive the NUHAS `organization_id`.

No existing HSE record is intentionally deleted or rewritten into another company.

## New companies
New companies are inserted into `organizations` and immediately receive an empty data context. Their records are generated with a separate organization ID and a separate reference sequence.

## References
Existing NUHAS reference numbers remain untouched.

New records use the organization's configurable prefix, module code, year and sequence, for example:

`NUHAS-PTW-2026-00001`

A different company can generate:

`ABC-PTW-2026-00001`

without sharing the NUHAS sequence.

## Memberships
- Active membership = company access granted.
- Pending membership = request submitted, no HSE data access.
- Suspended/rejected = no HSE data access.

## Permissions
Role defaults are applied when a membership is created. Organization administrators can later override individual module permissions.
