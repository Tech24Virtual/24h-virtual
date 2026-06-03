import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';
import { isMockMode } from '@/lib/mockMode';
import { useMockMode } from './useMockMode';
import { toast } from 'sonner';

/**
 * Workspace-only mutation wrapper that short-circuits writes in mock mode.
 *
 * In mock mode:
 *  - mutationFn is replaced with a no-op that resolves after ~150ms (so
 *    optimistic UIs and pending states still flow naturally)
 *  - a toast is shown to make the no-op explicit
 *  - onSuccess still fires so consumers can re-render / invalidate queries
 *    that themselves return mock data
 *
 * Hook-order safety: useMutation is always called.
 */
export function useMockableMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    mockResult?: TData | ((vars: TVariables) => TData);
    mockToast?: string;
  },
): UseMutationResult<TData, TError, TVariables, TContext> {
  const mockOn = useMockMode() || isMockMode();

  return useMutation({
    ...options,
    mutationFn: mockOn
      ? (async (vars: TVariables) => {
          await new Promise((r) => setTimeout(r, 150));
          toast.message(options.mockToast || 'Mock mode — action not persisted');
          if (typeof options.mockResult === 'function') {
            return (options.mockResult as (v: TVariables) => TData)(vars);
          }
          return (options.mockResult ?? (undefined as unknown as TData));
        })
      : options.mutationFn,
  });
}
