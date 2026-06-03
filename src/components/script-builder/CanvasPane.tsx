import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNodeTypeDef } from "@/lib/scriptBuilder/nodeTypes";
import type { ScriptNode } from "@/types/scriptDocument";

interface Props {
  nodes: ScriptNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  badNodeIds?: Set<string>;
}

export function CanvasPane({ nodes, selectedId, onSelect, badNodeIds }: Props) {
  return (
    <ScrollArea className="h-full bg-muted/20">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-8">
        {nodes.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border px-12 py-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">Empty script</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a node from the left pane to begin building the agent flow.
            </p>
          </div>
        ) : (
          nodes.map((node, idx) => {
            const def = getNodeTypeDef(node.type);
            const Icon = def.icon;
            const isSelected = node.id === selectedId;
            const isBad = badNodeIds?.has(node.id) ?? false;
            const isLast = idx === nodes.length - 1;
            return (
              <div key={node.id} className="flex w-full flex-col items-center">
                <button
                  onClick={() => onSelect(node.id)}
                  className={cn(
                    "w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : isBad
                        ? "border-status-warning/60 ring-1 ring-status-warning/40"
                        : "border-border",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                          {def.label}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{idx + 1}
                        </span>
                        {isBad && (
                          <span className="rounded bg-status-warning/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-status-warning">
                            issue
                          </span>
                        )}
                      </div>
                      <h4 className="mt-0.5 text-sm font-semibold">
                        {node.title || `Untitled ${def.label}`}
                      </h4>
                      {node.body && (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                          {node.body}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
                {!isLast && <ArrowDown className="my-1 h-4 w-4 text-muted-foreground" />}
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}
