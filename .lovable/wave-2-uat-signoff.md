# Wave 2 — Script Builder + Publish/Rollback UAT Signoff Sheet

This is the durable audit artifact for the Phase 4 Wave 2 closeout. It records the result of the manual verification of the script document schema, the three-pane script builder, the publish and rollback RPCs, the runtime bundle edge function, the Five9 iframe runtime, and the per-campaign legacy cutover, plus the `/admin/launch-checklist` Wave 2 RLS diagnostic probe. When this file is fully completed and signed at the bottom, the `/outline` Wave 2 gate flips from `qa: in-progress` → `qa: complete`.

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
| Agent A user (Tenant A, Five9 session) | <email> |
| Tenant A identifier | <wl_partner_id / wl_client_id / client_lead_id> |
| Tenant B identifier | <wl_partner_id / wl_client_id / client_lead_id> |
| Campaign used (Tenant A) | <campaigns.id> |
| Legacy script row used for cutover | <client_scripts.id / wl_client_scripts.id> |

---

## Part A — 14-point script builder + publish/rollback checklist

Tick `[x] PASS` or `[x] FAIL` for each. Add a note for any deviation.

### Schema + RLS

#### 1. Migration created the 3 script document tables with RLS enabled
- Verifies: `campaign_script_documents`, `campaign_script_blocks`, `campaign_script_branches` exist; `rowsecurity = true` on each.
- Actor: Admin A (SQL — read-only on `pg_tables`)
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 2. Cross-tenant SELECT on `campaign_script_documents` returns zero rows
- Actor: Admin B
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 3. Cross-tenant INSERT on `campaign_script_blocks` is blocked
- Actor: Admin B
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 4. Anonymous SELECT returns zero rows on all 3 script tables
- Actor: Signed-out anon client
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### Script Builder UI (three-pane authoring)

#### 5. Admin can create a draft script document on a campaign
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 6. Block tree, block editor, and branch editor all render and persist edits
- Verifies: the three panes round-trip a save without data loss.
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 7. Branches link to existing scenarios, FAQs, policies, fields, and Five9 mappings
- Verifies: linkers resolve real records from the same tenant only.
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 8. Supervisor in own tenant can edit a draft block but cannot publish
- Actor: Supervisor A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### Publish + Rollback RPCs

#### 9. Publish RPC writes an immutable snapshot to `campaign_publish_versions`
- Verifies: row appears with monotonically increasing `version`; snapshot JSON contains the document, blocks, and branches.
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 10. After publish, `campaigns.published_version_id` points at the new snapshot
- Actor: Admin A (SQL)
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 11. Rollback re-points `published_version_id` without rewriting historical rows
- Verifies: prior `campaign_publish_versions` rows are byte-identical before and after rollback.
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 12. Cross-tenant publish/rollback RPC calls are rejected
- Verifies: Admin B calling publish/rollback against Tenant A's campaign returns an authorization error, no rows mutated.
- Actor: Admin B
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### Runtime Bundle + Iframe

#### 13. `get-campaign-runtime-bundle` returns the published snapshot for a non-admin session
- Verifies: agent session receives published-only payload; draft edits made after publish are NOT present.
- Actor: Agent A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

#### 14. `/run/campaign/:campaignId/script` renders inside the Five9 iframe with no public chrome
- Verifies: dashboard-prefixed route, no nav/footer, loads the published bundle.
- Actor: Agent A (inside Five9)
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

### Legacy Cutover

#### 15. Per-campaign legacy cutover is reversible
- Verifies: legacy `client_scripts` / `wl_client_scripts` row is frozen with a pointer to the migrated campaign; running the reverse migration restores write access without data loss.
- Actor: Admin A
- Result: `[ ] PASS  [ ] FAIL`
- Notes: 

---

## Part B — `/admin/launch-checklist` Wave 2 RLS diagnostic

Sign in as Admin A, open `/admin/launch-checklist`, locate the **Wave 2 Campaign OS RLS** card, click Run, and paste each probe outcome verbatim.

| Probe | Expected | Actual |
|---|---|---|
| Tenant SELECT — campaign_script_documents | green / rows visible to current tenant only | |
| Tenant SELECT — campaign_script_blocks | green / rows visible to current tenant only | |
| Tenant SELECT — campaign_script_branches | green / rows visible to current tenant only | |
| Anonymous SELECT — campaign_script_documents | green / 0 rows | |
| Anonymous SELECT — campaign_script_blocks | green / 0 rows | |
| Anonymous SELECT — campaign_script_branches | green / 0 rows | |
| Runtime bundle — published-only for non-admin | green / draft hidden, published returned | |

Diagnostic overall: `[ ] ALL GREEN  [ ] ANY RED/AMBER`

---

## Part C — Signoff

```
Signed off by: <name>
Role: Admin
Date: YYYY-MM-DD
Environment: Live | Test
All 15 checks passed: yes / no
RLS diagnostic all green: yes / no
Wave 1 regression check (still all green): yes / no
Deviations: <none, or list>
```

---

## What happens next

When this file is fully completed with a clean signoff (all 15 PASS, diagnostic ALL GREEN, no Wave 1 regression, no blocking deviations), confirm in chat with the exact phrase:

> **Wave 2 UAT signed off, all green.**

That confirmation triggers the gate flip in `src/data/buildMap.ts`:

- `wave2Gates.qa`: `in-progress` → `complete`
- `wave2Gates.locked`: `true` → `false`
- Wave 2 phase `status`: `active` → `built`
- Wave 3 phase `status`: `deferred` → `active` (now the active build, gates Phase F)
- `wave2Contract.exitCriteria` last bullet → references this file

If any check failed, do **not** confirm. List the failure here and we triage it instead.
