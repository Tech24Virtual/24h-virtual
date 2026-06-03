import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Search, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cities, getCitiesByCountry, type City } from "@/data/cities";
import { industries, type Industry } from "@/data/industries";
import { cn } from "@/lib/utils";

// Industry icons mapping
import {
  Stethoscope,
  Scale,
  Home,
  Building2,
  Wallet,
  Monitor,
  Sparkles,
  AlertTriangle,
  GraduationCap,
  Wrench,
  Heart,
  CalendarDays,
  PawPrint,
  Truck,
  HandHeart,
} from "lucide-react";

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

function CityCard({ city, isExpanded, onToggle }: { city: City; isExpanded: boolean; onToggle: () => void }) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <motion.button
          className={cn(
            "w-full p-4 rounded-xl border text-left transition-all duration-200",
            isExpanded
              ? "bg-primary/5 border-primary/20 shadow-md"
              : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-heading">{city.name}</h3>
                <p className="text-xs text-muted-foreground">{city.state}</p>
              </div>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-primary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </motion.button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 p-4 bg-accent/30 rounded-xl"
        >
          <p className="text-xs text-muted-foreground mb-3">Select an industry:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {industries.map((industry) => {
              const Icon = industryIcons[industry.slug] || Sparkles;
              return (
                <Link
                  key={industry.slug}
                  to={`/locations/${city.slug}/${industry.slug}`}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background hover:bg-primary/5 border border-border hover:border-primary/20 transition-all text-sm group"
                >
                  <Icon className="w-4 h-4 text-primary/70 group-hover:text-primary" />
                  <span className="text-muted-foreground group-hover:text-heading truncate">
                    {industry.shortName}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function IndustryCard({ industry }: { industry: Industry }) {
  const Icon = industryIcons[industry.slug] || Sparkles;
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <motion.button
          className={cn(
            "w-full p-4 rounded-xl border text-left transition-all duration-200",
            isExpanded
              ? "bg-primary/5 border-primary/20 shadow-md"
              : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-heading">{industry.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{industry.description}</p>
              </div>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-primary flex-shrink-0" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        </motion.button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 p-4 bg-accent/30 rounded-xl"
        >
          <p className="text-xs text-muted-foreground mb-3">Available in {cities.length} cities:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {cities.map((city) => (
              <Link
                key={city.slug}
                to={`/locations/${city.slug}/${industry.slug}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-background hover:bg-primary/5 border border-border hover:border-primary/20 transition-all text-sm group"
              >
                <MapPin className="w-3 h-3 text-primary/70 group-hover:text-primary flex-shrink-0" />
                <span className="text-muted-foreground group-hover:text-heading truncate">
                  {city.name}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function LocationsIndex() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  
  const usCities = getCitiesByCountry("US");
  const caCities = getCitiesByCountry("CA");
  
  const filteredUSCities = useMemo(() => {
    if (!searchQuery) return usCities;
    const query = searchQuery.toLowerCase();
    return usCities.filter(
      city =>
        city.name.toLowerCase().includes(query) ||
        city.state.toLowerCase().includes(query) ||
        city.stateCode.toLowerCase().includes(query)
    );
  }, [searchQuery, usCities]);
  
  const filteredCACities = useMemo(() => {
    if (!searchQuery) return caCities;
    const query = searchQuery.toLowerCase();
    return caCities.filter(
      city =>
        city.name.toLowerCase().includes(query) ||
        city.state.toLowerCase().includes(query) ||
        city.stateCode.toLowerCase().includes(query)
    );
  }, [searchQuery, caCities]);
  
  const filteredIndustries = useMemo(() => {
    if (!searchQuery) return industries;
    const query = searchQuery.toLowerCase();
    return industries.filter(
      industry =>
        industry.name.toLowerCase().includes(query) ||
        industry.shortName.toLowerCase().includes(query) ||
        industry.keywords.some(k => k.toLowerCase().includes(query))
    );
  }, [searchQuery]);
  
  const totalPages = cities.length * industries.length;
  
  return (
    <>
      <SEO
        title="Virtual Receptionist Services by Location | 24H Virtual"
        description="Find professional virtual receptionist and call answering services in your city. We serve 40+ major cities across the United States and Canada with 24/7 coverage."
        canonical="/locations"
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
              <MapPin className="w-4 h-4" />
              <span>Serving {cities.length}+ Cities</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-heading mb-6">
              Virtual Receptionist Services{" "}
              <span className="text-primary">Across North America</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Find local call answering services in your city. We provide 24/7 professional 
              receptionist services tailored to {industries.length} industries in {cities.length} major cities.
            </p>
            
            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search cities or industries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-base rounded-full border-border/50 bg-white shadow-lg focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              {totalPages.toLocaleString()}+ locations
            </p>
            <Link 
              to="/solutions/hybrid-receptionist" 
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline mt-2"
            >
              <Zap className="w-4 h-4" />
              Try our new Hybrid Receptionist
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Cities by Country */}
      <section className="py-16 bg-background">
        <div className="container-custom">
          {/* United States */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-lg">🇺🇸</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-heading">United States</h2>
                <p className="text-sm text-muted-foreground">{filteredUSCities.length} cities</p>
              </div>
            </div>
            
            {filteredUSCities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUSCities.map((city) => (
                  <CityCard
                    key={city.slug}
                    city={city}
                    isExpanded={expandedCity === city.slug}
                    onToggle={() => setExpandedCity(expandedCity === city.slug ? null : city.slug)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No US cities match your search.</p>
            )}
          </motion.div>
          
          {/* Canada */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-lg">🇨🇦</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-heading">Canada</h2>
                <p className="text-sm text-muted-foreground">{filteredCACities.length} cities</p>
              </div>
            </div>
            
            {filteredCACities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCACities.map((city) => (
                  <CityCard
                    key={city.slug}
                    city={city}
                    isExpanded={expandedCity === city.slug}
                    onToggle={() => setExpandedCity(expandedCity === city.slug ? null : city.slug)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No Canadian cities match your search.</p>
            )}
          </motion.div>
        </div>
      </section>
      
      {/* Browse by Industry */}
      <section className="py-16 bg-accent/30">
        <div className="container-custom">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-heading mb-4">Browse by Industry</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We specialize in {industries.length} industries, each with tailored call handling 
              scripts and industry-specific training for our receptionists.
            </p>
          </motion.div>
          
          {filteredIndustries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIndustries.map((industry, index) => (
                <motion.div
                  key={industry.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <IndustryCard industry={industry} />
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No industries match your search.</p>
          )}
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
            <h2 className="text-3xl font-bold mb-4">Can't Find Your City?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              We provide virtual receptionist services nationwide. Even if your city isn't listed, 
              we can still help your business with 24/7 call answering.
            </p>
            <Button asChild size="lg" variant="cta" className="rounded-full">
              <Link to="/get-started">
                Get Started Today
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
