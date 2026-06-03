/**
 * Phase 30 — Client-safe success guidance card.
 *
 * Reads `v_direct_self_success` (filtered by auth.uid() to the calling
 * client's own lead). Renders only safe, cooperative-tone hints. Never
 * exposes internal state labels, economics, or admin signals.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck, Wrench, Headphones, PartyPopper } from "lucide-react";
import {
  fetchDirectSelfSuccess,
  type DirectSelfSuccess,
} from "@/lib/governance/directSuccess";

interface Hint {
  key: string;
  icon: typeof Sparkles;
  title: string;
  detail: string;
  tone: "info" | "ok" | "action";
  cta?: { label: string; to: string };
}

function buildHints(s: DirectSelfSuccess): Hint[] {
  const out: Hint[] = [];
  if (s.hint_new_account) {
    out.push({
      key: "new",
      icon: PartyPopper,
      title: "Welcome aboard",
      detail: "You're in your first 30 days. Walk through your activation steps to get the most value early.",
      tone: "info",
      cta: { label: "Open dashboard", to: "/client-dashboard" },
    });
  }
  if (s.hint_setup_incomplete) {
    out.push({
      key: "setup",
      icon: Wrench,
      title: "Finish your receptionist setup",
      detail: "Your receptionist isn't fully live yet. We can help you finish the last steps so calls get answered.",
      tone: "action",
      cta: { label: "Review scripts", to: "/client-dashboard/scripts" },
    });
  }
  if (s.hint_support_attention) {
    out.push({
      key: "support",
      icon: Headphones,
      title: "Open conversations with our team",
      detail: "You have a few open support items. Check in to keep things moving.",
      tone: "action",
      cta: { label: "Open support", to: "/client-dashboard/support" },
    });
  }
  if (s.hint_expansion_ready) {
    out.push({
      key: "grow",
      icon: Sparkles,
      title: "Ready to expand?",
      detail: "Your account is healthy and showing growth signals. Explore plan options when you're ready.",
      tone: "ok",
      cta: { label: "View billing", to: "/client-dashboard/billing" },
    });
  }
  if (s.hint_healthy && out.length === 0) {
    out.push({
      key: "ok",
      icon: ShieldCheck,
      title: "Everything looks good",
      detail: "Your account is healthy. We'll surface helpful next steps here as they come up.",
      tone: "ok",
    });
  }
  return out;
}

export function ClientSuccessGuidanceCard() {
  const [self, setSelf] = useState<DirectSelfSuccess | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchDirectSelfSuccess()
      .then((s) => { if (!cancelled) setSelf(s); })
      .catch(() => { if (!cancelled) setSelf(null); });
    return () => { cancelled = true; };
  }, []);

  if (self === undefined) return null;
  if (!self) return null;

  const hints = buildHints(self);
  if (hints.length === 0) return null;

  const actionCount = hints.filter((h) => h.tone === "action").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Helpful Next Steps</CardTitle>
          {actionCount > 0 && <Badge variant="secondary">{actionCount} suggested</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {hints.map((h) => {
            const Icon = h.icon;
            const tint =
              h.tone === "action" ? "text-cta" : h.tone === "ok" ? "text-green-600" : "text-primary";
            return (
              <li key={h.key} className="flex items-start gap-3 text-sm">
                <Icon className={`h-4 w-4 mt-0.5 ${tint}`} />
                <div className="flex-1">
                  <div className="font-medium">{h.title}</div>
                  <div className="text-xs text-muted-foreground">{h.detail}</div>
                </div>
                {h.cta && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={h.cta.to}>
                      {h.cta.label} <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
