import { useState } from "react";
import { Phone, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUTMParams } from "@/hooks/useUTMParams";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

interface WebCallbackWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultReason?: string;
}

function classifyIntent(pathname: string): string {
  if (/\/(pricing|demo|get-started|plans|roi|launch-estimator)/i.test(pathname)) return "sales";
  if (/\/(support|help|faq)/i.test(pathname)) return "support";
  if (/\/(partners|white-label|affiliate|reseller)/i.test(pathname)) return "partner";
  return "sales";
}

function mapQueue(intent: string): string {
  const map: Record<string, string> = {
    sales: "24H-WEB-SALES",
    support: "24H-WEB-SUPPORT",
    partner: "24H-WEB-PARTNER",
  };
  return map[intent] || "24H-WEB-SALES";
}

export function WebCallbackWidget({ open, onOpenChange, defaultReason }: WebCallbackWidgetProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [callbackType, setCallbackType] = useState<"instant" | "scheduled">("instant");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const utm = useUTMParams();
  const location = useLocation();

  const intent = classifyIntent(location.pathname);
  const queue = mapQueue(intent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("outbound_call_requests").insert({
        contact_name: name.trim() || "Website Visitor",
        contact_phone: phone.trim(),
        reason: defaultReason || `Web callback from ${location.pathname}`,
        source: "web_callback",
        urgency: callbackType === "instant" ? "urgent" : "normal",
        callback_type: callbackType,
        routing_mode: "human",
        intent,
        target_queue: queue,
        source_channel: "web_widget",
        source_url: window.location.href,
      } as any);

      if (error) throw error;

      setSuccess(true);
      toast.success("We'll call you shortly!");
    } catch (err) {
      console.error("Callback request failed:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setSuccess(false);
      setName("");
      setPhone("");
      setCallbackType("instant");
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {success ? "You're all set! 🎉" : "We'll call you right back"}
          </DialogTitle>
          <DialogDescription>
            {success
              ? "One of our team members will be calling you shortly."
              : "Enter your number and we'll connect you with a specialist in under 30 seconds."}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Expect a call from <span className="font-semibold text-foreground">1.800.825.2587</span>
            </p>
            <Button onClick={handleClose} variant="outline" className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Callback type toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => setCallbackType("instant")}
                className={`flex-1 py-2.5 px-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  callbackType === "instant"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                Call me now
              </button>
              <button
                type="button"
                onClick={() => setCallbackType("scheduled")}
                className={`flex-1 py-2.5 px-3 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  callbackType === "scheduled"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Schedule
              </button>
            </div>

            <Input
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
            <Input
              placeholder="Your phone number *"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={30}
              pattern="^[0-9+\-\s\(\)\.]+$"
            />

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={submitting || !phone.trim()}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {callbackType === "instant" ? "Call Me Now" : "Schedule Callback"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              We'll call you from 1.800.825.2587 • No spam, ever.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
