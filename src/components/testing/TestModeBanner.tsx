import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, AlertTriangle, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useProductTesting } from '@/contexts/ProductTestingContext';
import { TraceDialog } from './TraceDialog';
import { getHidePublicBannerPref, setHidePublicBannerPref } from '@/lib/productTesting/traceLog';

const STATUS_COLORS: Record<string, string> = {
  production: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
  sandbox: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
  partial: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
  placeholder: 'bg-zinc-500/20 text-zinc-200 border-zinc-500/40',
  'requires-context': 'bg-orange-500/20 text-orange-200 border-orange-500/40',
};

export function TestModeBanner() {
  const { active } = useProductTesting();
  const location = useLocation();
  const navigate = useNavigate();
  const [traceOpen, setTraceOpen] = useState(false);
  const [hidePublic, setHidePublic] = useState(getHidePublicBannerPref());

  const isPublicRoute = useMemo(() => {
    const p = location.pathname;
    return (
      !p.startsWith('/admin') &&
      !p.startsWith('/staff') &&
      !p.startsWith('/client-dashboard') &&
      !p.startsWith('/hr-portal') &&
      !p.startsWith('/affiliate') &&
      !p.startsWith('/white-label-dashboard') &&
      !p.startsWith('/portal') &&
      !p.startsWith('/run')
    );
  }, [location.pathname]);

  if (!active) return null;
  if (isPublicRoute && hidePublic) return null;

  const { segment, loadDurationMs, currentRole, roleMismatch, trace, missingContext } = active;

  const handleClose = () => {
    const params = new URLSearchParams(location.search);
    params.delete('testSegment');
    const search = params.toString();
    navigate(`${location.pathname}${search ? '?' + search : ''}`, { replace: true });
  };

  const handleHidePublic = () => {
    setHidePublicBannerPref(true);
    setHidePublic(true);
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-[9998] bg-zinc-950/95 backdrop-blur border-b border-zinc-800 text-zinc-100 text-xs font-mono shadow-lg"
        role="status"
        aria-label="Product Testing trace banner"
      >
        <div className="px-3 py-1.5 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setTraceOpen(true)}
            className="flex items-center gap-2 hover:text-white transition-colors"
            title="Open trace details"
          >
            <span className="px-1.5 py-0.5 rounded bg-primary/30 border border-primary/50 text-primary-foreground font-semibold tracking-wide">
              TEST
            </span>
            <span className="font-semibold">{segment.label}</span>
            <Badge variant="outline" className="text-[10px] py-0 h-4 border-zinc-700 text-zinc-300">
              {segment.category}
            </Badge>
          </button>

          <span className={`px-1.5 py-0.5 rounded border text-[10px] ${STATUS_COLORS[segment.status]}`}>
            {segment.status}
          </span>

          <span className="text-zinc-400 truncate max-w-md">
            {location.pathname}
          </span>

          <span className="text-zinc-500">
            role: <span className="text-zinc-300">{currentRole ?? 'anon'}</span>
            {' / expected: '}
            <span className="text-zinc-300">{segment.role}</span>
          </span>

          {roleMismatch && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200">
              <AlertTriangle className="h-3 w-3" />
              Role mismatch, using admin override
            </span>
          )}

          {missingContext.length > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-200">
              missing: {missingContext.join(', ')}
            </span>
          )}

          {loadDurationMs != null && (
            <span className="text-zinc-500">
              {loadDurationMs}ms
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            {isPublicRoute && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleHidePublic}
                className="h-6 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
                title="Hide on public routes (clean screenshots)"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClose}
              className="h-6 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
              title="Close test mode"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      {/* Spacer so the banner doesn't overlap page content */}
      <div className="h-8" aria-hidden="true" />

      <TraceDialog
        open={traceOpen}
        onOpenChange={setTraceOpen}
        segment={segment}
        trace={trace}
      />
    </>
  );
}
