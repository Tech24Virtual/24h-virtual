import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useClientOnboardingProgress } from "@/hooks/useClientOnboardingProgress";
import { track } from "@/lib/analytics";

const DISMISS_KEY = "onboardingResumeNudge:dismissedUntil";
const IDLE_MS = 30_000; // show after 30s of dwell on a non-setup dashboard page
const SUPPRESS_DAYS = 7;

/** Routes where we never show the nudge (user is already doing onboarding work). */
const SUPPRESSED_PATHS = [
  "/client-dashboard/settings",
  "/call-flow-builder",
  "/get-started",
];

function isSuppressedPath(path: string): boolean {
  return SUPPRESSED_PATHS.some((p) => path.startsWith(p));
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const until = Number.parseInt(raw, 10);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function dismissForDays(days: number) {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  } catch {
    /* ignore */
  }
}

/**
 * Dashboard-native abandonment recovery for client onboarding.
 *
 * Renders a non-modal slide-in card at the bottom-right of the viewport when:
 *   - the signed-in user has an incomplete leads.onboarding_checklist
 *   - the current route is NOT a setup-related route (suppressed list)
 *   - the user has stayed on this dashboard page for IDLE_MS without dismissing
 *   - they have not dismissed within the last SUPPRESS_DAYS days
 *
 * Honors Core memory rule: NOT an ExitIntentPopup. No mouseleave trigger,
 * no modal overlay, no public-style popup. Inline, dismissible, dashboard-only.
 */
export function OnboardingResumeNudge() {
  const location = useLocation();
  const progress = useClientOnboardingProgress();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    if (progress.loading || progress.isComplete || !progress.nextStep) return;
    if (isSuppressedPath(location.pathname)) return;
    if (isDismissed()) return;

    const t = window.setTimeout(() => {
      setVisible(true);
      track.cta('onboarding_resume_nudge', 'shown', 'client', {
        completed_steps: progress.completedSteps,
        next_step: progress.nextStep?.key,
      });
    }, IDLE_MS);
    return () => window.clearTimeout(t);
  }, [progress.loading, progress.isComplete, progress.nextStep, location.pathname]);

  if (progress.loading || progress.isComplete || !progress.nextStep) return null;
  if (isSuppressedPath(location.pathname)) return null;

  const handleDismiss = () => {
    track.cta('onboarding_resume_nudge', 'dismissed', 'client');
    dismissForDays(SUPPRESS_DAYS);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && progress.nextStep && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          role="region"
          aria-label="Resume onboarding"
          className="fixed bottom-6 right-6 z-40 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl p-5"
        >
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss for a week"
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pick Up Where You Left Off
            </p>
          </div>

          <h3 className="font-poppins font-semibold text-foreground text-base leading-snug mb-2">
            {progress.nextStep.label}
          </h3>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>
                {progress.completedSteps} of {progress.totalSteps} steps done
              </span>
              <span className="font-semibold text-primary">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} className="h-1.5" />
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild size="sm" className="w-full">
              <Link
                to={progress.nextStep.href}
                onClick={() => {
                  track.cta('onboarding_resume_nudge', 'resume_setup', 'client', { next_step: progress.nextStep?.key });
                  setVisible(false);
                }}
              >
                Resume Setup
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="w-full text-xs">
              <a
                href="mailto:onboarding@24hvirtual.com?subject=Onboarding%20help"
                onClick={() => track.cta('onboarding_resume_nudge', 'talk_to_onboarding', 'client')}
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Talk To Onboarding
              </a>
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OnboardingResumeNudge;
