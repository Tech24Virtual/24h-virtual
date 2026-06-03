import { useMemo } from "react";
import { Link } from "react-router-dom";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { industries, industryCategories, type IndustryItem } from "./navigationData";
import { MegaColumn } from "./mega/MegaColumn";
import { LeadMagnetCard } from "./mega/LeadMagnetCard";
import { MiniCaseStudyCard } from "./mega/MiniCaseStudyCard";
import { TrustStrip } from "./mega/TrustStrip";
import { Building2, Calculator, FileSearch, ArrowRight, Compass } from "lucide-react";

export function IndustriesMegaMenu() {
  const groupedIndustries = useMemo(() => {
    return industries.reduce((acc, industry) => {
      acc[industry.category] = [...(acc[industry.category] || []), industry];
      return acc;
    }, {} as Record<string, IndustryItem[]>);
  }, []);

  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* Cols 1-2 — Industries by Category */}
        <div className="col-span-7">
          <MegaColumn title="Browse by Industry" icon={Building2}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
              {Object.entries(industryCategories).map(([key, category]) => {
                const CategoryIcon = category.icon;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryIcon className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-heading/70">
                        {category.title}
                      </span>
                    </div>
                    <ul className="space-y-0.5">
                      {groupedIndustries[key]?.map((industry) => {
                        const IndustryIcon = industry.icon;
                        return (
                          <li key={industry.name}>
                            <NavigationMenuLink asChild>
                              <Link
                                to={industry.href}
                                className="group flex items-center gap-2.5 rounded-lg p-2 transition-all duration-300 hover:bg-accent/50 hover:translate-x-1"
                              >
                                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                                  <IndustryIcon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm text-heading/85 group-hover:text-primary font-medium transition-colors">
                                  {industry.name}
                                </span>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </MegaColumn>
        </div>

        {/* Col 3 — Lead Magnet */}
        <div className="col-span-3">
          <MegaColumn title="Industry Tools" icon={Calculator}>
            <div className="space-y-3">
              <LeadMagnetCard
                icon={Calculator}
                title="Industry ROI Snapshot"
                valueProp="See exactly what your industry can save with 24H coverage."
                ctaLabel="Get My Snapshot"
                href="/cost-calculator"
                variant="primary"
              />
              <Link
                to="/industries"
                className="group flex items-center justify-between rounded-xl border border-border/60 bg-background p-3 transition-all hover:border-primary/40 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-heading group-hover:text-primary transition-colors">
                      All 15 Industries
                    </div>
                    <p className="text-[11px] text-muted-foreground">Explore every vertical</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </MegaColumn>
        </div>

        {/* Col 4 — Case Study */}
        <div className="col-span-2">
          <MegaColumn title="Industry Story" icon={FileSearch}>
            <MiniCaseStudyCard
              industry="Medical"
              problem="Front desk overwhelmed during peak intake hours."
              outcome="Bilingual virtual team handles intake and scheduling."
              href="/case-studies"
              ctaLabel="Read Story"
            />
          </MegaColumn>
        </div>
      </div>

      <TrustStrip
        chips={["15 Industries Served", "Custom Scripts", "HIPAA Aware", "Bilingual"]}
        secondaryCtaLabel="Don't See Your Industry?"
        secondaryCtaHref="/call-advisor"
      />
    </div>
  );
}
