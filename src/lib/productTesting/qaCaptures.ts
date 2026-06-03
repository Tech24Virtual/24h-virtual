/**
 * QA Captures Store
 * -----------------
 * Persists Capture-for-chat bundles (PNG screenshot blob + diagnostics JSON +
 * markdown summary) to IndexedDB so users can re-open and re-attach previous
 * captures from the QA panel. Keeps the most recent N captures (FIFO).
 *
 * IndexedDB is used because PNG blobs blow past localStorage quota.
 */

const DB_NAME = 'lovable-qa-captures';
const STORE = 'captures';
const DB_VERSION = 1;
const MAX_CAPTURES = 10;

export interface CaptureMeta {
  id: string;
  createdAt: string;
  segmentId: string | null;
  segmentLabel: string | null;
  url: string;
  pngName: string;
  jsonName: string;
  pngSize: number;
  jsonSize: number;
  issueCount: number;
}

export interface CaptureRecord extends CaptureMeta {
  png: Blob;
  jsonText: string;
  markdown: string;
}

const subscribers = new Set<() => void>();
function notify() { subscribers.forEach((fn) => { try { fn(); } catch { /* ignore */ } }); }
export function subscribeCaptures(fn: () => void): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function saveCapture(record: CaptureRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const r = tx(db, 'readwrite').put(record);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  // Trim to MAX
  const all = await listCaptures();
  if (all.length > MAX_CAPTURES) {
    const toDelete = all.slice(MAX_CAPTURES);
    for (const m of toDelete) await deleteCapture(m.id);
  }
  notify();
}

export async function listCaptures(): Promise<CaptureMeta[]> {
  const db = await openDb();
  return new Promise<CaptureMeta[]>((resolve, reject) => {
    const out: CaptureMeta[] = [];
    const req = tx(db, 'readonly').openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const v = cursor.value as CaptureRecord;
        out.push({
          id: v.id, createdAt: v.createdAt,
          segmentId: v.segmentId, segmentLabel: v.segmentLabel,
          url: v.url, pngName: v.pngName, jsonName: v.jsonName,
          pngSize: v.pngSize, jsonSize: v.jsonSize, issueCount: v.issueCount,
        });
        cursor.continue();
      } else {
        out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getCapture(id: string): Promise<CaptureRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = tx(db, 'readonly').get(id);
    r.onsuccess = () => resolve((r.result as CaptureRecord) ?? null);
    r.onerror = () => reject(r.error);
  });
}

export async function deleteCapture(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const r = tx(db, 'readwrite').delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  notify();
}

export async function clearCaptures(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const r = tx(db, 'readwrite').clear();
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  notify();
}
