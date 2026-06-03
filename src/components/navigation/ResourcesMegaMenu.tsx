import { Link } from "react-router-dom";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { MegaColumn } from "./mega/MegaColumn";
import { LeadMagnetCard } from "./mega/LeadMagnetCard";
import { MiniCaseStudyCard } from "./mega/MiniCaseStudyCard";
import { TrustStrip } from "./mega/TrustStrip";
import {
  BookOpen,
  FileText,
  HelpCircle,
  Award,
  Star,
  Calculator,
  GitBranch,
  Target,
  Bot,
  Wrench,
  FileSearch,
  Mail,
  Phone,
  Play,
  Briefcase,
  Calendar,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface ResourceLink {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const LEARN: ResourceLink[] = [
  { name: "Blog", description: "Industry insights and tips", href: "/blog", icon: FileText },
  { name: "Free Guides", description: "20 expert resources", href: "/guides", icon: BookOpen },
  { name: "Why 24H Virtual", description: "What sets us apart", href: "/why-24h-virtual", icon: Award },
  { name: "FAQs", description: "Common questions answered", href: "/faqs", icon: HelpCircle },
];

const TOOLS: ResourceLink[] = [
  { name: "ROI Calculator", description: "See your potential savings", href: "/cost-calculator", icon: Calculator },
  { name: "Call-Flow Builder", description: "Design your ideal flow", href: "/call-flow-builder", icon: GitBranch },
  { name: "Service Finder", description: "Get matched in 3 steps", href: "/get-started", icon: Target },
  { name: "GPT Advisor", description: "AI-powered plan picks", href: "/gpt-advisor", icon: Bot },
];

const CONNECT: ResourceLink[] = [
  { name: "Book Consultation", description: "Talk to a strategist", href: "/get-started", icon: Calendar },
  { name: "Contact Us", description: "Reach our team", href: "/contact", icon: Mail },
  { name: "Live Demo", description: "See the call simulator", href: "/demo", icon: Play },
  { name: "Join Us", description: "Open positions", href: "/join-us", icon: Briefcase },
];

function ResourceList({ items }: { items: ResourceLink[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <li key={item.name}>
            <NavigationMenuLink asChild>
              <Link
                to={item.href}
                className="group flex items-start gap-3 rounded-lg p-2.5 transition-all duration-300 hover:bg-accent/50 hover:translate-x-1"
              >
                <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-heading group-hover:text-primary transition-colors">
                    {item.name}
                  </div>
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

export function ResourcesMegaMenu() {
  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <MegaColumn title="Learn" icon={BookOpen}>
            <ResourceList items={LEARN} />
          </MegaColumn>
        </div>

        <div className="col-span-3">
          <MegaColumn title="Free Tools" icon={Wrench}>
            <ResourceList items={TOOLS} />
          </MegaColumn>
        </div>

        <div className="col-span-3">
          <MegaColumn title="Featured Resource" icon={Star}>
            <LeadMagnetCard
              icon={Calculator}
              title="The Outcome Calculator"
              valueProp="Quantify the cost of every missed call and see your break-even in under a minute."
              ctaLabel="Run the Numbers"
              href="/cost-calculator"
              variant="primary"
            />
          </MegaColumn>
        </div>

        <div className="col-span-3">
          <MegaColumn title="Customer Story" icon={FileSearch}>
            <MiniCaseStudyCard
              industry="Home Services"
              problem="Lost weekend leads to competitors with after-hours coverage."
              outcome="Hybrid AI plus human team books jobs around the clock."
              href="/case-studies"
              ctaLabel="See the Story"
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

      {/* Connect row */}
      <div className="mt-6 pt-5 border-t border-border/60">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-primary" />
          Get In Touch
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {CONNECT.map((item) => {
            const Icon = item.icon;
            return (
              <NavigationMenuLink asChild key={item.name}>
                <Link
                  to={item.href}
                  className="group flex items-center gap-2.5 rounded-xl border border-border/60 bg-background p-3 transition-all hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-heading group-hover:text-primary transition-colors">
                      {item.name}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                  </div>
                </Link>
              </NavigationMenuLink>
            );
          })}
        </div>
      </div>

      <TrustStrip
        chips={["1000+ Businesses", "99.9% Uptime", "Cancel Anytime"]}
        secondaryCtaLabel="Subscribe to Newsletter"
        secondaryCtaHref="/blog"
      />
    </div>
  );
}
