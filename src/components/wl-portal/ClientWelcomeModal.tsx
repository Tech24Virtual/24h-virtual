import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Phone, PhoneOutgoing, ArrowRight, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useWLPortal } from "@/contexts/WLPortalContext";
import { wlClientUrl } from "@/lib/wlClientUrl";

export function ClientWelcomeModal() {
  const { slug, clientInfo, branding } = useWLPortal();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (clientInfo && (clientInfo as any).welcome_seen !== true) {
      setOpen(true);
    }
  }, [clientInfo]);

  const dismiss = async () => {
    setOpen(false);
    if (!clientInfo) return;
    await supabase
      .from("white_label_clients")
      .update({ welcome_seen: true } as any)
      .eq("id", clientInfo.id);
  };

  const brandName = branding?.company_name || "your service provider";
  const greeting = clientInfo?.contact_name || clientInfo?.client_name;

  const actions = [
    {
      icon: FileText,
      title: "Review Your Scripts",
      description: "Check how your callers are greeted",
      to: wlClientUrl(slug, "scripts"),
    },
    {
      icon: Phone,
      title: "See Recent Calls",
      description: "Browse calls handled this month",
      to: wlClientUrl(slug, "calls"),
    },
    {
      icon: PhoneOutgoing,
      title: "Request an Outbound Call",
      description: "Have an agent call a contact for you",
      to: wlClientUrl(slug, "outbound-requests"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <PartyPopper className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Welcome</span>
          </div>
          {branding?.logo_url && (
            <img src={branding.logo_url} alt={brandName} className="h-10 w-auto mb-2 object-contain" />
          )}
          <DialogTitle className="text-2xl">
            Welcome{greeting ? `, ${greeting}` : ""}!
          </DialogTitle>
          <DialogDescription>
            {branding?.welcome_message ||
              `${brandName} has set up your client portal. Here are a few things you can do right away.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {actions.map((a) => (
            <Link key={a.to} to={a.to} onClick={dismiss}>
              <Card className="hover:border-primary/50 hover:shadow-soft transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <a.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-heading">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="flex justify-end mt-2">
          <Button onClick={dismiss}>Got it</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
