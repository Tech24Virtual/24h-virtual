# Wave 1 — Campaign OS UAT Signoff Sheet

This is the durable audit artifact for the Phase 4 Wave 1 closeout. It records the result of the manual RLS verification (`.lovable/wave-1-rls-checklist.md`) and the `/admin/launch-checklist` Wave 1 RLS diagnostic probe. When this file is fully completed and signed at the bottom, the `/outline` Wave 1 gate flips from `qa: in-progress` → `qa: complete`.

> **Do not flip the gate without a completed signoff block.** Deviations must be listed explicitly.

---

## Environment

| Field | Value |
|---|---|
| Environment | Live / Test (circle one) |
| Date executed | YYYY-MM-DD |
| Admin A user (Tenant A) | <email> |
| Admin B user (Tenant B) | <email> |
| Supervisor A user (Tenant A) | <email> |
| Tenant A identifier | <wl_partner_id / wl_client_id / client_lead_id> |
| Tenant B identifier | <wl_partner_id / wl_client_id / client_lead_id> |
| Eligible department used | <client_departments.id> |

---

## Part A — 12-point RLS checklist

Tick `[x] PASS` or `[x] FAIL` for each. Add a note for any deviation.

### 1. Admin can create a campaign from an eligible department
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 2. Admin can create a scenario; identity is auto-inherited
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 3. Wrong `client_department_id` is overridden by the trigger
- Actor: Admin A (SQL)
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 4. `tenant_kind` is immutable after insert
- Actor: Admin A (SQL)
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 5. Cross-tenant SELECT on `campaigns` returns zero rows
- Actor: Admin B
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 6. Cross-tenant INSERT on `campaign_scenarios` is blocked
- Actor: Admin B
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 7. Cross-tenant UPDATE on `campaign_scenarios` affects zero rows
- Actor: Admin B
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 8. Supervisor in own tenant can update a scenario
- Actor: Supervisor A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 9. Supervisor cannot insert a new scenario
- Actor: Supervisor A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 10. Anonymous SELECT returns zero rows on all three tables
- Actor: Signed-out anon client
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 11. Archive flow keeps the row visible to admin, hidden from default UI list
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### 12. Department deletion cascades campaigns and scenarios
- Actor: Admin A (SQL — destructive, throwaway dept)
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

---

## Part B — `/admin/launch-checklist` Wave 1 RLS diagnostic

Sign in as Admin A, open `/admin/launch-checklist`, locate the **Wave 1 Campaign OS RLS** card, click Run, and paste the four probe outcomes verbatim.

| Probe | Expected | Actual |
|---|---|---|
| Tenant SELECT — campaigns | green / rows visible to current tenant only | |
| Tenant SELECT — scenarios | green / rows visible to current tenant only | |
| Anonymous SELECT — campaigns | green / 0 rows | |
| Anonymous SELECT — scenarios | green / 0 rows | |

Diagnostic overall: `[ ] ALL GREEN  [ ] ANY RED/AMBER`

---

## Part C — Signoff

```
Signed off by: <name>
Role: Admin
Date: YYYY-MM-DD
Environment: Live | Test
All 12 checks passed: yes / no
RLS diagnostic all green: yes / no
Deviations: <none, or list>
```

---

## What happens next

The Wave 1 gate has already been flipped in `src/data/buildMap.ts` (baseline
now `qa: complete, locked: false, status: built`). The original closeout was
recorded in `admin_settings.wave_1_uat_signoff_confirmed` by a mechanical
actor (`confirmed_by: "system-mechanical-closeout"`).

This sheet exists to backfill the **human signoff artifact** for that
closeout. A real Admin should:

1. Walk all 12 RLS checks above with PASS/FAIL.
2. Run the four diagnostic probes on `/admin/launch-checklist` →
   "Wave 1 Campaign OS RLS".
3. Fill in Part C with their name, role, and date.
4. Re-confirm in `/admin/outline` Wave Close panel as their own user, which
   replaces the mechanical `confirmed_by` with a real `auth.uid` and email.

If any check fails, document the failure here and open a remediation ticket.
Do not undo the gate flip without a triage decision.
