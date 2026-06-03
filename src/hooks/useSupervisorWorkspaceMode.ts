import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export type SupervisorMode =
  | 'overview'
  | 'tickets'
  | 'escalations'
  | 'tasks'
  | 'reviews'
  | 'outbound'
  | 'campaigns';

export type ReviewsSubMode = 'scripts' | 'shifts' | 'performance';

const VALID: SupervisorMode[] = ['overview', 'tickets', 'escalations', 'tasks', 'reviews', 'outbound', 'campaigns'];
const VALID_SUB: ReviewsSubMode[] = ['scripts', 'shifts', 'performance'];

export function useSupervisorWorkspaceMode() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('mode') as SupervisorMode | null;
  const mode: SupervisorMode = raw && VALID.includes(raw) ? raw : 'overview';
  const subRaw = params.get('sub') as ReviewsSubMode | null;
  const sub: ReviewsSubMode = subRaw && VALID_SUB.includes(subRaw) ? subRaw : 'scripts';
  const itemId = params.get('item');

  const setMode = useCallback(
    (next: SupervisorMode) => {
      const p = new URLSearchParams(params);
      if (next === 'overview') p.delete('mode');
      else p.set('mode', next);
      p.delete('item');
      if (next !== 'reviews') p.delete('sub');
      setParams(p, { replace: true });
    },
    [params, setParams],
  );

  const setSub = useCallback(
    (next: ReviewsSubMode) => {
      const p = new URLSearchParams(params);
      if (next === 'scripts') p.delete('sub');
      else p.set('sub', next);
      p.delete('item');
      setParams(p, { replace: true });
    },
    [params, setParams],
  );

  const setItemId = useCallback(
    (id: string | null) => {
      const p = new URLSearchParams(params);
      if (id) p.set('item', id);
      else p.delete('item');
      setParams(p, { replace: true });
    },
    [params, setParams],
  );

  return { mode, setMode, sub, setSub, itemId, setItemId };
}
