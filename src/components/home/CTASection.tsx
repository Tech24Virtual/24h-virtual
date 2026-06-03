import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ServiceFinderWidget } from "@/components/home/ServiceFinderWidget";

export function CTASection() {
  return (
    <section className="section-spacing bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 gradient-mesh opacity-50" />
      
      {/* Floating decorative orbs */}
      <motion.div 
        className="absolute top-10 left-[10%] w-40 h-40 rounded-full bg-primary/5 blur-3xl"
        animate={{ 
          y: [0, -20, 0],
          x: [0, 15, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-10 right-[15%] w-32 h-32 rounded-full bg-secondary/10 blur-2xl"
        animate={{ 
          y: [0, 15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="container-custom relative">
        {/* Main CTA */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-6">Ready to stop missing calls?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join 1000+ businesses who've increased bookings and captured leads they used to miss.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="cta" className="text-base px-8 h-14 rounded-full group relative overflow-hidden" asChild>
              <Link to="/get-started">
                <span className="relative z-10 flex items-center">
                  Book FREE Consultation
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="btn-ghost-blue text-base px-8 h-14 rounded-full" asChild>
              <Link to="/demo">
                <Calendar className="mr-2 w-5 h-5" />
                Watch Demo
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Service Finder Widget */}
        <motion.div
          className="max-w-xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ServiceFinderWidget />
        </motion.div>
      </div>
    </section>
  );
}
