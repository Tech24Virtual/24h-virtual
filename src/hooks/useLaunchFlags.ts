import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LaunchFlagKey = "ai-receptionist" | "hybrid-receptionist";

export interface LaunchFlag {
  feature_key: string;
  display_name: string;
  description: string | null;
  is_live: boolean;
  updated_at: string;
  updated_by: string | null;
}

const QUERY_KEY = ["feature_launch_flags"] as const;

async function fetchLaunchFlags(): Promise<LaunchFlag[]> {
  const { data, error } = await supabase
    .from("feature_launch_flags")
    .select("*")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LaunchFlag[];
}

/**
 * Subscribes once per app session to realtime updates on feature_launch_flags
 * and keeps the React Query cache in sync. Returns all flags.
 */
export function useLaunchFlags() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLaunchFlags,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const channel = supabase
      .channel("feature_launch_flags_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_launch_flags" },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

/**
 * Returns whether a specific feature is currently live.
 * `loading` is true on first load; once loaded, `isLive` reflects the DB state.
 * Defaults to NOT live while loading so we never accidentally expose a gated page.
 */
export function useFeatureLive(key: LaunchFlagKey): {
  isLive: boolean;
  loading: boolean;
} {
  const { data, isLoading } = useLaunchFlags();
  const flag = data?.find((f) => f.feature_key === key);
  return {
    isLive: flag?.is_live ?? false,
    loading: isLoading,
  };
}

/**
 * Convenience hook that returns whether *any* given service slug is gated
 * (i.e., a known launch flag exists for it AND it is currently not live).
 * Unknown slugs are treated as NOT gated so we don't accidentally hide
 * services that were never meant to be gated.
 */
export function useGatedServices(): {
  isGated: (slug: string) => boolean;
  loading: boolean;
} {
  const { data, isLoading } = useLaunchFlags();
  const isGated = (slug: string) => {
    const flag = data?.find((f) => f.feature_key === slug);
    if (!flag) return false; // unknown slug → not gated
    return !flag.is_live;
  };
  return { isGated, loading: isLoading };
}
