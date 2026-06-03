/**
 * Pure TS drift helper — compares a manual Five9 variable snapshot against
 * our system's five9_variable_mappings. Deno-compatible (no external imports)
 * so the same file is reused by the detect-five9-drift edge function.
 */

export interface Five9VariableSnapshotEntry {
  name: string;
  kind?: string | null;
  type?: string | null;
}

export interface Five9MappingEntry {
  five9_variable_name: string;
  five9_variable_kind?: string | null;
  data_type?: string | null;
}

export interface Five9DriftResult {
  missing_in_five9: string[];
  missing_in_os: string[];
  type_mismatches: Array<{ name: string; os_type: string | null; five9_type: string | null }>;
  kind_mismatches: Array<{ name: string; os_kind: string | null; five9_kind: string | null }>;
  total_drift: number;
}

function norm(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase();
}

export function computeFive9Drift(
  osMappings: Five9MappingEntry[],
  five9Snapshot: Five9VariableSnapshotEntry[]
): Five9DriftResult {
  const osByName = new Map(osMappings.map((m) => [norm(m.five9_variable_name), m]));
  const five9ByName = new Map(five9Snapshot.map((v) => [norm(v.name), v]));

  const missing_in_five9: string[] = [];
  const missing_in_os: string[] = [];
  const type_mismatches: Five9DriftResult['type_mismatches'] = [];
  const kind_mismatches: Five9DriftResult['kind_mismatches'] = [];

  for (const [key, m] of osByName.entries()) {
    if (!five9ByName.has(key)) {
      missing_in_five9.push(m.five9_variable_name);
    }
  }
  for (const [key, v] of five9ByName.entries()) {
    if (!osByName.has(key)) {
      missing_in_os.push(v.name);
    }
  }
  for (const [key, m] of osByName.entries()) {
    const v = five9ByName.get(key);
    if (!v) continue;
    const osType = (m.data_type ?? null) as string | null;
    const f5Type = (v.type ?? null) as string | null;
    if (osType && f5Type && norm(osType) !== norm(f5Type)) {
      type_mismatches.push({ name: m.five9_variable_name, os_type: osType, five9_type: f5Type });
    }
    const osKind = (m.five9_variable_kind ?? null) as string | null;
    const f5Kind = (v.kind ?? null) as string | null;
    if (osKind && f5Kind && norm(osKind) !== norm(f5Kind)) {
      kind_mismatches.push({ name: m.five9_variable_name, os_kind: osKind, five9_kind: f5Kind });
    }
  }

  return {
    missing_in_five9: missing_in_five9.sort(),
    missing_in_os: missing_in_os.sort(),
    type_mismatches: type_mismatches.sort((a, b) => a.name.localeCompare(b.name)),
    kind_mismatches: kind_mismatches.sort((a, b) => a.name.localeCompare(b.name)),
    total_drift:
      missing_in_five9.length + missing_in_os.length + type_mismatches.length + kind_mismatches.length,
  };
}
