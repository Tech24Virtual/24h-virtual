import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { useMockMode } from '@/hooks/useMockMode';
import { enableMockMode, disableMockMode } from '@/lib/mockMode';
import { cn } from '@/lib/utils';

/**
 * MOCK MODE badge / toggle. Mounted only inside workspace topbars.
 * Auto-disables when user navigates away from /workspace routes.
 */
export function MockModeToggle() {
  const on = useMockMode();
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-disable when leaving workspace routes
  useEffect(() => {
    if (!location.pathname.includes('/workspace') && on) {
      disableMockMode();
    }
  }, [location.pathname, on]);

  const handleToggle = () => {
    if (on) {
      disableMockMode();
      // strip ?mock=1 from URL
      const params = new URLSearchParams(location.search);
      params.delete('mock');
      navigate(`${location.pathname}${params.toString() ? '?' + params.toString() : ''}`, { replace: true });
    } else {
      enableMockMode();
      const params = new URLSearchParams(location.search);
      params.set('mock', '1');
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    }
  };

  return (
    <button
      onClick={handleToggle}
      title={on ? 'Mock mode is ON — click to disable' : 'Enable mock data simulation'}
      className={cn(
        'h-6 px-2 rounded text-[10px] font-bold uppercase tracking-wider',
        'flex items-center gap-1 border transition-colors',
        on
          ? 'bg-cta/15 text-cta border-cta/40 hover:bg-cta/25'
          : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted',
      )}
    >
      <FlaskConical className="h-3 w-3" />
      {on ? 'Mock' : 'Live'}
    </button>
  );
}
