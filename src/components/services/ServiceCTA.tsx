import { Link } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type TitleProp = string | { primary: string; highlight: string };

interface ServiceCTAProps {
  title?: TitleProp;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  showPhone?: boolean;
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

export function ServiceCTA({
  title = "Ready to Get Started?",
  subtitle = "Join hundreds of businesses who trust 24H Virtual",
  ctaText = "Get Started Now",
  ctaLink = "/get-started",
  showPhone = true,
}: ServiceCTAProps) {
  return (
    <section className="section-spacing bg-primary text-primary-foreground">
      <div className="container-custom">
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold">{renderTitle(title)}</h2>
          <p className="text-lg opacity-90">{subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              variant="cta"
              className="text-base px-8 h-14"
              asChild
            >
              <Link to={ctaLink}>
                {ctaText}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            {showPhone && (
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 h-14 border-white/30 text-white hover:bg-white/10"
                asChild
              >
              <Link to="/contact">
                  <Phone className="mr-2 w-5 h-5" />
                  Book Your FREE Consultation
                </Link>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
