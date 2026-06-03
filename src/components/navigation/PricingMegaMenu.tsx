import { Link } from "react-router-dom";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { MegaColumn } from "./mega/MegaColumn";
import { OutcomeCard } from "./mega/OutcomeCard";
import { LeadMagnetCard } from "./mega/LeadMagnetCard";
import { MiniCaseStudyCard } from "./mega/MiniCaseStudyCard";
import { TrustStrip } from "./mega/TrustStrip";
import {
  PhoneOff,
  TrendingUp,
  DollarSign,
  Megaphone,
  Tag,
  Bot,
  Headphones,
  Sparkles,
  Briefcase,
  MessageSquare,
  Users,
  Calculator,
  Target,
  ArrowRight,
  Award,
} from "lucide-react";

const OUTCOMES = [
  {
    icon: PhoneOff,
    title: "Never Miss a Call",
    description: "Convert missed calls into booked revenue, 24/7.",
    priceAnchor: "AI Receptionist · From $49/mo",
    href: "/pricing?service=ai-receptionist",
  },
  {
    icon: TrendingUp,
    title: "Capture Every Lead",
    description: "Live qualification and instant CRM handoff.",
    priceAnchor: "Hybrid Receptionist · Most Popular",
    href: "/pricing?service=hybrid-receptionist",
  },
  {
    icon: DollarSign,
    title: "Replace Your Front Desk",
    description: "Save 40 to 70% vs in-house reception staff.",
    priceAnchor: "Virtual Receptionist · From $49/mo",
    href: "/pricing?service=virtual-receptionist",
  },
  {
    icon: Megaphone,
    title: "Scale Outbound Campaigns",
    description: "Trained agents to run lead-gen and follow-up.",
    priceAnchor: "Campaign Add-On · Custom",
    href: "/pricing?service=campaigns",
  },
];

const SERVICES = [
  { name: "AI Receptionist", icon: Bot, anchor: "From $49/mo", href: "/pricing?service=ai-receptionist" },
  { name: "Virtual Receptionist", icon: Headphones, anchor: "From $49/mo", href: "/pricing?service=virtual-receptionist" },
  { name: "Hybrid Receptionist", icon: Sparkles, anchor: "Best Value", href: "/pricing?service=hybrid-receptionist" },
  { name: "Virtual Secretary", icon: Briefcase, anchor: "Tiered Plans", href: "/pricing?service=virtual-secretary" },
  { name: "Message Assistant", icon: MessageSquare, anchor: "From $49/mo", href: "/pricing?service=message-assistant" },
  { name: "Virtual Assistants", icon: Users, anchor: "Custom Quote", href: "/pricing?service=virtual-assistants" },
];

export function PricingMegaMenu() {
  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* Col 1 — Outcomes */}
        <div className="col-span-5">
          <MegaColumn title="Pick Your Outcome" icon={Target}>
            <p className="text-xs text-muted-foreground mb-4 -mt-2">
              Pricing built around results, not minute counts.
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {OUTCOMES.map((outcome) => (
                <OutcomeCard key={outcome.title} {...outcome} />
              ))}
            </div>
          </MegaColumn>
        </div>

        {/* Col 2 — Browse by Service */}
        <div className="col-span-3">
          <MegaColumn title="Browse by Service" icon={Tag}>
            <ul className="space-y-1">
              {SERVICES.map((service) => {
                const Icon = service.icon;
                return (
                  <li key={service.name}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={service.href}
                        className="group flex items-center justify-between gap-2 rounded-lg p-2.5 transition-all hover:bg-accent/50 hover:translate-x-1"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-heading group-hover:text-primary transition-colors truncate">
                              {service.name}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{service.anchor}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    </NavigationMenuLink>
                  </li>
                );
              })}
            </ul>
          </MegaColumn>
        </div>

        {/* Col 3 — Lead Magnets */}
        <div className="col-span-2">
          <MegaColumn title="Help Me Choose" icon={Calculator}>
            <div className="space-y-3">
              <LeadMagnetCard
                icon={Calculator}
                title="ROI Calculator"
                valueProp="Calculate your exact savings in 60 seconds."
                ctaLabel="Run It"
                href="/cost-calculator"
                variant="primary"
              />
              <LeadMagnetCard
                icon={Bot}
                badge="AI"
                title="Plan Recommender"
                valueProp="Let our advisor pick the right plan for you."
                ctaLabel="Ask Advisor"
                href="/gpt-advisor"
                variant="secondary"
              />
            </div>
          </MegaColumn>
        </div>

        {/* Col 4 — Proof */}
        <div className="col-span-2">
          <MegaColumn title="Proven Results" icon={Award}>
            <MiniCaseStudyCard
              industry="Real Estate"
              problem="Agents losing weekend showings to slow callbacks."
              outcome="Live booking on every inbound call, day or night."
              href="/case-studies"
              ctaLabel="See Outcome"
            />
          </MegaColumn>
        </div>
      </div>

      <TrustStrip
        chips={["No Long-Term Contracts", "Cancel Anytime", "Bilingual Support", "Month-To-Month"]}
        secondaryCtaLabel="Compare All Plans"
        secondaryCtaHref="/pricing"
      />
    </div>
  );
}
