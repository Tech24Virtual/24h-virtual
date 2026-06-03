import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildPhases, type BuildPhase } from "@/data/buildMap";
import {
  applyPhaseOverrides,
  deriveOverrideFlags,
  type Wave1SignoffValue,
} from "@/data/buildMapOverrides";

const STORAGE_KEY = "wave_1_uat_signoff_confirmed";

export interface UseBuildPhaseOverridesResult {
  phases: BuildPhase[];
  isOverridden: boolean;
  loading: boolean;
  signoff: Wave1SignoffValue | null;
}

/**
 * Reads Wave 1 signoff state from `admin_settings` and returns the
 * canonical `buildPhases` array with runtime overrides applied when
 * both the signoff is confirmed and all 5 closeout steps are complete.
 *
 * Subscribes to realtime postgres_changes so /outline reflects the
 * gate flip the moment the 5th closeout step is ticked, even from
 * another tab.
 */
export function useBuildPhaseOverrides(): UseBuildPhaseOverridesResult {
  const [signoff, setSignoff] = useState<Wave1SignoffValue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", STORAGE_KEY)
        .maybeSingle<{ value: Wave1SignoffValue | null }>();
      if (!mounted) return;
      setSignoff((data?.value as Wave1SignoffValue | null) ?? null);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("wave_1_signoff_overrides")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_settings",
          filter: `key=eq.${STORAGE_KEY}`,
        },
        (payload) => {
          const newRow = (payload.new ?? null) as
            | { value?: Wave1SignoffValue | null }
            | null;
          if (payload.eventType === "DELETE") {
            setSignoff(null);
            return;
          }
          setSignoff((newRow?.value as Wave1SignoffValue | null) ?? null);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const flags = useMemo(() => deriveOverrideFlags(signoff), [signoff]);

  const phases = useMemo(
    () => applyPhaseOverrides(buildPhases, flags),
    [flags],
  );

  const isOverridden = flags.signoffConfirmed && flags.allStepsComplete;

  return { phases, isOverridden, loading, signoff };
}
