import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WLCallLog = Tables<"wl_call_logs">;

/**
 * Calls `onInsert` whenever a new wl_call_logs row lands for this WL client
 * (Five9 webhook or hourly report pull). `scope` keeps channel names unique so
 * two mounted pages don't share — and tear down — the same channel.
 */
export function useWLCallLogsRealtime(
  wlClientId: string | undefined,
  scope: string,
  onInsert: () => void,
) {
  // Ref so a new callback identity each render doesn't resubscribe the channel.
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (!wlClientId) return;

    const channel = supabase
      .channel(`wl-call-logs-${scope}-${wlClientId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wl_call_logs",
          filter: `wl_client_id=eq.${wlClientId}`,
        },
        () => onInsertRef.current(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wlClientId, scope]);
}

/**
 * All wl_call_logs rows for a client, newest call first, optionally from
 * `fromDate` (YYYY-MM-DD, by call_date). Paged — PostgREST caps a single
 * select at 1000 rows, and busy clients exceed that.
 */
export async function fetchAllWLCallLogs(
  wlClientId: string,
  fromDate?: string,
): Promise<WLCallLog[]> {
  const PAGE = 1000;
  const rows: WLCallLog[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("wl_call_logs")
      .select("*")
      .eq("wl_client_id", wlClientId);
    if (fromDate) query = query.gte("call_date", fromDate);
    const { data, error } = await query
      .order("call_date", { ascending: false, nullsFirst: false })
      .order("call_time", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}
