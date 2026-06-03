---
name: Build Management and Outline
description: /outline is the Master Build Outline. Canonical phase order plus per-phase gates (Build, Test, QA, Lock) and contracts (Scope, Build Items, Engineering Tests, QA/UAT, Exit Criteria, Exclusions). Completion is mechanically enforced.
type: architecture
---

The `/outline` route (and its admin twin `/admin/outline`) is the **Master Build Outline** and the **single source of build truth** for the 24H Virtual platform. It renders `src/data/buildMap.ts` and is the authoritative status mirror of `.lovable/build-outline.md`.

## Page structure (top to bottom)

1. **Header** — title `24H Virtual Master Build Outline`, subtitle covering execution order + status + gates, global progress bar across all items.
2. **Canonical Execution Order** — chip strip in canonical order (Phase A → B → Wave 1 → Wave 2 → Wave 3 → Phase F → G → H), each chip anchors to its phase card.
3. **Foundation Already Built (Phase B)** — flat list of all 22 Phase B items, gate badges shown once at the top.
4. **Stabilization Complete (Phase A P0 series)** — flat list of P0-1 to P0-6, gate badges at the top, P0-2 carries an inline note that supervisor scoping is documentation-only and true scoping is deferred to P1-6a in Phase G.
5. **Current Active Phase** — single highlighted callout showing only the active phase with its full contract (Scope, Build Items, Engineering Tests, QA/UAT, Exit Criteria, Exclusions) and 4 gate badges.
6. **Execution Map** — accordion, one card per phase in canonical order. Each `AccordionContent` renders the gate row, the contract sub-sections, then the item list with Tested + KB checkboxes. Active phase auto-expands.
7. **Deferred / Blocked** — flat summary of every deferred phase + a callout pinning supervisor true scoping (P1-6a) at the top because it is referenced as a lock by Phase A's P0-2 and by Wave 1's exit criteria.
8. **Testing Model** — 9-bullet reusable checklist (`testingChecklist`) framed as "applied to every phase".
9. **Legacy Platform Inventory** — collapsed accordion of the three legacy layers (Front-End Growth, Service Delivery, Platform & Partner). Reference inventory only, not part of the canonical execution order.
10. **Required Secrets & Credentials**.

## Phase Contract Schema

`src/data/buildMap.ts` exposes per-phase metadata via two new shapes attached to every `BuildPhase`:

- `gates: PhaseGates` — `{ build, test, qa: GateStatus, locked: boolean }`. `GateStatus` is `complete | in-progress | pending | blocked`. `locked: true` means downstream phases are gated until this phase clears.
- `contract: PhaseContract` — `{ scope, buildItems, engineeringTests, qaUat, exitCriteria, exclusions? }`. `scope` is a single plain-language paragraph; the others are string arrays.

Other exports:

- `buildPhases: BuildPhase[]` — primary execution-order data (8 phases).
- `stabilizationItems` — alias of `phaseAItems`. Lets the Stabilization section render flat without duplicating data.
- `testingChecklist: string[]` — the 9-bullet reusable testing pattern.
- `platformInventory: BuildMapCategory[]` — three demoted legacy layers.
- `buildMapCategories` — back-compat alias of `platformInventory`. Outline.tsx no longer reads it.
- `allBuildMapItems` — flattened union (phases + inventory) powering the global progress bar.
- `requiredSecrets` — unchanged.

## Phase Gate Rule (enforced in Outline.tsx)

A phase **cannot render** as `built` or `stabilized` unless **all three work-gates are `complete`** AND **`contract.exitCriteria` is non-empty**. Otherwise the renderer's `effectiveStatus(phase)` falls the badge back to `Active Build` regardless of the authored `status`. This makes "a phase cannot appear complete unless exit criteria are stated" mechanically true, not just policy. The Canonical Execution Order chips, the Phase Status pill, the active-phase callout, and the deferred grouping all consume `effectiveStatus`, never raw `status`.

## Rules

- New phases or items go into `src/data/buildMap.ts` **first**, then anywhere else (specs, memories, code).
- Wave 1 scope is locked: campaigns + campaign_scenarios + Build Packet PDF + the placeholder `campaign_publish_versions` storage. Script Builder, runtime iframe, publish/rollback, SMS sequences, and training are explicitly **not** Wave 1 (and are listed as `contract.exclusions` on Wave 1).
- Per Phase A P0-2, supervisor scope is documentation-locked to admin-equivalent. True supervisor scoping (P1-6a) is part of Phase G, not Wave 1.
- QA-tested toggles write to `outline_progress` (RLS-scoped, staff only). Behavior unchanged.
- No removal of items from inventory: items only move between phases or get re-classified.
- Updating a phase's `gates` or `contract.exitCriteria` is the only way to flip its rendered status. Authoring `status: "built"` without passing the gate rule will render as `Active Build` instead.
