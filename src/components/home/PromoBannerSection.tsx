import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function PromoBannerSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/95 to-primary/90" />
      
      {/* Decorative shapes */}
      <motion.div 
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-3xl"
        animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 blur-2xl"
        animate={{ scale: [1, 1.1, 1], y: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      
      <div className="container-custom relative py-16">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <motion.div 
            className="text-center lg:text-left"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-white/80" />
              <span className="text-sm font-medium text-white/80">Speak With Us Today</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Ready to Get Started?
            </h3>
            <p className="text-primary-foreground/80 max-w-md">
              Let us handle your calls professionally while you focus on growing your business.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Button 
              size="lg" 
              variant="cta" 
              className="rounded-full px-8 h-14 text-base font-semibold" 
              asChild
            >
              <Link to="/get-started">
                Book FREE Consultation
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <span className="text-sm text-white/60">or call 1.800.825.2587</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
