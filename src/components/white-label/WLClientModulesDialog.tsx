import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  ALL_WL_MODULES,
  DEFAULT_ENABLED_MODULES,
  WL_MODULE_LABELS,
  parseEnabledModules,
  type WLModuleSlug,
} from "@/lib/wlModuleVisibility";

interface WLClientModulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  clientName?: string;
  onSaved?: () => void;
}

export function WLClientModulesDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSaved,
}: WLClientModulesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState<WLModuleSlug[]>(DEFAULT_ENABLED_MODULES);

  useEffect(() => {
    if (!open || !clientId) return;
    setLoading(true);
    supabase
      .from("white_label_clients")
      .select("enabled_modules")
      .eq("id", clientId)
      .single()
      .then(({ data }) => {
        setEnabled(parseEnabledModules((data as any)?.enabled_modules));
        setLoading(false);
      });
  }, [open, clientId]);

  const toggle = (slug: WLModuleSlug) => {
    if (slug === "dashboard") return; // dashboard always on
    setEnabled((prev) =>
      prev.includes(slug) ? prev.filter((m) => m !== slug) : [...prev, slug]
    );
  };

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    const { error } = await supabase
      .from("white_label_clients")
      .update({ enabled_modules: enabled } as any)
      .eq("id", clientId);
    setSaving(false);
    if (error) {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Modules updated", description: `${clientName || "Client"} portal updated.` });
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Portal Modules</DialogTitle>
          <DialogDescription>
            Choose which sections this client can access in their portal.
            Dashboard is always available.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {ALL_WL_MODULES.map((slug) => {
              const isOn = enabled.includes(slug);
              const isLocked = slug === "dashboard";
              return (
                <div
                  key={slug}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
                >
                  <Label
                    htmlFor={`mod-${slug}`}
                    className="font-medium cursor-pointer"
                  >
                    {WL_MODULE_LABELS[slug]}
                    {isLocked && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (always on)
                      </span>
                    )}
                  </Label>
                  <Switch
                    id={`mod-${slug}`}
                    checked={isOn}
                    disabled={isLocked}
                    onCheckedChange={() => toggle(slug)}
                  />
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
