import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  SCRIPT_TEMPLATES,
  instantiateTemplate,
  type ScriptTemplate,
} from "@/lib/scriptBuilder/scriptTemplates";
import type { ScriptTree } from "@/types/scriptDocument";

interface Props {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Called with a freshly instantiated tree + suggested title. */
  onSelect: (payload: { tree: ScriptTree; title: string; templateId: string }) => void;
  /** When true, the dialog cannot be dismissed without choosing — used for
   *  brand-new (empty) documents to enforce a starting point. */
  forceChoice?: boolean;
}

export function TemplatePicker({ open, onOpenChange, onSelect, forceChoice }: Props) {
  const handlePick = (tpl: ScriptTemplate) => {
    const inst = instantiateTemplate(tpl.id);
    if (!inst) return;
    onSelect({ tree: inst.tree, title: inst.title, templateId: tpl.id });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && forceChoice) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>
            Pick a common receptionist workflow to pre-populate your script.
            You can edit every node afterwards.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {SCRIPT_TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              const isBlank = tpl.id === "blank";
              return (
                <button
                  key={tpl.id}
                  onClick={() => handlePick(tpl)}
                  className={cn(
                    "group flex h-full flex-col rounded-lg border bg-card p-4 text-left transition-all",
                    "hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isBlank && "border-dashed",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                        isBlank
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold">{tpl.label}</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tpl.description}
                      </p>
                    </div>
                  </div>

                  {tpl.highlights.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {tpl.highlights.map((h, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                        >
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {!forceChoice && (
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
