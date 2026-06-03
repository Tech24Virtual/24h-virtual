import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNodeTypeDef } from "@/lib/scriptBuilder/nodeTypes";
import type { ScriptNode } from "@/types/scriptDocument";
import { AiDraftBlockDialog } from "@/components/campaign-os/AiDraftBlockDialog";

interface Props {
  node: ScriptNode | null;
  onChange: (patch: Partial<ScriptNode>) => void;
  campaignId?: string;
}

export function PropertiesPane({ node, onChange, campaignId }: Props) {
  // Local mirror so we can debounce/blur without losing focus on parent re-render.
  const [title, setTitle] = useState(node?.title ?? "");
  const [body, setBody] = useState(node?.body ?? "");
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    setTitle(node?.title ?? "");
    setBody(node?.body ?? "");
  }, [node?.id]);

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div className="max-w-xs">
          <p className="text-sm font-medium text-muted-foreground">No node selected</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick a node from the list or canvas to edit its properties.
          </p>
        </div>
      </div>
    );
  }

  const def = getNodeTypeDef(node.type);
  const Icon = def.icon;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-5">
        <div className="flex items-start gap-3 border-b pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              {def.label}
            </Badge>
            <p className="mt-1.5 text-xs text-muted-foreground">{def.description}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="node-title" className="text-xs font-medium">
            Title
          </Label>
          <Input
            id="node-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title !== (node.title ?? "")) onChange({ title });
            }}
            placeholder={`Untitled ${def.label}`}
          />
          <p className="text-[11px] text-muted-foreground">
            Internal label shown in the list and canvas.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="node-body" className="text-xs font-medium">
              Body
            </Label>
            {campaignId && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setAiOpen(true)}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Draft with AI
              </Button>
            )}
          </div>
          <Textarea
            id="node-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => {
              if (body !== (node.body ?? "")) onChange({ body });
            }}
            rows={6}
            placeholder={
              node.type === "branch"
                ? "Describe the branching condition (Batch C wires real branches)."
                : "What the agent reads or does at this step."
            }
            className="resize-none font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5 border-t pt-4">
          <Label className="text-xs font-medium">Node ID</Label>
          <code className="block rounded bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
            {node.id}
          </code>
        </div>
      </div>

      {campaignId && (
        <AiDraftBlockDialog
          open={aiOpen}
          onOpenChange={setAiOpen}
          campaignId={campaignId}
          contextMd={body}
          onAccept={(d) => {
            setTitle(d.title);
            setBody(d.body_md);
            onChange({ title: d.title, body: d.body_md });
          }}
        />
      )}
    </ScrollArea>
  );
}
