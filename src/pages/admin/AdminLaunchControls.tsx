import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Rocket, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLaunchFlags, type LaunchFlag } from "@/hooks/useLaunchFlags";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logAuditEvent } from "@/lib/audit";

type PendingToggle = {
  flag: LaunchFlag;
  nextValue: boolean;
} | null;

const AdminLaunchControls = () => {
  const { data: flags, isLoading } = useLaunchFlags();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingToggle>(null);
  const [confirmText, setConfirmText] = useState("");

  const mutation = useMutation({
    mutationFn: async ({ flag, nextValue }: { flag: LaunchFlag; nextValue: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("feature_launch_flags")
        .update({
          is_live: nextValue,
          updated_by: userData.user?.id ?? null,
        })
        .eq("feature_key", flag.feature_key);
      if (error) throw error;
      return { flag, nextValue };
    },
    onSuccess: ({ flag, nextValue }) => {
      queryClient.invalidateQueries({ queryKey: ["feature_launch_flags"] });
      logAuditEvent({
        action: "admin.tool.launched",
        target_table: "feature_launch_flags",
        target_id: flag.feature_key,
        metadata: {
          event: "launch_flag_toggled",
          feature_key: flag.feature_key,
          display_name: flag.display_name,
          previous: flag.is_live,
          next: nextValue,
        },
      });
      toast.success(
        nextValue
          ? `${flag.display_name} is now LIVE on the public site`
          : `${flag.display_name} reverted to Coming Soon`,
      );
      setPending(null);
      setConfirmText("");
    },
    onError: (err: Error) => {
      toast.error(`Failed to update flag: ${err.message}`);
    },
  });

  const requestToggle = (flag: LaunchFlag, nextValue: boolean) => {
    setPending({ flag, nextValue });
    setConfirmText("");
  };

  const goingLive = pending?.nextValue === true;
  const confirmEnabled = goingLive ? confirmText.trim().toUpperCase() === "LIVE" : true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-poppins text-3xl font-bold mb-2 capitalize flex items-center gap-3">
          <Rocket className="w-7 h-7 text-primary" />
          Launch Controls
        </h1>
        <p className="text-muted-foreground">
          Flip a feature live or revert it to Coming Soon. Changes take effect instantly across all
          visitors. Every toggle is logged to the audit trail.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {(flags ?? []).map((flag) => (
            <Card key={flag.feature_key} className="border-border/60">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <CardTitle className="text-xl">{flag.display_name}</CardTitle>
                    {flag.is_live ? (
                      <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 hover:bg-green-500/10">
                        <Eye className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">{flag.description}</CardDescription>
                  <p className="text-xs text-muted-foreground mt-2">
                    Last updated {format(new Date(flag.updated_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <Switch
                  checked={flag.is_live}
                  onCheckedChange={(checked) => requestToggle(flag, checked)}
                  disabled={mutation.isPending}
                  aria-label={`Toggle ${flag.display_name}`}
                />
              </CardHeader>
              <CardContent className="pt-0">
                <code className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                  /solutions/{flag.feature_key}
                </code>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert
                className={
                  goingLive ? "w-5 h-5 text-[#E74A3E]" : "w-5 h-5 text-amber-500"
                }
              />
              {goingLive ? "Make this feature LIVE?" : "Revert to Coming Soon?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                {goingLive ? (
                  <>
                    <p className="text-foreground font-medium">
                      You are about to make <strong>{pending?.flag.display_name}</strong> publicly
                      live.
                    </p>
                    <p>
                      Visitors will <strong>immediately</strong> see the production page instead of
                      the Coming Soon screen. Search engines will begin indexing this URL. This
                      action is logged to the audit trail and cannot be undone silently.
                    </p>
                    <div className="rounded-lg border border-[#E74A3E]/30 bg-[#E74A3E]/5 p-3 text-sm">
                      Type <strong className="font-mono text-[#E74A3E]">LIVE</strong> below to
                      confirm.
                    </div>
                  </>
                ) : (
                  <p>
                    Visitors to <strong>{pending?.flag.display_name}</strong> will see the Coming
                    Soon page again. The live page will be hidden but not deleted.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {goingLive && (
            <div className="space-y-2">
              <Label htmlFor="confirm-live">Confirmation</Label>
              <Input
                id="confirm-live"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type LIVE to confirm"
                autoComplete="off"
                autoFocus
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!confirmEnabled || mutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pending && confirmEnabled) {
                  mutation.mutate({ flag: pending.flag, nextValue: pending.nextValue });
                }
              }}
              className={
                goingLive
                  ? "bg-[#E74A3E] hover:bg-[#E74A3E]/90 text-white"
                  : ""
              }
            >
              {mutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : goingLive ? (
                "Go Live"
              ) : (
                "Revert"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminLaunchControls;
