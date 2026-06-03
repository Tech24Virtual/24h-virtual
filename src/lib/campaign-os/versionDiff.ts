// Pure structural diff for campaign publish-version snapshots.
// No external deps — works on plain JSON objects.

export type DiffChangeType = 'added' | 'removed' | 'changed';

export interface DiffEntry {
  section: string;
  itemKey: string;
  itemLabel: string;
  type: DiffChangeType;
  before?: unknown;
  after?: unknown;
}

export interface DiffSection {
  section: string;
  added: DiffEntry[];
  removed: DiffEntry[];
  changed: DiffEntry[];
}

/** Sections of a snapshot we care about, with the field used as a stable key. */
const SECTIONS: Array<{ key: string; label: string; idField: string; labelField: string }> = [
  { key: 'scenarios', label: 'Scenarios', idField: 'id', labelField: 'title' },
  { key: 'script_blocks', label: 'Script blocks', idField: 'id', labelField: 'title' },
  { key: 'script_branches', label: 'Script branches', idField: 'id', labelField: 'label' },
  { key: 'faqs', label: 'FAQs', idField: 'id', labelField: 'question' },
  { key: 'policies', label: 'Policies', idField: 'id', labelField: 'title' },
  { key: 'training_modules', label: 'Training modules', idField: 'id', labelField: 'title' },
];

function pickArray(snapshot: any, key: string): any[] {
  if (!snapshot || typeof snapshot !== 'object') return [];
  const v = snapshot[key];
  if (Array.isArray(v)) return v;
  return [];
}

function shallowEqualPayload(a: any, b: any): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function diffSnapshots(before: any, after: any): DiffSection[] {
  const out: DiffSection[] = [];
  for (const cfg of SECTIONS) {
    const beforeArr = pickArray(before, cfg.key);
    const afterArr = pickArray(after, cfg.key);
    const beforeMap = new Map<string, any>();
    const afterMap = new Map<string, any>();
    for (const item of beforeArr) {
      const id = item?.[cfg.idField];
      if (id != null) beforeMap.set(String(id), item);
    }
    for (const item of afterArr) {
      const id = item?.[cfg.idField];
      if (id != null) afterMap.set(String(id), item);
    }
    const added: DiffEntry[] = [];
    const removed: DiffEntry[] = [];
    const changed: DiffEntry[] = [];
    for (const [id, item] of afterMap) {
      if (!beforeMap.has(id)) {
        added.push({
          section: cfg.label,
          itemKey: id,
          itemLabel: String(item?.[cfg.labelField] ?? id),
          type: 'added',
          after: item,
        });
      } else {
        const prev = beforeMap.get(id);
        if (!shallowEqualPayload(prev, item)) {
          changed.push({
            section: cfg.label,
            itemKey: id,
            itemLabel: String(item?.[cfg.labelField] ?? id),
            type: 'changed',
            before: prev,
            after: item,
          });
        }
      }
    }
    for (const [id, item] of beforeMap) {
      if (!afterMap.has(id)) {
        removed.push({
          section: cfg.label,
          itemKey: id,
          itemLabel: String(item?.[cfg.labelField] ?? id),
          type: 'removed',
          before: item,
        });
      }
    }
    out.push({ section: cfg.label, added, removed, changed });
  }
  return out;
}

export function diffSummary(sections: DiffSection[]): {
  added: number;
  removed: number;
  changed: number;
} {
  let added = 0;
  let removed = 0;
  let changed = 0;
  for (const s of sections) {
    added += s.added.length;
    removed += s.removed.length;
    changed += s.changed.length;
  }
  return { added, removed, changed };
}
