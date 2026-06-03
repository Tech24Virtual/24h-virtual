import { Link } from "react-router-dom";
import { ArrowRight, Check, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { virtualAssistantsPricing } from "@/lib/pricingData";

const features = [
  "No Set-up Fee",
  "Statutory Holiday Coverage",
  "Dedicated assistant who knows your business",
  "Flexible hours - scale up or down as needed",
];

export function VirtualAssistantsSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-16"
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-bold text-heading">Virtual Assistants</h3>
        </div>
        <p className="text-muted-foreground">
          Dedicated support for complex business needs. Hire based on your specific requirements.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {virtualAssistantsPricing.map((plan, index) => (
          <motion.div
            key={plan.type}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className={`h-full ${plan.type === "nearshore" ? "border-2 border-secondary shadow-card-hover" : "shadow-card"}`}>
              {plan.type === "nearshore" && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground">
                  Best Value
                </Badge>
              )}
              <CardHeader className="text-center pb-4">
                <h4 className="text-xl font-semibold text-heading">{plan.label}</h4>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-muted-foreground">Full Time (40 hrs/wk)</span>
                    <span className="font-semibold text-heading">
                      Starting at ${plan.fullTime.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-muted-foreground">Hourly</span>
                    <span className="font-semibold text-heading">${plan.hourly}/hr</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={plan.type === "nearshore" ? "cta" : "outline"}
                  asChild
                >
                  <Link to={`/get-started?service=virtual-assistants&type=${plan.type}`}>
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-6">
        <h4 className="font-semibold text-heading mb-4">Included with All Plans</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground">{feature}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          * If client needs specific skills it may take some time to hire. We hire based on what the client needs. Price might increase based on agent skill requirements.
        </p>
      </div>
    </motion.div>
  );
}
