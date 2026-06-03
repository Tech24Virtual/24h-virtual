# Wave 1 — Campaign OS RLS Verification Checklist

Manual verification of tenant-scoped RLS for `campaigns`, `campaign_scenarios`, and `campaign_publish_versions`.

Run this checklist after any change touching Wave 1 schema, triggers, or policies.
For automated probes, see the **"Wave 1 Campaign OS RLS"** card on `/admin/launch-checklist`.

---

## Setup

You need three test users:

- **Admin A** — has `admin` role, member of **Tenant A** (e.g. an internal direct-24h department or a specific WL client).
- **Admin B** — has `admin` role, member of **Tenant B** only (different `wl_partner_id` / `wl_client_id` / `client_lead_id`).
- **Supervisor A** — has `supervisor` role only, member of **Tenant A**.

Tenant A must contain at least one `client_departments` row at `lifecycle = 'approved_for_go_live'` or `'live'` with no existing campaign.

---

## Checks

### 1. Admin can create a campaign from an eligible department
- **Actor:** Admin A
- **Action:** UI → `/admin/campaign-os/campaigns` → "Create campaign from department" on the eligible row.
- **Expect:** New `campaigns` row inserted. `tenant_kind` and the matching tenant FK column are auto-populated from the source department by `enforce_campaign_tenant_identity`.

### 2. Admin can create a scenario; identity is auto-inherited
- **Actor:** Admin A
- **Action:** UI → campaign detail → Scenarios tab → "New scenario" → Save.
- **Expect:** Row inserted. `client_department_id`, `tenant_kind`, and the tenant FK column match the parent campaign exactly. The user never sets these fields.

### 3. Wrong `client_department_id` is overridden by the trigger
- **Actor:** Admin A (SQL)
- **Action:**
  ```sql
  insert into campaign_scenarios
    (campaign_id, client_department_id, title, trigger_md, expected_outcome_md, tenant_kind)
  values
    ('<tenant-A-campaign-id>', '<some-other-dept-id>', 't', 't', 'o', 'direct_24h');
  ```
- **Expect:** Insert succeeds, but `client_department_id` is silently overwritten to the parent campaign's department by `inherit_dept_from_campaign`.

### 4. `tenant_kind` is immutable after insert
- **Actor:** Admin A (SQL)
- **Action:**
  ```sql
  update campaign_scenarios set tenant_kind = 'wl_partner' where id = '<tenant-A-scenario-id>';
  ```
- **Expect:** Raises an error from `enforce_campaign_identity_immutable`.

### 5. Cross-tenant SELECT on `campaigns` returns zero rows
- **Actor:** Admin B (logged in as Tenant B)
- **Action:**
  ```sql
  select * from campaigns where id = '<tenant-A-campaign-id>';
  ```
- **Expect:** 0 rows. RLS `campaigns_admin_all` requires `is_tenant_member(...)` for non-superadmins.

### 6. Cross-tenant INSERT on `campaign_scenarios` is blocked
- **Actor:** Admin B
- **Action:**
  ```sql
  insert into campaign_scenarios (campaign_id, title, trigger_md, expected_outcome_md, tenant_kind)
  values ('<tenant-A-campaign-id>', 't', 't', 'o', '<tenant-A-kind>');
  ```
- **Expect:** Blocked by RLS `WITH CHECK` (or by FK lookup against an invisible parent).

### 7. Cross-tenant UPDATE on `campaign_scenarios` affects zero rows
- **Actor:** Admin B
- **Action:**
  ```sql
  update campaign_scenarios set title = 'pwn' where id = '<tenant-A-scenario-id>';
  ```
- **Expect:** `UPDATE 0`. The row is invisible to the policy.

### 8. Supervisor in own tenant can update a scenario
- **Actor:** Supervisor A
- **Action:** UI → campaign detail → Scenarios → Edit → change title → Save.
- **Expect:** Update succeeds via `campaign_scenarios_supervisor_update`.

### 9. Supervisor cannot insert a new scenario
- **Actor:** Supervisor A
- **Action:** UI → "New scenario" → Save (or direct SQL insert).
- **Expect:** Insert rejected. **Documented Wave 1 behavior** — supervisors have UPDATE only on scenarios.

### 10. Anonymous SELECT returns zero rows on all three tables
- **Actor:** Signed-out client (Supabase anon key)
- **Action:** `select count(*)` on `campaigns`, `campaign_scenarios`, `campaign_publish_versions`.
- **Expect:** 0 / 0 / 0. None of the policies grant access to anon.

### 11. Archive flow keeps the row visible to admin, hidden from default UI list
- **Actor:** Admin A
- **Action:** Scenarios tab → Archive a scenario.
- **Expect:** Row updates to `status = 'archived'`. Still readable. UI counts (`counts.scenarios`) drop because the active filter excludes archived rows.

### 12. Department deletion cascades campaigns and scenarios
- **Actor:** Admin A (SQL — destructive, use a throwaway dept)
- **Action:**
  ```sql
  delete from client_departments where id = '<test-dept-id>';
  ```
- **Expect:** All `campaigns` rows for that dept and all `campaign_scenarios` rows under those campaigns are removed via `ON DELETE CASCADE`.

---

## Pass criteria

All 12 checks must pass before promoting Wave 1 changes to production.
Document any deviations in the Wave 1 plan (`.lovable/phase-4-wave-1-plan.md`) before proceeding to Wave 2.
