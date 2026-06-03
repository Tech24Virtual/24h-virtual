import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, Sparkles, Calendar, CheckCircle2, ArrowRight, Mail } from "lucide-react";
import { useFeatureLive, type LaunchFlagKey } from "@/hooks/useLaunchFlags";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FeatureGateProps {
  feature: LaunchFlagKey;
  comingSoon: ReactNode;
  children: ReactNode;
}

/**
 * Renders `children` only when the named feature flag is live in the DB.
 * Otherwise renders the provided `comingSoon` element.
 * Shows a minimal loader while the flag is being fetched (first paint).
 */
export const FeatureGate = ({ feature, comingSoon, children }: FeatureGateProps) => {
  const { isLive, loading } = useFeatureLive(feature);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return <>{isLive ? children : comingSoon}</>;
};

export default FeatureGate;

/**
 * Reusable in-app "Coming Soon" panel for dashboard surfaces.
 * Use this inside dashboards (kept inside the existing layout / sidebar)
 * instead of the full-page public ComingSoonPage.
 */
export interface InAppComingSoonProps {
  title: string;
  description: string;
  /** Estimated launch window, e.g. "Phase 4" or "Q3 2026" */
  eta?: string;
  /** Bullet list of capabilities included at launch */
  whatsComing?: string[];
  /** Optional primary action shown to the user right now */
  primaryAction?: { label: string; href: string };
  /** Optional secondary action (defaults to mailto contact) */
  secondaryAction?: { label: string; href: string };
}

export const InAppComingSoon = ({
  title,
  description,
  eta,
  whatsComing,
  primaryAction,
  secondaryAction,
}: InAppComingSoonProps) => {
  const finalSecondary = secondaryAction ?? {
    label: "Email The Team",
    href: "mailto:hello@24hvirtual.com",
  };

  const isExternalSecondary = finalSecondary.href.startsWith("mailto:") || finalSecondary.href.startsWith("http");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Coming {eta ? `In ${eta}` : "Soon"}
              </CardTitle>
              <CardDescription className="mt-2">
                The schema and data layer are already in place. The interactive UI ships {eta ? `in ${eta}` : "in the next phase"}.
              </CardDescription>
            </div>
            {eta && (
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {eta}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {whatsComing && whatsComing.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                What's Included At Launch
              </p>
              <ul className="space-y-1.5">
                {whatsComing.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {primaryAction && (
              <Button asChild size="sm">
                <Link to={primaryAction.href}>
                  {primaryAction.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            )}
            {isExternalSecondary ? (
              <Button asChild size="sm" variant="outline">
                <a href={finalSecondary.href}>
                  <Mail className="w-4 h-4 mr-2" />
                  {finalSecondary.label}
                </a>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link to={finalSecondary.href}>{finalSecondary.label}</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
