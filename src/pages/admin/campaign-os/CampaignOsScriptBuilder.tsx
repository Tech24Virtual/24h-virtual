import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, AlertTriangle, Save, Lock, Send, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

import { useCampaign } from "@/hooks/campaign-os/useCampaigns";
import { useScriptDocument } from "@/hooks/useScriptDocument";
import { EMPTY_TREE, type ScriptNode, type ScriptTree } from "@/types/scriptDocument";
import { getNodeTypeDef } from "@/lib/scriptBuilder/nodeTypes";
import { NodeListPane } from "@/components/script-builder/NodeListPane";
import { CanvasPane } from "@/components/script-builder/CanvasPane";
import { PropertiesPane } from "@/components/script-builder/PropertiesPane";
import { PublishDialog } from "@/components/script-builder/PublishDialog";
import { ValidationBadge } from "@/components/script-builder/ValidationBadge";
import { validateScriptTree } from "@/lib/scriptBuilder/validateScriptTree";
import { TemplatePicker } from "@/components/script-builder/TemplatePicker";
import { useGoLiveChecks } from "@/hooks/campaign-os/useGoLiveChecks";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AUTOSAVE_DELAY_MS = 1200;

function makeNodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CampaignOsScriptBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const campaignQ = useCampaign(id);
  const campaign = campaignQ.data;

  const {
    document: doc,
    versions,
    isLoading,
    isSaving,
    error,
    save,
    publish,
    rollback,
  } = useScriptDocument(id);

  // Local working tree — debounced into useScriptDocument.save().
  const [tree, setTree] = useState<ScriptTree>(EMPTY_TREE);
  const [title, setTitle] = useState<string>("Untitled Script");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const lastServerStamp = useRef<string | null>(null);
  const autoTemplateOffered = useRef(false);

  // Hydrate from server. Only reset local state when the server row genuinely
  // changes (id+updated_at), so in-flight edits are not blown away mid-typing.
  useEffect(() => {
    if (!doc) return;
    const stamp = `${doc.id}:${doc.updated_at}`;
    if (lastServerStamp.current === stamp) return;
    lastServerStamp.current = stamp;
    setTree(doc.tree ?? EMPTY_TREE);
    setTitle(doc.title);
    setDirty(false);
  }, [doc]);

  // Debounced autosave.
  useEffect(() => {
    if (!dirty || !id) return;
    const t = setTimeout(() => {
      save(tree, title).catch((e) => {
        toast.error(e instanceof Error ? e.message : "Autosave failed");
      });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [dirty, tree, title, id, save]);

  // Offer the template picker once when the doc is empty (new or genuinely blank).
  useEffect(() => {
    if (isLoading) return;
    if (autoTemplateOffered.current) return;
    if (tree.nodes.length === 0) {
      autoTemplateOffered.current = true;
      setTemplateOpen(true);
    }
  }, [isLoading, tree.nodes.length]);

  const selectedNode = useMemo<ScriptNode | null>(
    () => tree.nodes.find((n) => n.id === selectedId) ?? null,
    [tree.nodes, selectedId],
  );

  const validation = useMemo(() => validateScriptTree(tree), [tree]);
  const goLiveQ = useGoLiveChecks(id);
  const goLive = goLiveQ.data;
  // Non-script readiness gates the Publish action (script_published is the
  // outcome of publishing, so we don't gate on it here).
  const nonScriptBlocked = !!goLive && (!goLive.faqs_ok || !goLive.policies_ok || !goLive.training_ok);
  const missingNonScript: string[] = [];
  if (goLive && !goLive.faqs_ok) missingNonScript.push('approved FAQ');
  if (goLive && !goLive.policies_ok) missingNonScript.push('approved policy');
  if (goLive && !goLive.training_ok) missingNonScript.push('training signoffs');

  // Wrappers that refetch go-live readiness immediately after a version change
  // so the Ready/Not-ready badge and checklist reflect script_published without
  // needing a manual refresh or polling tick.
  const publishAndRefreshReadiness = useMemo(
    () => async (notes?: string) => {
      const result = await publish(notes);
      void goLiveQ.refetch();
      return result;
    },
    [publish, goLiveQ],
  );
  const rollbackAndRefreshReadiness = useMemo(
    () => async (versionId: string) => {
      const result = await rollback(versionId);
      void goLiveQ.refetch();
      return result;
    },
    [rollback, goLiveQ],
  );

  const handleApplyTemplate = ({
    tree: nextTree,
    title: nextTitle,
    templateId,
  }: {
    tree: ScriptTree;
    title: string;
    templateId: string;
  }) => {
    setTree(nextTree);
    // Only overwrite the title when the user hasn't customized it yet.
    if (!title || title === "Untitled Script") {
      setTitle(nextTitle);
    }
    setSelectedId(nextTree.nodes[0]?.id ?? null);
    setDirty(true);
    if (templateId !== "blank") {
      toast.success("Template applied — autosaving your draft");
    }
  };

  const handleAddNode = (type: string) => {
    const def = getNodeTypeDef(type);
    const newNode: ScriptNode = {
      id: makeNodeId(),
      type,
      title: "",
      body: def.defaultBody ?? "",
    };
    setTree((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedId(newNode.id);
    setDirty(true);
  };

  const handleDeleteNode = (nodeId: string) => {
    setTree((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.from !== nodeId && e.to !== nodeId),
    }));
    if (selectedId === nodeId) setSelectedId(null);
    setDirty(true);
  };

  const handlePatchNode = (patch: Partial<ScriptNode>) => {
    if (!selectedId) return;
    setTree((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === selectedId ? { ...n, ...patch } : n,
      ),
    }));
    setDirty(true);
  };

  const handleSaveNow = async () => {
    if (!id) return;
    try {
      await save(tree, title);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  if (campaignQ.isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading campaign…
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" onClick={() => navigate("/admin/campaign-os/campaigns")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to campaigns
        </Button>
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Campaign not found.
        </div>
      </div>
    );
  }

  const isReadOnly = campaign.status === "archived";

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-lg border bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/campaign-os/campaigns/${id}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="hidden h-5 w-px bg-border md:block" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {campaign.display_name} · Script Builder
            </p>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              placeholder="Script title"
              disabled={isReadOnly}
              className="h-7 w-72 max-w-full border-none px-0 text-base font-semibold shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isReadOnly && (
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" /> Read-only
            </Badge>
          )}
          <ValidationBadge report={validation} onJumpToNode={setSelectedId} />
          {goLive && (
            <Badge
              variant={goLive.all_ok ? 'default' : 'outline'}
              className="gap-1"
              title={goLive.all_ok ? 'All go-live checks pass' : 'Go-live checks: action required'}
            >
              {goLive.all_ok ? 'Ready' : 'Not ready'}
            </Badge>
          )}
          <SaveStatus isSaving={isSaving} dirty={dirty} error={error} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTemplateOpen(true)}
            disabled={isReadOnly}
          >
            <LayoutTemplate className="mr-1 h-3.5 w-3.5" /> Templates
          </Button>
          <Button size="sm" onClick={handleSaveNow} disabled={isSaving || isReadOnly}>
            <Save className="mr-1 h-3.5 w-3.5" /> Save
          </Button>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPublishOpen(true)}
                    disabled={isReadOnly || validation.errorCount > 0 || nonScriptBlocked}
                  >
                    <Send className="mr-1 h-3.5 w-3.5" /> Publish…
                  </Button>
                </span>
              </TooltipTrigger>
              {(validation.errorCount > 0 || nonScriptBlocked) && (
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {validation.errorCount > 0
                    ? `Resolve ${validation.errorCount} validation error(s) before publishing.`
                    : `Go-live blocked. Missing: ${missingNonScript.join(', ')}.`}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Three-pane workspace */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading script…
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={22} minSize={16} maxSize={32}>
              <NodeListPane
                nodes={tree.nodes}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAdd={handleAddNode}
                onDelete={handleDeleteNode}
                badNodeIds={validation.badNodeIds}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <CanvasPane
                nodes={tree.nodes}
                selectedId={selectedId}
                onSelect={setSelectedId}
                badNodeIds={validation.badNodeIds}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={28} minSize={20} maxSize={40}>
              <PropertiesPane node={selectedNode} onChange={handlePatchNode} campaignId={id} />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        document={doc}
        versions={versions}
        dirty={dirty}
        isSaving={isSaving}
        publish={publishAndRefreshReadiness}
        rollback={rollbackAndRefreshReadiness}
      />

      <TemplatePicker
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onSelect={handleApplyTemplate}
      />
    </div>
  );
}

function SaveStatus({
  isSaving,
  dirty,
  error,
}: {
  isSaving: boolean;
  dirty: boolean;
  error: string | null;
}) {
  if (error) {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertTriangle className="h-3 w-3" /> {error}
      </span>
    );
  }
  if (isSaving) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (dirty) {
    return <span className="text-xs text-muted-foreground">Unsaved changes</span>;
  }
  return <span className="text-xs text-muted-foreground">All changes saved</span>;
}
