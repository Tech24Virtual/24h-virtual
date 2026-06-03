import { useState, useCallback } from 'react';

export type AgentAvailability = 'available' | 'away' | 'offline';

const STORAGE_KEY = 'agent-availability-status';

export function useAgentAvailability() {
  const [status, setStatus] = useState<AgentAvailability>(() => {
    if (typeof window === 'undefined') return 'available';
    return (localStorage.getItem(STORAGE_KEY) as AgentAvailability) || 'available';
  });

  const updateStatus = useCallback((next: AgentAvailability) => {
    setStatus(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { status, setStatus: updateStatus };
}
