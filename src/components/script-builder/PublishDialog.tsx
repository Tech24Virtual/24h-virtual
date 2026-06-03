import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  History,
  RotateCcw,
  Send,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ScriptDocument, ScriptVersion } from "@/types/scriptDocument";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: ScriptDocument | null;
  versions: ScriptVersion[];
  dirty: boolean;
  isSaving: boolean;
  publish: (notes?: string) => Promise<unknown>;
  rollback: (versionId: string) => Promise<unknown>;
}

export function PublishDialog({
  open,
  onOpenChange,
  document: doc,
  versions,
  dirty,
  isSaving,
  publish,
  rollback,
}: Props) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"publish" | string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const currentVersionId = doc?.current_version_id ?? null;

  const handlePublish = async () => {
    setOpError(null);
    setBusy("publish");
    try {
      await publish(notes.trim() || undefined);
      toast.success("Published");
      setNotes("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed";
      setOpError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleRollback = async (versionId: string, versionNumber: number) => {
    setOpError(null);
    setBusy(versionId);
    try {
      await rollback(versionId);
      toast.success(`Rolled back to v${versionNumber}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Rollback failed";
      setOpError(msg);
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Publish & Version History
          </DialogTitle>
          <DialogDescription>
            Publish the current draft as a new version, or roll back to a previous
            published version.
          </DialogDescription>
        </DialogHeader>

        {opError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Operation failed</AlertTitle>
            <AlertDescription>
              <p className="font-mono text-xs">{opError}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Publish section */}
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Publish current draft</h4>
              <p className="text-xs text-muted-foreground">
                Freezes the working tree as a new immutable version.
              </p>
            </div>
            <DraftStatusBadge dirty={dirty} isSaving={isSaving} hasDoc={!!doc} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="publish-notes" className="text-xs">
              Release notes (optional)
            </Label>
            <Textarea
              id="publish-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="What changed in this version?"
              className="text-sm"
              disabled={busy === "publish"}
            />
          </div>

          <Button
            onClick={handlePublish}
            disabled={!doc || busy !== null || dirty || isSaving}
            className="w-full"
          >
            {busy === "publish" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish new version
          </Button>
          {dirty && (
            <p className="text-[11px] text-muted-foreground">
              Save your draft first; publish requires a clean working tree.
            </p>
          )}
        </div>

        {/* History section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Version history</h4>
            <span className="text-xs text-muted-foreground">
              {versions.length} {versions.length === 1 ? "version" : "versions"}
            </span>
          </div>

          {versions.length === 0 ? (
            <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
              No published versions yet.
            </div>
          ) : (
            <ScrollArea className="h-64 rounded-lg border">
              <ul className="divide-y">
                {versions.map((v) => {
                  const isCurrent = v.id === currentVersionId;
                  const isBusy = busy === v.id;
                  return (
                    <li
                      key={v.id}
                      className={cn(
                        "flex items-start gap-3 p-3",
                        isCurrent && "bg-primary/5",
                      )}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-mono font-semibold">
                        v{v.version_number}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium">
                            Version {v.version_number}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="gap-1 text-[10px]">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(v.published_at).toLocaleString()}
                        </p>
                        {v.notes && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {v.notes}
                          </p>
                        )}
                      </div>
                      {!isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => handleRollback(v.id, v.version_number)}
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Roll back
                            </>
                          )}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DraftStatusBadge({
  dirty,
  isSaving,
  hasDoc,
}: {
  dirty: boolean;
  isSaving: boolean;
  hasDoc: boolean;
}) {
  if (!hasDoc) {
    return (
      <Badge variant="outline" className="text-[10px]">
        No draft yet
      </Badge>
    );
  }
  if (isSaving) {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving
      </Badge>
    );
  }
  if (dirty) {
    return (
      <Badge variant="secondary" className="text-[10px]">
        Unsaved
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="gap-1 text-[10px]">
      <CheckCircle2 className="h-2.5 w-2.5" /> Draft saved
    </Badge>
  );
}
