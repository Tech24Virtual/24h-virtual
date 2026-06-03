import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Plan {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  popular?: boolean;
  ctaText?: string;
  ctaLink?: string;
}

type TitleProp = string | { primary: string; highlight: string };

interface ServicePricingCardsProps {
  title?: TitleProp;
  subtitle?: string;
  plans: Plan[];
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

export function ServicePricingCards({
  title = "Simple, Transparent Pricing",
  subtitle = "Choose the plan that fits your business needs",
  plans,
  serviceSlug,
}: ServicePricingCardsProps) {
  return (
    <section className="section-spacing bg-accent/30">
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="mb-4">{renderTitle(title)}</h2>
          <p className="text-lg text-muted-foreground">{subtitle}</p>
        </div>

        <div className={`grid gap-6 ${plans.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'md:grid-cols-3'}`}>
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className={plan.popular ? "relative" : ""}
            >
              <Card
                className={`h-full ${
                  plan.popular
                    ? "border-2 border-secondary shadow-card-hover scale-105"
                    : "border shadow-card"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <h3 className="text-xl font-semibold text-heading">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-heading">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period || "mo"}</span>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "cta" : "outline"}
                    asChild
                  >
                    <Link to={plan.ctaLink || `/get-started?service=${serviceSlug}&plan=${plan.name.toLowerCase()}`}>
                      {plan.ctaText || "Get Started"}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
