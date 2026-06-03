import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

type TitleProp = string | { primary: string; highlight: string };

interface ServiceHeroProps {
  title: TitleProp;
  tagline: string;
  description: string;
  icon: LucideIcon;
  heroImage?: string;
  ctaText?: string;
  ctaLink?: string;
  serviceSlug?: string;
}

const renderTitle = (title: TitleProp) => {
  if (typeof title === 'string') {
    return title;
  }
  return (
    <>
      {title.primary} <span className="text-secondary">{title.highlight}</span>
    </>
  );
};

export function ServiceHero({
  title,
  tagline,
  description,
  icon: Icon,
  heroImage,
  ctaText = "Get Started",
  ctaLink = "/get-started",
  serviceSlug,
}: ServiceHeroProps) {
  // Two-column layout when heroImage is provided
  if (heroImage) {
    return (
      <section className="relative gradient-hero overflow-hidden pt-32 pb-20">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            className="absolute top-20 right-[10%] w-72 h-72 bg-brand-rose/30 rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-20 left-[5%] w-96 h-96 bg-primary/5 rounded-full blur-3xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/4 w-24 h-24 bg-secondary/20 rounded-full blur-2xl"
            animate={{ y: [-20, 20, -20] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
        </div>

        <div className="container-custom relative">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column - Content */}
            <motion.div
              className="lg:col-span-7 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-sm font-medium text-primary uppercase tracking-wider">
                {tagline}
              </p>
              <h1 className="text-heading">{renderTitle(title)}</h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
                {description}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" variant="cta" className="text-base px-8 h-14 rounded-full group relative overflow-hidden" asChild>
                  <Link to={ctaLink}>
                    <span className="relative z-10 flex items-center">
                      {ctaText}
                      <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                    <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="btn-ghost-blue text-base px-8 h-14 rounded-full" asChild>
                  <Link to={serviceSlug ? `/pricing?service=${serviceSlug}` : "/pricing"}>View Pricing</Link>
                </Button>
              </div>
            </motion.div>

            {/* Right Column - Hero Image */}
            <motion.div
              className="lg:col-span-5 flex items-center justify-center relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Decorative circles behind image */}
              <motion.div 
                className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-secondary/20 blur-xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div 
                className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-primary/10 blur-xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 5, repeat: Infinity }}
              />
              
              <motion.img
                src={heroImage}
                alt="Professional virtual receptionist"
                className="w-full max-w-md lg:max-w-lg object-contain drop-shadow-2xl relative z-10"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // Original centered layout when no heroImage
  return (
    <section className="relative gradient-hero overflow-hidden pt-32 pb-20">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute top-20 right-[10%] w-72 h-72 bg-brand-rose/30 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-20 left-[5%] w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="container-custom relative">
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center justify-center p-4 rounded-2xl bg-primary/10 mb-4"
            whileHover={{ scale: 1.05 }}
          >
            <Icon className="w-10 h-10 text-primary" />
          </motion.div>
          <p className="text-sm font-medium text-primary uppercase tracking-wider">
            {tagline}
          </p>
          <h1 className="text-heading">{renderTitle(title)}</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" variant="cta" className="text-base px-8 h-14 rounded-full group relative overflow-hidden" asChild>
              <Link to={ctaLink}>
                <span className="relative z-10 flex items-center">
                  {ctaText}
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="btn-ghost-blue text-base px-8 h-14 rounded-full" asChild>
              <Link to={serviceSlug ? `/pricing?service=${serviceSlug}` : "/pricing"}>View Pricing</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
