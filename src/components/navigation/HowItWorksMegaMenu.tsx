import { Link } from "react-router-dom";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { MegaColumn } from "./mega/MegaColumn";
import { LeadMagnetCard } from "./mega/LeadMagnetCard";
import { TrustStrip } from "./mega/TrustStrip";
import {
  GitBranch,
  Headphones,
  Briefcase,
  Star,
  Calendar,
  FileText,
  Wand2,
  Rocket,
  PhoneCall,
  CalendarDays,
  Award,
  MessageSquare,
  Bot,
  BookOpen,
  Stethoscope,
  Monitor,
  Calculator,
  Play,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface ProcessStep {
  step: number;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

interface FeatureItem {
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const PROCESS: ProcessStep[] = [
  { step: 1, name: "Book FREE Consultation", description: "Tell us your goals", icon: Calendar, href: "/get-started" },
  { step: 2, name: "Build Your Blueprint", description: "Custom scripts and call flows", icon: FileText, href: "/how-it-works#blueprint" },
  { step: 3, name: "Encode & Test", description: "We train AI plus agents on your business", icon: Wand2, href: "/how-it-works#encode" },
  { step: 4, name: "Go Live in Days", description: "Launch and start capturing calls", icon: Rocket, href: "/how-it-works#golive" },
];

const HANDLE: FeatureItem[] = [
  { name: "Inbound Call Answering", description: "24/7 live coverage", icon: PhoneCall, href: "/solutions/ai-receptionist" },
  { name: "Appointment Booking", description: "Calendar integrated", icon: CalendarDays, href: "/capabilities/appointment-booking" },
  { name: "Lead Qualification", description: "Score and route instantly", icon: Award, href: "/capabilities/lead-qualification" },
  { name: "Message Taking & Routing", description: "Delivered how you want", icon: MessageSquare, href: "/solutions/message-assistant" },
  { name: "After Hours Coverage", description: "AI handles overflow", icon: Bot, href: "/capabilities/after-hours" },
];

const BUILT: FeatureItem[] = [
  { name: "Trilingual Support", description: "EN, ES and FR coverage", icon: BookOpen, href: "/capabilities/trilingual-support" },
  { name: "Industry Trained Agents", description: "Vertical specific scripts", icon: Stethoscope, href: "/industries" },
  { name: "CRM & Calendar Integrations", description: "Plug into your stack", icon: GitBranch, href: "/capabilities/integrations" },
  { name: "Real Time Reporting", description: "Live dashboards and alerts", icon: Monitor, href: "/capabilities/reporting" },
  { name: "Pay Only for Handle Time", description: "No charge for ringing", icon: Calculator, href: "/pricing#handle-time" },
];

function FeatureList({ items }: { items: FeatureItem[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.name}>
            <NavigationMenuLink asChild>
              <Link
                to={item.href}
                className="group flex items-start gap-3 rounded-lg p-2.5 transition-all duration-300 hover:bg-accent/50"
              >
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-heading group-hover:text-primary transition-colors">{item.name}</div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{item.description}</p>
                </div>
              </Link>
            </NavigationMenuLink>
          </li>
        );
      })}
    </ul>
  );
}

export function HowItWorksMegaMenu() {
  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* Column 1 — The Process */}
        <div className="col-span-3">
          <MegaColumn title="The Process" icon={GitBranch}>
            <ol className="space-y-2">
              {PROCESS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.step}>
                    <NavigationMenuLink asChild>
                      <Link
                        to={item.href}
                        className="group flex items-start gap-3 rounded-lg p-2.5 transition-all duration-300 hover:bg-accent/50"
                      >
                        <div className="relative w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="w-4 h-4" />
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-soft">
                            {item.step}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-heading group-hover:text-primary transition-colors">{item.name}</div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{item.description}</p>
                        </div>
                      </Link>
                    </NavigationMenuLink>
                  </li>
                );
              })}
            </ol>
          </MegaColumn>
        </div>

        {/* Column 2 — What We Handle */}
        <div className="col-span-3">
          <MegaColumn title="What We Handle" icon={Headphones}>
            <FeatureList items={HANDLE} />
          </MegaColumn>
        </div>

        {/* Column 3 — Built For You */}
        <div className="col-span-3">
          <MegaColumn title="Built For You" icon={Briefcase}>
            <FeatureList items={BUILT} />
          </MegaColumn>
        </div>

        {/* Column 4 — Featured / CTAs */}
        <div className="col-span-3">
          <MegaColumn title="See It In Action" icon={Star}>
            <LeadMagnetCard
              icon={Play}
              title="Live Call Simulator"
              valueProp="Hear our AI plus human team handle a real call before you commit."
              ctaLabel="Try the Demo"
              href="/demo"
              variant="primary"
            />

            <NavigationMenuLink asChild>
              <Link
                to="/call-advisor"
                className="mt-3 group flex items-start gap-3 rounded-lg border border-border/60 bg-background p-3 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-soft"
              >
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-heading group-hover:text-primary transition-colors">
                    Free Call Audit
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Get a personalized handling review
                  </p>
                </div>
              </Link>
            </NavigationMenuLink>

            <Link
              to="/how-it-works"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Read the full walkthrough
              <ArrowRight className="w-3 h-3" />
            </Link>
          </MegaColumn>
        </div>
      </div>

      <TrustStrip
        chips={["Launch in Days", "No Setup Fees", "Cancel Anytime"]}
        secondaryCtaLabel="Book FREE Consultation"
        secondaryCtaHref="/get-started"
      />
    </div>
  );
}
