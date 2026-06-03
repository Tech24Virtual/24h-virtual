import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  ChevronRight, 
  Shield, 
  Clock, 
  GraduationCap,
  Stethoscope,
  Scale,
  Home,
  Building2,
  Wallet,
  Monitor,
  Sparkles,
  Building2 as BuildingFallback,
  AlertTriangle,
  Wrench,
  Heart,
  CalendarDays,
  PawPrint,
  Truck,
  HandHeart,
  Briefcase,
  HeartPulse,
  Users,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { industries } from "@/data/industries";

// Industry icons mapping
const industryIcons: Record<string, React.ElementType> = {
  "medical-practices": Stethoscope,
  "legal-services": Scale,
  "home-services": Home,
  "real-estate": Building2,
  "financial-services": Wallet,
  "it-tech-support": Monitor,
  "beauty-wellness": Sparkles,
  "emergency-services": AlertTriangle,
  "educational-services": GraduationCap,
  "maintenance-repair": Wrench,
  "counseling-therapy": Heart,
  "event-planning": CalendarDays,
  "veterinary": PawPrint,
  "transportation-logistics": Truck,
  "nonprofits": HandHeart,
};

// Industry benefits for cards
const industryBenefits: Record<string, string> = {
  "medical-practices": "Reduce no-shows by 35%",
  "legal-services": "Capture 40% more leads",
  "home-services": "Book 50% more jobs",
  "real-estate": "Never miss a buyer lead",
  "financial-services": "Secure client intake 24/7",
  "it-tech-support": "Faster ticket resolution",
  "beauty-wellness": "Fill appointment gaps",
  "emergency-services": "Instant dispatch support",
  "educational-services": "Parent inquiries handled",
  "maintenance-repair": "After-hours dispatch",
  "counseling-therapy": "Confidential scheduling",
  "event-planning": "Capture every inquiry",
  "veterinary": "Emergency call routing",
  "transportation-logistics": "24/7 dispatch support",
  "nonprofits": "Donor & volunteer support",
};

// Category definitions
const industryCategories = {
  healthcare: {
    title: "Healthcare",
    icon: HeartPulse,
    color: "from-red-500/20 to-rose-500/10",
    industries: ["medical-practices", "counseling-therapy", "veterinary"],
  },
  professional: {
    title: "Professional Services",
    icon: Briefcase,
    color: "from-blue-500/20 to-indigo-500/10",
    industries: ["legal-services", "financial-services", "real-estate"],
  },
  homeBusiness: {
    title: "Home & Business",
    icon: Home,
    color: "from-amber-500/20 to-orange-500/10",
    industries: ["home-services", "maintenance-repair", "it-tech-support", "beauty-wellness"],
  },
  specialized: {
    title: "Specialized Services",
    icon: Users,
    color: "from-purple-500/20 to-violet-500/10",
    industries: ["emergency-services", "educational-services", "event-planning", "transportation-logistics", "nonprofits"],
  },
};

// Why choose us benefits
const benefits = [
  {
    icon: GraduationCap,
    title: "Industry-Trained",
    description: "Receptionists trained in your field's terminology and protocols",
  },
  {
    icon: Shield,
    title: "Compliance Ready",
    description: "HIPAA, legal intake, and industry-specific compliance standards",
  },
  {
    icon: Clock,
    title: "24/7 Coverage",
    description: "Never miss an important call, day or night, weekends included",
  },
];

function IndustryCard({ slug }: { slug: string }) {
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) return null;

  const Icon = industryIcons[slug] || BuildingFallback;
  const benefit = industryBenefits[slug] || "Professional call handling";

  return (
    <Link to={`/industries/${slug}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="group"
      >
        <Card className="h-full overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-elevated transition-all duration-300">
          {/* Gradient header */}
          <div className="h-1 bg-gradient-to-r from-primary to-secondary" />
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-heading mb-1 group-hover:text-primary transition-colors">
                  {industry.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {industry.description}
                </p>
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {benefit}
                </div>
              </div>
            </div>
            {/* Hover reveal */}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-sm text-primary font-medium flex items-center gap-1">
                Learn more
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}

function CategorySection({ 
  categoryKey, 
  category, 
  index 
}: { 
  categoryKey: string;
  category: typeof industryCategories.healthcare;
  index: number;
}) {
  const Icon = category.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="mb-12"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-heading">{category.title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {category.industries.map((slug, cardIndex) => (
          <motion.div
            key={slug}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: cardIndex * 0.05 }}
          >
            <IndustryCard slug={slug} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function IndustriesIndex() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIndustries = useMemo(() => {
    if (!searchQuery) return null;
    const query = searchQuery.toLowerCase();
    return industries.filter(
      (industry) =>
        industry.name.toLowerCase().includes(query) ||
        industry.shortName.toLowerCase().includes(query) ||
        industry.keywords.some((k) => k.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const showCategories = !searchQuery;

  return (
    <>
      <SEO
        title="Industries We Serve | 24H Virtual Receptionist"
        description="Expert virtual receptionist services for 15+ industries including medical, legal, real estate, home services, and more. Industry-trained receptionists available 24/7."
        canonical="/industries"
      />
      <Navigation />

      {/* Hero Section */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Briefcase className="w-4 h-4" />
              <span>15 Industries We Serve</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-heading mb-6">
              Expert Call Handling{" "}
              <span className="text-secondary">For Your Industry</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Our receptionists are trained in your industry's terminology, compliance 
              requirements, and best practices. Find the perfect fit for your business.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search industries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base rounded-full border-border/50 bg-white shadow-lg focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-16 bg-background">
        <div className="container-custom">
          {showCategories ? (
            // Show categorized view
            Object.entries(industryCategories).map(([key, category], index) => (
              <CategorySection
                key={key}
                categoryKey={key}
                category={category}
                index={index}
              />
            ))
          ) : (
            // Show filtered results
            <div>
              <p className="text-sm text-muted-foreground mb-6">
                {filteredIndustries?.length || 0} results for "{searchQuery}"
              </p>
              {filteredIndustries && filteredIndustries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredIndustries.map((industry, index) => (
                    <motion.div
                      key={industry.slug}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <IndustryCard slug={industry.slug} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">
                  No industries match your search. Try a different term.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-accent/30">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-heading mb-4">
              Why Choose{" "}
              <span className="text-secondary">Industry-Specific</span>{" "}
              Receptionists
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Generic answering services don't understand your business. Our 
              industry-trained receptionists know your terminology, compliance 
              requirements, and how to convert callers into customers.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="text-center h-full">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-heading mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container-custom text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Don't See Your Industry?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              We serve businesses of all types. Our receptionists can be trained 
              on your specific needs, scripts, and protocols. Let's talk about how 
              we can help your business.
            </p>
            <Button asChild size="lg" variant="cta" className="rounded-full">
              <Link to="/get-started">
                Book Your FREE Consultation
                <ChevronRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
