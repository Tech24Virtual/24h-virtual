import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWizardPersonalization } from "@/hooks/useWizardPersonalization";
import { track } from "@/lib/analytics";

const SERVICE_LABEL: Record<string, string> = {
  "ai-receptionist": "AI Receptionist",
  "message-assistant": "Message Assistant",
  "virtual-receptionist": "Virtual Receptionist",
  "virtual-secretary": "Virtual Secretary",
  "virtual-assistants": "Virtual Assistant",
};

interface NextAction {
  label: string;
  href: string;
}

/**
 * Build the recommended next action based on which step the user just
 * completed and what service/industry they chose. Each completed step unlocks
 * a more specific dashboard CTA.
 */
function buildNextAction(opts: {
  isComplete: boolean;
  completedSteps: number[];
  service: string | null;
  resumeHref: string;
}): NextAction {
  const { isComplete, completedSteps, service, resumeHref } = opts;
  if (!isComplete) {
    return { label: "Resume Setup", href: resumeHref };
  }
  // Wizard fully complete → service-aware first action
  switch (service) {
    case "virtual-assistants":
      return { label: "Brief Your Assistant", href: "/client-dashboard/support" };
    case "ai-receptionist":
    case "message-assistant":
    case "virtual-receptionist":
    case "virtual-secretary":
      return { label: "Build Your Call Flow", href: "/call-flow-builder" };
    default:
      return { label: "Open Settings", href: "/client-dashboard/settings" };
  }
}

function buildHighlights(opts: {
  completedSteps: number[];
  service: string | null;
  industry: string | null;
  planMinutes: number | null;
}): string[] {
  const tips: string[] = [];
  const has = (n: number) => opts.completedSteps.includes(n);
  if (has(1) && opts.industry) {
    tips.push(`Industry presets ready for ${opts.industry.replace(/-/g, " ")}.`);
  }
  if (has(2) && opts.service) {
    tips.push(`${SERVICE_LABEL[opts.service] ?? "Your service"} is selected.`);
  }
  if (has(3) && opts.planMinutes) {
    tips.push(`Plan: ${opts.planMinutes.toLocaleString()} minutes / month.`);
  }
  if (has(5)) {
    tips.push("Customization preferences saved.");
  }
  return tips.slice(0, 3);
}

/**
 * Step-aware, service-aware welcome card driven by the CRM wizard_sessions row.
 * Hidden when the user never started the wizard. Replaces the generic welcome
 * the moment a user finishes any step.
 */
export function WizardPersonalizedHero() {
  const p = useWizardPersonalization();

  if (p.loading) return null;

  // Variant 1: account was activated by an admin via Convert Lead dialog —
  // user never ran the wizard. Show "your account is live" CTA.
  if (!p.hasSession && p.convertedViaAdmin) {
    return (
      <Card className="mb-6 overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <Badge variant="secondary" className="font-medium">
                  Account Activated
                </Badge>
              </div>
              <h2 className="font-poppins text-xl font-semibold text-heading mb-1">
                Your account is live
              </h2>
              <p className="text-sm text-muted-foreground mb-2">
                Review your default campaign and complete your business profile so your account
                team can finish onboarding.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <Button asChild>
                <Link
                  to="/client-dashboard/settings"
                  onClick={() =>
                    track.cta('wizard_personalized_hero', 'complete_setup_post_convert', 'client')
                  }
                >
                  Complete Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link
                  to="/client-dashboard/calls/campaigns"
                  onClick={() => track.cta('wizard_personalized_hero', 'view_campaigns_post_convert', 'client')}
                >
                  View Campaigns
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!p.hasSession) return null;

  const serviceLabel = p.service ? SERVICE_LABEL[p.service] ?? p.service : null;
  const next = buildNextAction({
    isComplete: p.isComplete,
    completedSteps: p.completedSteps,
    service: p.service,
    resumeHref: p.resumeHref,
  });
  const highlights = buildHighlights({
    completedSteps: p.completedSteps,
    service: p.service,
    industry: p.industry,
    planMinutes: p.planMinutes,
  });

  const completedCount = p.completedSteps.length;
  const percent = Math.round((completedCount / p.totalSteps) * 100);

  return (
    <Card className="mb-6 overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <Badge variant="secondary" className="font-medium">
                {p.isComplete ? "Setup Complete" : `Step ${Math.min(p.currentStep, p.totalSteps)} of ${p.totalSteps}`}
              </Badge>
              {serviceLabel && (
                <Badge variant="outline" className="font-medium">
                  {serviceLabel}
                </Badge>
              )}
            </div>

            <h2 className="font-poppins text-xl font-semibold text-heading mb-1">
              {p.isComplete
                ? `Your ${serviceLabel ?? "service"} is ready to configure`
                : `Let's finish setting up your ${serviceLabel ?? "service"}`}
            </h2>

            <div className="flex items-center gap-3 mb-3">
              <Progress value={percent} className="h-1.5 flex-1 max-w-sm" />
              <span className="text-xs font-semibold text-primary whitespace-nowrap">
                {percent}%
              </span>
            </div>

            {highlights.length > 0 && (
              <ul className="space-y-1 mb-2">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-cta flex-shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {!p.isComplete && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Picks up exactly where you left off
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <Button asChild>
              <Link
                to={next.href}
                onClick={() =>
                  track.cta('wizard_personalized_hero', next.label.toLowerCase().replace(/\s+/g, '_'), 'client', {
                    is_complete: p.isComplete,
                    service: p.service,
                    industry: p.industry,
                    completed_steps: p.completedSteps.length,
                  })
                }
              >
                {next.label}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            {p.isComplete && (
              <Button asChild variant="ghost" size="sm">
                <Link
                  to="/client-dashboard/settings"
                  onClick={() => track.cta('wizard_personalized_hero', 'edit_setup', 'client')}
                >
                  Edit Setup
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WizardPersonalizedHero;
