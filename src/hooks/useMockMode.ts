import { useEffect, useState } from 'react';
import { isMockMode, subscribeMockMode } from '@/lib/mockMode';

/** Reactive hook returning current mock-mode state. */
export function useMockMode(): boolean {
  const [on, setOn] = useState<boolean>(() => isMockMode());
  useEffect(() => {
    const update = () => setOn(isMockMode());
    update();
    return subscribeMockMode(update);
  }, []);
  return on;
}
