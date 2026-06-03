import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';
import { isMockMode } from '@/lib/mockMode';
import { useMockMode } from './useMockMode';

/**
 * Wrapper around useQuery that returns mock data when mock mode is on.
 *
 * Hook-order safety:
 *  - useQuery is ALWAYS called (preserves stable hook order across renders).
 *  - In mock mode we pass `enabled: false` so no network call fires, then
 *    discard the real result entirely and return a fully-formed synthetic
 *    success object. Consumers never see a half-disabled "still loading"
 *    state — every status field is intentionally set.
 */
export function useMockableQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    mockData: TData | (() => TData);
  },
): UseQueryResult<TData, TError> {
  const mockOn = useMockMode() || isMockMode();

  // ALWAYS call useQuery — never conditionally — to keep hook order stable.
  const realResult = useQuery({
    ...options,
    enabled: mockOn ? false : options.enabled,
  });

  if (!mockOn) return realResult;

  const data =
    typeof options.mockData === 'function'
      ? (options.mockData as () => TData)()
      : options.mockData;

  // Fully-formed synthetic success — every field intentional, no fake loading.
  const synthetic = {
    data,
    dataUpdatedAt: Date.now(),
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    status: 'success' as const,
    fetchStatus: 'idle' as const,
    refetch: async () => ({
      data,
      isSuccess: true,
      status: 'success',
    }) as any,
    promise: Promise.resolve(data),
  } as unknown as UseQueryResult<TData, TError>;

  return synthetic;
}
