import { Link } from "react-router-dom";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { solutions } from "./navigationData";
import { MegaColumn } from "./mega/MegaColumn";
import { OutcomeCard } from "./mega/OutcomeCard";
import { LeadMagnetCard } from "./mega/LeadMagnetCard";
import { MiniCaseStudyCard } from "./mega/MiniCaseStudyCard";
import { TrustStrip } from "./mega/TrustStrip";
import {
  LayoutGrid,
  Target,
  Sparkles,
  FileSearch,
  Calculator,
  GitBranch,
  PhoneOff,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGatedServices } from "@/hooks/useLaunchFlags";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

const OUTCOMES = [
  {
    icon: PhoneOff,
    title: "Never Miss a Call",
    description: "24/7 answering across every shift, holiday, and overflow moment.",
    priceAnchor: "AI Receptionist · From $49/mo",
    href: "/pricing?service=ai-receptionist",
  },
  {
    icon: TrendingUp,
    title: "Convert More Leads",
    description: "Qualify, route, and book inbound prospects in real time.",
    priceAnchor: "Hybrid Receptionist · Recommended",
    href: "/pricing?service=hybrid-receptionist",
  },
  {
    icon: DollarSign,
    title: "Cut Front Desk Costs",
    description: "Replace expensive in-house staff with trained virtual pros.",
    priceAnchor: "Virtual Receptionist · From $49/mo",
    href: "/pricing?service=virtual-receptionist",
  },
  {
    icon: Clock,
    title: "Stay Open 24/7",
    description: "Bilingual coverage that never sleeps, no matter the timezone.",
    priceAnchor: "Plans across all services",
    href: "/pricing",
  },
];

export function SolutionsMegaMenu() {
  const { isGated } = useGatedServices();

  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* Col 1 — Browse Solutions */}
        <div className="col-span-3">
          <MegaColumn title="Browse Solutions" icon={LayoutGrid}>
            <ul className="space-y-1">
              {solutions.map((solution) => {
                const Icon = solution.icon;
                const gated = solution.gatedFlag ? isGated(solution.gatedFlag) : false;
                return (
                  <li key={solution.name}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={solution.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl p-2.5 transition-all duration-300 hover:bg-accent/50 hover:translate-x-1",
                          solution.featured && "bg-gradient-to-r from-primary/5 to-transparent"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-all",
                            solution.featured
                              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                              : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-heading group-hover:text-primary transition-colors">
                              {solution.name}
                            </span>
                            {gated && <ComingSoonBadge />}
                            {solution.featured && !gated && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                                ★
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug truncate">
                            {solution.description}
                          </p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                );
              })}
            </ul>
          </MegaColumn>
        </div>

        {/* Col 2 — Featured Outcomes */}
        <div className="col-span-4">
          <MegaColumn title="Pick Your Outcome" icon={Target}>
            <div className="grid grid-cols-1 gap-2.5">
              {OUTCOMES.map((outcome) => {
                const slug = outcome.href.includes("ai-receptionist")
                  ? "ai-receptionist"
                  : outcome.href.includes("hybrid-receptionist")
                  ? "hybrid-receptionist"
                  : null;
                const gated = slug ? isGated(slug) : false;
                return <OutcomeCard key={outcome.title} {...outcome} comingSoon={gated} />;
              })}
            </div>
          </MegaColumn>
        </div>

        {/* Col 3 — Lead Magnets */}
        <div className="col-span-3">
          <MegaColumn title="Free Tools" icon={Sparkles}>
            <div className="space-y-3">
              <LeadMagnetCard
                icon={Calculator}
                title="ROI Calculator"
                valueProp="See your savings vs in-house staff in 60 seconds."
                ctaLabel="Calculate Now"
                href="/cost-calculator"
                variant="primary"
              />
              <LeadMagnetCard
                icon={GitBranch}
                badge="NEW"
                title="Call-Flow Builder"
                valueProp="Design your ideal call routing in minutes."
                ctaLabel="Try Builder"
                href="/call-flow-builder"
                variant="secondary"
              />
            </div>
          </MegaColumn>
        </div>

        {/* Col 4 — Case Study */}
        <div className="col-span-2">
          <MegaColumn title="Customer Story" icon={FileSearch}>
            <MiniCaseStudyCard
              industry="Legal Services"
              problem="Missing 30+ after-hours intake calls per month."
              outcome="Captured every inquiry with 24/7 bilingual coverage."
              href="/case-studies"
              ctaLabel="See How"
            />
            <Link
              to="/case-studies"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              All Stories
              <ArrowRight className="w-3 h-3" />
            </Link>
          </MegaColumn>
        </div>
      </div>

      <TrustStrip
        chips={["24/7 Coverage", "Bilingual Support", "5 Min Setup", "No Contracts"]}
        secondaryCtaLabel="Compare Plans"
        secondaryCtaHref="/pricing"
      />
    </div>
  );
}
