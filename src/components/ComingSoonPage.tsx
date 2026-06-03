import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, CheckCircle2, Calendar, Mail, Loader2, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEO } from "@/components/SEO";
import { captureLead } from "@/lib/intake/captureLead";

interface ComingSoonPageProps {
  /** Short eyebrow tag, e.g. "AI RECEPTIONIST" */
  tagline: string;
  /** Main page H1 */
  title: string;
  /** 1-2 sentence value proposition */
  description: string;
  /** Optional Lucide icon to anchor the hero */
  icon?: LucideIcon;
  /** Slug used as canonical hint and interest CTA query param */
  featureSlug: string;
  /** Optional override for the primary CTA */
  primaryCta?: { label: string; href: string };
  /** Optional override for the secondary CTA */
  secondaryCta?: { label: string; href: string };
  /** Estimated launch window, e.g. "Q3 2026" or "Within 4 weeks" */
  eta?: string;
  /** Bullet list of capabilities included at launch */
  whatsComing?: string[];
  /** Show inline lead-capture form (default true) */
  showLeadCapture?: boolean;
}

export const ComingSoonPage = ({
  tagline,
  title,
  description,
  icon: Icon,
  featureSlug,
  primaryCta,
  secondaryCta,
  eta,
  whatsComing,
  showLeadCapture = true,
}: ComingSoonPageProps) => {
  const finalPrimary = primaryCta ?? {
    label: "Book FREE Consultation",
    href: `/get-started?interest=${featureSlug}`,
  };
  const finalSecondary = secondaryCta ?? {
    label: "Explore Live Solutions",
    href: "/solutions",
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please add your name and email.");
      return;
    }
    setSubmitting(true);
    const { error } = await captureLead({
      name: name.trim(),
      email: email.trim(),
      source: "coming_soon",
      notes: `Waitlist signup for ${title}${eta ? ` (ETA ${eta})` : ""}`,
      metadata: { feature_slug: featureSlug },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not save your info. Email us at hello@24hvirtual.com.");
      return;
    }
    setSubmitted(true);
    toast.success("You're on the list. We'll email you the moment it launches.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${title}, Coming Soon`}
        description={description}
        canonical={`/solutions/${featureSlug}`}
        noindex
      />
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-4 py-20 lg:py-28 relative overflow-hidden">
        {/* Soft brand backdrop */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-1/4 left-1/4 -z-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-3xl w-full mx-auto"
        >
          <div className="backdrop-blur-xl bg-card/60 border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="text-center">
              <Badge
                variant="secondary"
                className="mb-6 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase bg-accent/10 text-accent border-accent/20"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {eta ? `Launching ${eta}` : "Launching Soon"}
              </Badge>

              {Icon && (
                <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-10 h-10 text-primary" />
                </div>
              )}

              <p className="text-sm font-semibold tracking-widest text-primary mb-3 uppercase">
                {tagline}
              </p>
              <h1 className="font-poppins text-3xl md:text-5xl font-bold mb-5 capitalize bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
                {title}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                {description}
              </p>
            </div>

            {/* What's coming */}
            {whatsComing && whatsComing.length > 0 && (
              <div className="mb-8 max-w-xl mx-auto bg-background/60 border border-border/40 rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  What's Included At Launch
                </p>
                <ul className="space-y-2">
                  {whatsComing.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lead capture */}
            {showLeadCapture && (
              <div className="mb-8 max-w-xl mx-auto">
                {submitted ? (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
                    <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-foreground">You're on the early access list.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We'll email {email} the moment {title} goes live.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-border/50 bg-background/60 p-5 space-y-3"
                  >
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      Get notified when it launches
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="cs-name" className="sr-only">Your Name</Label>
                        <Input
                          id="cs-name"
                          placeholder="Your Name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cs-email" className="sr-only">Work Email</Label>
                        <Input
                          id="cs-email"
                          type="email"
                          placeholder="Work Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={submitting}
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#E74A3E] hover:bg-[#E74A3E]/90 text-white"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                        </>
                      ) : (
                        "Notify Me At Launch"
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button
                asChild
                size="lg"
                variant="outline"
                className="px-8"
              >
                <Link to={finalPrimary.href}>
                  {finalPrimary.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="px-8">
                <Link to={finalSecondary.href}>{finalSecondary.label}</Link>
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Prefer email? Reach our team at{" "}
              <a
                href="mailto:hello@24hvirtual.com"
                className="text-primary hover:underline font-medium"
              >
                hello@24hvirtual.com
              </a>
            </p>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default ComingSoonPage;
