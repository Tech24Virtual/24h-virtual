import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  type OutlineStatus,
  type OutlineStatusOverride,
  type OutlineStatusOverrideMap,
} from "@/lib/outline/status";

const SETTINGS_KEY = "outline_status_overrides";

/**
 * Reads the founder-managed status override map from admin_settings and
 * subscribes to realtime changes so /outline stays in sync across tabs.
 *
 * Writes are admin-only at the UI level; the SETTINGS_KEY row itself is
 * already protected by existing admin_settings RLS.
 */
export function useOutlineStatusOverrides() {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<OutlineStatusOverrideMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", SETTINGS_KEY)
        .maybeSingle<{ value: OutlineStatusOverrideMap | null }>();
      if (!mounted) return;
      setOverrides((data?.value as OutlineStatusOverrideMap | null) ?? {});
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("outline_status_overrides_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_settings",
          filter: `key=eq.${SETTINGS_KEY}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setOverrides({});
            return;
          }
          const newRow = payload.new as
            | { value?: OutlineStatusOverrideMap | null }
            | null;
          setOverrides(
            (newRow?.value as OutlineStatusOverrideMap | null) ?? {},
          );
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const setItemStatus = useCallback(
    async (itemId: string, status: OutlineStatus | null, note?: string) => {
      setSaving(true);
      const next: OutlineStatusOverrideMap = { ...overrides };
      if (status === null) {
        delete next[itemId];
      } else {
        const entry: OutlineStatusOverride = {
          status,
          note: note?.trim() || undefined,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        };
        next[itemId] = entry;
      }

      // Optimistic UI; realtime will reconcile if a remote write races us.
      setOverrides(next);

      const { error } = await supabase
        .from("admin_settings")
        .upsert(
          [
            {
              key: SETTINGS_KEY,
              value: next as unknown as Json,
              updated_by: user?.id ?? null,
            },
          ],
          { onConflict: "key" },
        );

      setSaving(false);
      if (error) {
        // Revert optimistic on hard failure.
        setOverrides(overrides);
        throw error;
      }
    },
    [overrides, user?.id],
  );

  return { overrides, loading, saving, setItemStatus };
}
