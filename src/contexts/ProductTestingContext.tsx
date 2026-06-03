import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { getSegmentById, type ProductTestingSegment } from '@/config/productTestingSegments';
import { useAuth } from '@/contexts/AuthContext';
import { appendTrace, type TraceEntry } from '@/lib/productTesting/traceLog';
import { startSegment, endSegment, recordRouteChange } from '@/lib/productTesting/qaRecorder';

interface ActiveTestSession {
  segment: ProductTestingSegment;
  launchedAt: string;
  loadDurationMs: number | null;
  redirectedFrom: string | null;
  missingContext: string[];
  currentRole: string | null;
  roleMismatch: boolean;
  trace: TraceEntry;
}

interface ProductTestingContextValue {
  active: ActiveTestSession | null;
}

const ProductTestingContext = createContext<ProductTestingContextValue>({ active: null });

/**
 * Infers missing-context blockers from the segment's `requires` list and the
 * current URL. Role requirements are checked separately. URL-param requirements
 * (campaign-id, partner-slug, etc.) are flagged when the route still contains
 * `:placeholder` segments.
 */
function inferMissingContext(segment: ProductTestingSegment, pathname: string): string[] {
  const missing: string[] = [];
  if (pathname.includes('/:')) {
    // Route still contains a placeholder, meaning the launcher didn't substitute.
    if (segment.requires.includes('campaign-id')) missing.push('campaign-id');
    if (segment.requires.includes('partner-slug')) missing.push('partner-slug');
    if (segment.requires.includes('partner-id')) missing.push('partner-id');
    if (segment.requires.includes('client-id')) missing.push('client-id');
    if (segment.requires.includes('lead-id')) missing.push('lead-id');
    if (segment.requires.includes('ticket-id')) missing.push('ticket-id');
  }
  return missing;
}

const ROLE_REQUIREMENT_MAP: Record<string, string> = {
  'admin-role': 'admin',
  'client-role': 'client',
  'agent-role': 'agent',
  'supervisor-role': 'supervisor',
  'sales-role': 'sales',
  'billing-role': 'billing',
  'tech-role': 'tech',
  'hr-role': 'hr',
  'white-label-role': 'white_label',
  'wl-client-role': 'wl_client',
  'affiliate-role': 'affiliate',
};

export function ProductTestingProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { roles, user, isAdmin } = useAuth();
  const mountTimeRef = useRef<number>(performance.now());
  const initialPathRef = useRef<string>(location.pathname);
  const [active, setActive] = useState<ActiveTestSession | null>(null);
  const lastSegmentIdRef = useRef<string | null>(null);

  // Read ?testSegment from URL on every navigation.
  const segmentId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('testSegment');
  }, [location.search]);

  const segment = useMemo(() => getSegmentById(segmentId), [segmentId]);

  // Track route changes for the QA recorder.
  const lastRouteRef = useRef<string>(location.pathname + location.search);
  useEffect(() => {
    const next = location.pathname + location.search;
    if (lastRouteRef.current !== next) {
      recordRouteChange(lastRouteRef.current, next);
      lastRouteRef.current = next;
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!segment) {
      if (lastSegmentIdRef.current) {
        endSegment();
      }
      lastSegmentIdRef.current = null;
      setActive(null);
      return;
    }

    const isNewLaunch = lastSegmentIdRef.current !== segment.id;
    if (isNewLaunch) {
      mountTimeRef.current = performance.now();
      initialPathRef.current = location.pathname;
      lastSegmentIdRef.current = segment.id;
    }

    // Compute load duration ASAP (next animation frame) to approximate first paint.
    let frameId: number;
    frameId = requestAnimationFrame(() => {
      const loadDuration = performance.now() - mountTimeRef.current;

      // Role check. Admins always count as having access (admin override).
      const expectedRole = segment.role;
      const userPrimaryRole = roles[0] ?? null;
      const roleMatches =
        expectedRole === 'public' ||
        roles.includes(expectedRole as never) ||
        isAdmin;
      const roleMismatch = !roleMatches;

      // Role requirements from `requires` array
      const requiredRoleIds = segment.requires
        .filter((r) => r.endsWith('-role'))
        .map((r) => ROLE_REQUIREMENT_MAP[r])
        .filter(Boolean);
      const missingRoles = requiredRoleIds.filter(
        (r) => !roles.includes(r as never) && !isAdmin,
      );

      const missingContext = [
        ...inferMissingContext(segment, location.pathname),
        ...missingRoles.map((r) => `${r}-role`),
      ];

      const redirectedFrom =
        location.pathname !== initialPathRef.current ? initialPathRef.current : null;

      const trace: TraceEntry = {
        segmentId: segment.id,
        label: segment.label,
        category: segment.category,
        route: location.pathname + location.search,
        launchedAt: new Date().toISOString(),
        currentRole: userPrimaryRole ?? (user ? 'authenticated' : 'anonymous'),
        expectedRole,
        pageName: document.title,
        loadDurationMs: Math.round(loadDuration),
        redirectedFrom: redirectedFrom ?? undefined,
        missingContext,
        status: segment.status,
      };

      // Persist only on initial launch, not on every re-render.
      if (isNewLaunch) {
        appendTrace(trace);
        startSegment({
          segmentId: segment.id,
          segmentLabel: segment.label,
          category: segment.category,
          initialRoute: trace.route,
          currentRole: trace.currentRole,
          expectedRole,
        });
      }

      setActive({
        segment,
        launchedAt: trace.launchedAt,
        loadDurationMs: trace.loadDurationMs ?? null,
        redirectedFrom,
        missingContext,
        currentRole: trace.currentRole,
        roleMismatch,
        trace,
      });
    });

    return () => cancelAnimationFrame(frameId);
    // We only want to recompute when segment, route, or auth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment?.id, location.pathname, location.search, roles.join(','), isAdmin, user?.id]);

  return (
    <ProductTestingContext.Provider value={{ active }}>
      {children}
    </ProductTestingContext.Provider>
  );
}

export function useProductTesting() {
  return useContext(ProductTestingContext);
}
