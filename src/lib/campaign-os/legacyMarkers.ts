/**
 * LEGACY SCRIPT TABLES — FROZEN. Read-only legacy reference.
 *
 * NO Campaign OS feature, hook, mutation, or migration may write to
 * `client_scripts` or `wl_client_scripts`. Existing reads remain functional
 * for backwards compatibility only.
 *
 * Replacement: Phase 4 `campaign_script_*` family. Migration/backfill is
 * scoped to that phase — do not pre-empt it here.
 *
 * Greppable marker: LEGACY_SCRIPT_TABLES
 */
export const LEGACY_SCRIPT_TABLES = ['client_scripts', 'wl_client_scripts'] as const;
export type LegacyScriptTable = typeof LEGACY_SCRIPT_TABLES[number];
