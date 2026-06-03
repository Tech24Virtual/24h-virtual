import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, AlertTriangle, PhoneCall } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ScriptTree, ScriptNode, ScriptIntent } from "@/types/scriptDocument";

/**
 * Wave 2 Batch E — Iframe runtime page.
 *
 * Chromeless. Renders the published script tree (or admin draft) as a
 * stacked, scrollable, agent-readable script. Mounted outside the dashboard
 * layout so Five9 can embed it without pulling in the rest of the app.
 */

interface Bundle {
  campaignId: string;
  documentId: string;
  version: "published" | "draft";
  versionNumber: number | null;
  publishedAt: string | null;
  tree: ScriptTree;
  scenarios: unknown[];
  faqs: unknown[];
  policies: unknown[];
}

export default function RunCampaignScript() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [search] = useSearchParams();
  const requestedVersion = search.get("version") === "draft" ? "draft" : "published";

  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!campaignId) {
        setError("No campaign ID provided");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("get-campaign-runtime-bundle", {
          method: "GET",
          // supabase-js encodes query via the body's url builder; pass via custom path:
          // workaround: we use direct fetch
        } as never);
        // Fallback: invoke supports body but not query string cleanly across versions.
        if (!cancelled && data && !error) {
          setBundle(data as Bundle);
          setLoading(false);
          return;
        }
        // Direct fetch if invoke didn't work for query params
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/get-campaign-runtime-bundle?campaignId=${encodeURIComponent(campaignId)}&version=${requestedVersion}`;
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(body?.error ?? `HTTP ${res.status}`);
        } else {
          setBundle(body as Bundle);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load script");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [campaignId, requestedVersion]);

  const handleIntent = (intent: ScriptIntent) => {
    try {
      window.parent?.postMessage(
        {
          type: "campaign-runtime/intent",
          campaignId,
          intentId: intent.id,
          intentName: intent.name,
          disposition: intent.disposition ?? null,
          routing: intent.routing ?? null,
        },
        "*",
      );
    } catch {
      // ignore postMessage errors
    }
  };

  return (
    <>
      <Helmet>
        <title>Campaign Script Runtime</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <RuntimeHeader bundle={bundle} version={requestedVersion} />
        <div className="mx-auto max-w-3xl px-4 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading script…
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> Could not load script
              </div>
              <p className="mt-1 text-xs">{error}</p>
            </div>
          )}
          {bundle && <ScriptRenderer bundle={bundle} onIntent={handleIntent} />}
        </div>
      </div>
    </>
  );
}

function RuntimeHeader({
  bundle,
  version,
}: {
  bundle: Bundle | null;
  version: "published" | "draft";
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <PhoneCall className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Campaign Script</span>
        </div>
        <div className="flex items-center gap-2">
          {version === "draft" && (
            <Badge variant="destructive" className="text-[10px]">DRAFT PREVIEW</Badge>
          )}
          {bundle?.versionNumber != null && (
            <Badge variant="outline" className="text-[10px]">
              v{bundle.versionNumber}
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}

function ScriptRenderer({
  bundle,
  onIntent,
}: {
  bundle: Bundle;
  onIntent: (i: ScriptIntent) => void;
}) {
  const tree = bundle.tree;
  const orderedNodes = useMemo(() => orderNodes(tree), [tree]);

  if (orderedNodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Script is empty.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orderedNodes.map((n) => (
        <NodeCard key={n.id} node={n} />
      ))}

      {tree.intents.length > 0 && (
        <div className="mt-6 space-y-2 rounded-lg border bg-muted/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outcomes
          </h3>
          <div className="flex flex-wrap gap-2">
            {tree.intents.map((i) => (
              <Button key={i.id} size="sm" variant="outline" onClick={() => onIntent(i)}>
                {i.name || "Unnamed intent"}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NodeCard({ node }: { node: ScriptNode }) {
  const typeLabel = node.type.charAt(0).toUpperCase() + node.type.slice(1);
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          {typeLabel}
        </Badge>
        {node.title && <span className="text-sm font-medium">{node.title}</span>}
      </div>
      {node.body && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {node.body}
        </p>
      )}
    </div>
  );
}

/**
 * Order nodes for linear rendering: greeting first, end last, others in between
 * preserving the order they appear in tree.nodes.
 */
function orderNodes(tree: ScriptTree): ScriptNode[] {
  const greetings = tree.nodes.filter((n) => n.type === "greeting");
  const ends = tree.nodes.filter((n) => n.type === "end");
  const middle = tree.nodes.filter((n) => n.type !== "greeting" && n.type !== "end");
  return [...greetings, ...middle, ...ends];
}
