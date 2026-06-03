import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InlineCalculatorPreview } from "@/components/InlineCalculatorPreview";

const features = [
  "24/7 live call coverage",
  "Trilingual receptionists",
  "Custom call scripts",
  "Dedicated onboarding",
  "No long-term contracts",
];

export function PricingPreviewSection() {
  return (
    <section className="section-spacing bg-background">
      <div className="container-custom">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="mb-4">Affordable Plans That Deliver Measurable Results</h2>
          <p className="text-lg text-muted-foreground">
            Most clients save 40-70% compared to in-house staff while capturing more leads.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left - Pricing Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="h-full border-2 border-primary/20">
              <CardContent className="p-5 sm:p-8">
                <div className="mb-6">
                  <p className="text-sm font-medium text-primary mb-2">Starting from</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-heading">$49</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>

                <p className="text-lg text-foreground mb-6">
                  Most clients pay between <span className="font-semibold text-heading">$199 and $699</span> per month, 
                  depending on service type and call volume.
                </p>

                <ul className="space-y-3 mb-8">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button variant="outline" className="btn-ghost-blue w-full" size="lg" asChild>
                  <Link to="/pricing">
                    View Detailed Pricing
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right - ROI Calculator Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <InlineCalculatorPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
