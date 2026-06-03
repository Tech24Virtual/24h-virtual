import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export type WorkspaceMode = 'chats' | 'tickets' | 'tasks' | 'outbound';

const VALID: WorkspaceMode[] = ['chats', 'tickets', 'tasks', 'outbound'];

export function useWorkspaceMode() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('mode') as WorkspaceMode | null;
  const mode: WorkspaceMode = raw && VALID.includes(raw) ? raw : 'chats';

  const setMode = useCallback((next: WorkspaceMode) => {
    const p = new URLSearchParams(params);
    if (next === 'chats') p.delete('mode');
    else p.set('mode', next);
    p.delete('item'); // reset selected item on mode change
    setParams(p, { replace: true });
  }, [params, setParams]);

  const itemId = params.get('item');
  const setItemId = useCallback((id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set('item', id);
    else p.delete('item');
    setParams(p, { replace: true });
  }, [params, setParams]);

  return { mode, setMode, itemId, setItemId };
}
