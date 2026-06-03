import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, ChevronRight, X, RotateCcw, Minimize2 } from 'lucide-react';
import { useProductTesting } from '@/contexts/ProductTestingContext';
import { getChecklistFor } from '@/config/qaChecklists';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STORAGE_KEY = 'product-testing:qa-checklist-progress';
const COLLAPSED_KEY = 'product-testing:qa-checklist-collapsed';

type ProgressMap = Record<string, Record<string, boolean>>;

function readProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}
function writeProgress(p: ProgressMap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

/**
 * Floating, collapsible guided QA checklist that overlays inside whatever
 * segment is active. Steps are ordered, progress persists in localStorage
 * keyed by segment id, and the next-up step is highlighted to make sequencing
 * obvious. Hidden when no test segment is active.
 */
export function QAChecklistOverlay() {
  const { active } = useProductTesting();
  const [progress, setProgress] = useState<ProgressMap>(() => readProgress());
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const [hiddenForSegment, setHiddenForSegment] = useState<string | null>(null);

  const segmentId = active?.segment.id ?? null;
  const steps = useMemo(() => getChecklistFor(segmentId), [segmentId]);
  const segProgress = (segmentId && progress[segmentId]) || {};
  const completed = steps.filter((s) => segProgress[s.id]).length;
  const nextIdx = steps.findIndex((s) => !segProgress[s.id]);

  useEffect(() => {
    // Reset "hidden" flag when segment changes so a fresh launch shows it again.
    setHiddenForSegment(null);
  }, [segmentId]);

  const toggleStep = (stepId: string) => {
    if (!segmentId) return;
    setProgress((prev) => {
      const next: ProgressMap = {
        ...prev,
        [segmentId]: { ...(prev[segmentId] || {}), [stepId]: !(prev[segmentId]?.[stepId]) },
      };
      writeProgress(next);
      return next;
    });
  };

  const resetSegment = () => {
    if (!segmentId) return;
    setProgress((prev) => {
      const next = { ...prev };
      delete next[segmentId];
      writeProgress(next);
      return next;
    });
  };

  const handleCollapseToggle = () => {
    setCollapsed((c) => {
      const v = !c;
      try { localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0'); } catch { /* ignore */ }
      return v;
    });
  };

  if (!active) return null;
  if (hiddenForSegment === segmentId) return null;

  // Collapsed pill
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={handleCollapseToggle}
        className="fixed bottom-4 left-4 z-[9997] flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/95 backdrop-blur px-3 py-2 text-xs text-zinc-100 shadow-lg hover:bg-zinc-900 transition-colors"
        title="Open QA checklist"
      >
        <ClipboardList className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">QA</span>
        <span className="text-zinc-400">{completed}/{steps.length}</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-[9997] w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur shadow-2xl text-zinc-100 overflow-hidden"
      role="region"
      aria-label="Guided QA checklist"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/60">
        <ClipboardList className="h-4 w-4 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate">{active.segment.label}</div>
          <div className="text-[10px] text-zinc-400">Guided QA checklist</div>
        </div>
        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-300">
          {completed}/{steps.length}
        </Badge>
        <button
          type="button"
          onClick={resetSegment}
          className="p-1 text-zinc-500 hover:text-zinc-200"
          title="Reset progress for this segment"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCollapseToggle}
          className="p-1 text-zinc-500 hover:text-zinc-200"
          title="Collapse"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setHiddenForSegment(segmentId)}
          className="p-1 text-zinc-500 hover:text-zinc-200"
          title="Hide for this segment"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-800">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${steps.length ? (completed / steps.length) * 100 : 0}%` }}
        />
      </div>

      {/* Steps */}
      <ol className="max-h-[55vh] overflow-y-auto px-2 py-2 space-y-1">
        {steps.map((step, idx) => {
          const done = !!segProgress[step.id];
          const isNext = idx === nextIdx;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                className={`w-full text-left flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                  done
                    ? 'bg-emerald-500/5 text-zinc-400'
                    : isNext
                      ? 'bg-primary/15 ring-1 ring-primary/40 text-zinc-100'
                      : 'hover:bg-zinc-900 text-zinc-200'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`text-xs ${done ? 'line-through' : ''}`}>
                    <span className="text-zinc-500 mr-1">{idx + 1}.</span>
                    {step.label}
                  </div>
                  {step.expect && !done && (
                    <div className="mt-0.5 flex items-start gap-1 text-[10px] text-zinc-400 leading-snug">
                      <ChevronRight className="h-2.5 w-2.5 mt-0.5 shrink-0" />
                      <span>{step.expect}</span>
                    </div>
                  )}
                </div>
                {isNext && !done && (
                  <Badge className="text-[9px] py-0 h-4 bg-primary text-primary-foreground shrink-0">
                    next
                  </Badge>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {completed === steps.length && (
        <div className="px-3 py-2 text-[11px] text-emerald-400 border-t border-zinc-800 bg-emerald-500/5">
          ✓ All steps complete for this segment.
        </div>
      )}
    </div>
  );
}
