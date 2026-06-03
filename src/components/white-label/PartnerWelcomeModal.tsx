import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Palette, Globe, UserPlus, DollarSign, ArrowRight, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PartnerWelcomeModalProps {
  partnerName?: string;
}

const QUICK_ACTIONS = [
  {
    icon: Palette,
    title: "Set Your Branding",
    description: "Logo, colors, and partner identity",
    to: "/white-label-dashboard/account/branding",
  },
  {
    icon: Globe,
    title: "Add a Custom Domain",
    description: "Use your own portal hostname",
    to: "/white-label-dashboard/domain",
  },
  {
    icon: UserPlus,
    title: "Add Your First Client",
    description: "Onboard an end client to your portal",
    to: "/white-label-dashboard/clients",
  },
  {
    icon: DollarSign,
    title: "Configure Pricing",
    description: "Set your client-facing plans and rates",
    to: "/white-label-dashboard/account/pricing",
  },
];

export function PartnerWelcomeModal({ partnerName }: PartnerWelcomeModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (profile && (profile as any).partner_welcome_seen !== true) {
      setOpen(true);
    }
  }, [profile]);

  const dismiss = async () => {
    setOpen(false);
    if (!user) return;
    await supabase.from("profiles").update({ partner_welcome_seen: true } as any).eq("id", user.id);
    await refreshProfile?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <PartyPopper className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Welcome aboard</span>
          </div>
          <DialogTitle className="text-2xl">
            Welcome{partnerName ? `, ${partnerName}` : ""}!
          </DialogTitle>
          <DialogDescription>
            Your White Label Partner Dashboard is ready. Here are four quick wins to get your portal live.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.to} to={a.to} onClick={dismiss}>
              <Card className="hover:border-primary/50 hover:shadow-soft transition-all cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <a.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-heading">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="flex justify-end mt-2">
          <Button onClick={dismiss}>
            Got it, let's go <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
