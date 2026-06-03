import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_TREE,
  type ScriptDocument,
  type ScriptTree,
  type ScriptVersion,
} from "@/types/scriptDocument";

/**
 * Wave 2 Batch A — Script Document hook.
 *
 * Tenant-scoped fetch + autosave for one campaign's script document(s).
 * `publish` and `rollback` are intentionally stubbed — they call RPCs
 * that ship in Batch C. Stable surface so Batch B (Builder UI) can wire
 * against the final API today.
 */

export interface UseScriptDocumentResult {
  document: ScriptDocument | null;
  versions: ScriptVersion[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  save: (tree: ScriptTree, title?: string) => Promise<void>;
  publish: (notes?: string) => Promise<void>;
  rollback: (versionId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useScriptDocument(
  campaignId: string | null | undefined,
  docId?: string | null,
): UseScriptDocumentResult {
  const [document, setDocument] = useState<ScriptDocument | null>(null);
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaignId) {
      setDocument(null);
      setVersions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("campaign_script_documents")
        .select("*")
        .eq("campaign_id", campaignId);

      if (docId) query = query.eq("id", docId);

      const { data, error: docErr } = await query
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (docErr) throw docErr;
      const doc = (data as unknown as ScriptDocument) ?? null;
      setDocument(doc);

      if (doc) {
        const { data: vs, error: vErr } = await supabase
          .from("campaign_script_document_versions")
          .select("*")
          .eq("document_id", doc.id)
          .order("version_number", { ascending: false });
        if (vErr) throw vErr;
        setVersions((vs as unknown as ScriptVersion[]) ?? []);
      } else {
        setVersions([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load script document");
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, docId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (tree: ScriptTree, title?: string) => {
      if (!campaignId) throw new Error("No campaign context");
      setIsSaving(true);
      setError(null);
      try {
        if (document) {
          const { data, error: upErr } = await supabase
            .from("campaign_script_documents")
            .update({
              tree: tree as unknown as never,
              ...(title ? { title } : {}),
            })
            .eq("id", document.id)
            .select()
            .single();
          if (upErr) throw upErr;
          setDocument(data as unknown as ScriptDocument);
        } else {
          // Need the parent campaign's tenant fields to seed the row.
          const { data: camp, error: cErr } = await supabase
            .from("campaigns")
            .select("tenant_kind, wl_partner_id, wl_client_id, client_lead_id")
            .eq("id", campaignId)
            .single();
          if (cErr) throw cErr;

          const { data, error: insErr } = await supabase
            .from("campaign_script_documents")
            .insert({
              campaign_id: campaignId,
              tenant_kind: camp.tenant_kind,
              wl_partner_id: camp.wl_partner_id,
              wl_client_id: camp.wl_client_id,
              client_lead_id: camp.client_lead_id,
              title: title ?? "Untitled Script",
              tree: (tree ?? EMPTY_TREE) as unknown as never,
            })
            .select()
            .single();
          if (insErr) throw insErr;
          setDocument(data as unknown as ScriptDocument);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to save script";
        setError(msg);
        throw e;
      } finally {
        setIsSaving(false);
      }
    },
    [campaignId, document],
  );

  const publish = useCallback(
    async (notes?: string) => {
      if (!document) throw new Error("No script document to publish");
      const { error: rpcErr } = await supabase.rpc("publish_script_document", {
        p_document_id: document.id,
        p_notes: notes ?? null,
      });
      if (rpcErr) throw rpcErr;
      await load();
    },
    [document, load],
  );

  const rollback = useCallback(
    async (versionId: string) => {
      if (!document) throw new Error("No script document to roll back");
      const { error: rpcErr } = await supabase.rpc("rollback_script_document", {
        p_document_id: document.id,
        p_version_id: versionId,
      });
      if (rpcErr) throw rpcErr;
      await load();
    },
    [document, load],
  );

  return {
    document,
    versions,
    isLoading,
    isSaving,
    error,
    save,
    publish,
    rollback,
    refresh: load,
  };
}
