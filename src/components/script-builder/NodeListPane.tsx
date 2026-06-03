import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_TYPES, getNodeTypeDef } from "@/lib/scriptBuilder/nodeTypes";
import type { ScriptNode } from "@/types/scriptDocument";

interface Props {
  nodes: ScriptNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (type: string) => void;
  onDelete: (id: string) => void;
  badNodeIds?: Set<string>;
}

export function NodeListPane({ nodes, selectedId, onSelect, onAdd, onDelete, badNodeIds }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Nodes</h3>
          <p className="text-xs text-muted-foreground">{nodes.length} total</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {NODE_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <DropdownMenuItem key={t.type} onSelect={() => onAdd(t.type)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="flex-1">
        {nodes.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            No nodes yet. Click <strong>Add</strong> to create the first one.
          </div>
        ) : (
          <ul className="divide-y">
            {nodes.map((node, idx) => {
              const def = getNodeTypeDef(node.type);
              const Icon = def.icon;
              const isSelected = node.id === selectedId;
              const isBad = badNodeIds?.has(node.id) ?? false;
              return (
                <li
                  key={node.id}
                  className={cn(
                    "group flex cursor-pointer items-start gap-2 px-4 py-2.5 transition-colors hover:bg-muted/50",
                    isSelected && "bg-muted",
                  )}
                  onClick={() => onSelect(node.id)}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground",
                      isBad && "ring-1 ring-status-warning text-status-warning",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {node.title || def.label}
                      </span>
                      {isBad && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-warning"
                          title="Has validation issues"
                        />
                      )}
                    </div>
                    {node.body && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {node.body}
                      </p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(node.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
