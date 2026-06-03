import { Link } from "react-router-dom";
import {
  Bot,
  Headphones,
  PhoneCall,
  Calendar,
  Scale,
  Stethoscope,
  Home,
  Building2,
  Zap,
  Clock,
  Globe,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { solutions, industries, resources, navLinks } from "./navigationData";
import { FeaturedSolutionCard } from "./mobile/FeaturedSolutionCard";
import { FunnelItem } from "./mobile/FunnelItem";
import { CaseStudyCard } from "./mobile/CaseStudyCard";
import { ProofChipRow } from "./mobile/ProofChipRow";
import { StickyCTAFooter } from "./mobile/StickyCTAFooter";
import { useGatedServices } from "@/hooks/useLaunchFlags";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

interface MobileNavigationProps {
  onClose: () => void;
}

const featuredSolutions = [
  {
    title: "AI Receptionist",
    tagline: "24/7 instant call answering powered by AI.",
    href: "/solutions/ai-receptionist",
    icon: Bot,
    accent: "primary" as const,
    gatedFlag: "ai-receptionist" as const,
  },
  {
    title: "Virtual Receptionist",
    tagline: "Live human receptionists for your business.",
    href: "/solutions/virtual-receptionist",
    icon: Headphones,
    accent: "cta" as const,
  },
  {
    title: "Hybrid Receptionist",
    tagline: "AI speed plus human warmth, combined.",
    href: "/solutions/hybrid-receptionist",
    icon: Sparkles,
    accent: "accent" as const,
    gatedFlag: "hybrid-receptionist" as const,
  },
  {
    title: "Lead Capture",
    tagline: "Never miss a qualified lead again.",
    href: "/solutions/message-assistant",
    icon: PhoneCall,
    accent: "primary" as const,
  },
];

const funnels = [
  {
    title: "Law Firms",
    icon: Scale,
    audience: "For solo and mid-size practices.",
    pain: "Missed intake calls mean lost cases and clients walking to competitors.",
    solution: "Trained receptionists handle intake, qualify cases, and book consults around the clock.",
    ctaLabel: "Explore legal solutions",
    ctaHref: "/industries/legal-services",
  },
  {
    title: "Medical Clinics",
    icon: Stethoscope,
    audience: "For practices, clinics, and group offices.",
    pain: "Staff is buried in calls while patients sit on hold or hang up.",
    solution: "HIPAA-aware call handling, appointment booking, and message routing 24/7.",
    ctaLabel: "Explore medical solutions",
    ctaHref: "/industries/medical-practices",
  },
  {
    title: "Home Services",
    icon: Home,
    audience: "For HVAC, plumbing, electrical, and trades.",
    pain: "Calls come in while you are on a job and revenue walks away.",
    solution: "Dispatch-ready receptionists capture leads and schedule jobs in real time.",
    ctaLabel: "Explore home services",
    ctaHref: "/industries/home-services",
  },
  {
    title: "Small Businesses",
    icon: Building2,
    audience: "For growing teams that cannot hire in house yet.",
    pain: "Hiring a full time receptionist is expensive and slow.",
    solution: "Launch in days with a flexible plan that scales as you grow.",
    ctaLabel: "See how we help",
    ctaHref: "/why-24h-virtual",
  },
];

const caseStudies = [
  {
    industry: "Legal",
    problem: "After-hours intake calls were going to voicemail.",
    result: "Captured every new client inquiry around the clock.",
    href: "/industries/legal-services",
  },
  {
    industry: "Healthcare",
    problem: "Front desk overwhelmed by appointment calls.",
    result: "Freed in-house staff to focus on patient care.",
    href: "/industries/medical-practices",
  },
  {
    industry: "Home Services",
    problem: "Lost jobs to competitors who answered first.",
    result: "Booked more service calls without adding payroll.",
    href: "/industries/home-services",
  },
];

const proofChips = [
  { label: "Launch in days", icon: Zap },
  { label: "24/7 coverage", icon: Clock },
  { label: "Bilingual support", icon: Globe },
  { label: "Real client portal", icon: ShieldCheck },
];

export function MobileNavigation({ onClose }: MobileNavigationProps) {
  const { isGated } = useGatedServices();

  return (
    <div className="flex flex-col h-full bg-background" role="dialog" aria-label="Navigation menu">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* 1. Hero block */}
        <section className="relative px-5 pt-6 pb-5 bg-gradient-to-br from-primary/10 via-background to-accent/20 border-b border-border/60">
          <div className="max-w-full">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              24H Virtual
            </span>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground leading-tight">
              Never Miss a Call.<br />Never Miss a Lead.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Live receptionists and AI working together so your business answers every call, day or night.
            </p>
          </div>
        </section>

        {/* 2. Featured Solution Cards */}
        <section className="px-5 py-6">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Top Solutions
            </h3>
            <Link
              to="/solutions/ai-receptionist"
              onClick={onClose}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featuredSolutions.map((s) => (
              <FeaturedSolutionCard
                key={s.title}
                {...s}
                onClick={onClose}
                comingSoon={s.gatedFlag ? isGated(s.gatedFlag) : false}
              />
            ))}
          </div>
        </section>

        {/* 3. Industry Funnels */}
        <section className="px-5 py-6 bg-muted/30 border-y border-border/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            Built For Your Industry
          </h3>
          <div className="space-y-2">
            {funnels.map((f) => (
              <FunnelItem key={f.title} {...f} onCtaClick={onClose} />
            ))}
          </div>
        </section>

        {/* 4. Mini Case Studies */}
        <section className="py-6">
          <div className="px-5 mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Real Results
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              How teams use 24H Virtual to win more business.
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-5 pb-2 no-scrollbar">
            {caseStudies.map((c) => (
              <CaseStudyCard key={c.industry} {...c} onClick={onClose} />
            ))}
          </div>
        </section>

        {/* 5. Proof strip */}
        <section className="px-5 py-6 border-t border-border/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            Why Teams Trust Us
          </h3>
          <ProofChipRow chips={proofChips} />
        </section>

        {/* 6. Navigation fallback */}
        <section className="px-5 py-6 bg-muted/30 border-t border-border/60 space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            Browse Everything
          </h3>

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-3 rounded-lg hover:bg-card text-sm font-semibold text-foreground transition-colors group">
              All Solutions
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
              <div className="pl-3 pr-1 py-1 space-y-0.5">
                {solutions.map((s) => {
                  const Icon = s.icon;
                  const gated = s.gatedFlag ? isGated(s.gatedFlag) : false;
                  return (
                    <Link
                      key={s.name}
                      to={s.href}
                      onClick={onClose}
                      className="flex items-center gap-2.5 py-2 px-2 rounded-md text-xs text-foreground/80 hover:bg-card hover:text-foreground transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      <span className="flex-1">{s.name}</span>
                      {gated && <ComingSoonBadge />}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-3 rounded-lg hover:bg-card text-sm font-semibold text-foreground transition-colors group">
              All Industries
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
              <div className="pl-3 pr-1 py-1 grid grid-cols-2 gap-0.5">
                {industries.map((i) => (
                  <Link
                    key={i.name}
                    to={i.href}
                    onClick={onClose}
                    className="py-2 px-2 rounded-md text-xs text-foreground/80 hover:bg-card hover:text-foreground transition-colors truncate"
                  >
                    {i.name}
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-3 rounded-lg hover:bg-card text-sm font-semibold text-foreground transition-colors group">
              Resources
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
              <div className="pl-3 pr-1 py-1 space-y-2">
                {resources.map((section) => (
                  <div key={section.title}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mt-2 mb-1">
                      {section.title}
                    </p>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          onClick={onClose}
                          className="flex items-center gap-2.5 py-2 px-2 rounded-md text-xs text-foreground/80 hover:bg-card hover:text-foreground transition-colors"
                        >
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          {item.name}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              onClick={onClose}
              className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-card text-sm font-semibold text-foreground transition-colors"
            >
              {link.name}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}

          <Link
            to="/login"
            onClick={onClose}
            className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-card text-sm font-semibold text-foreground transition-colors"
          >
            Login
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </section>

        {/* Bottom spacer so content isn't hidden behind sticky CTA */}
        <div className="h-4" />
      </div>

      {/* 7. Sticky CTA footer */}
      <StickyCTAFooter onClose={onClose} />
    </div>
  );
}
