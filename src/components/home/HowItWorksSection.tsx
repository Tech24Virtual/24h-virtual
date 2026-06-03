import { Link } from "react-router-dom";
import { ArrowRight, FileText, Target, Calendar, MessageSquare, CreditCard, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const steps = [
  { 
    label: "Blueprint", 
    description: "We learn your scripts, rules, tools, and desired outcomes", 
    icon: FileText,
    color: "from-primary/20 to-primary/10"
  },
  { 
    label: "Connect", 
    description: "We plug into your CRM, FSM, and phone system", 
    icon: Target,
    color: "from-secondary/20 to-secondary/10"
  },
  { 
    label: "Encode", 
    description: "Flows, routing, and escalation rules are built into our platform", 
    icon: MessageSquare,
    color: "from-brand-rose/40 to-brand-rose/20"
  },
  { 
    label: "Test", 
    description: "Live test calls to validate every scenario", 
    icon: Calendar,
    color: "from-primary/15 to-secondary/10"
  },
  { 
    label: "Launch", 
    description: "Go live in days, not months", 
    icon: Rocket,
    color: "from-secondary/15 to-primary/10"
  },
  { 
    label: "Refine", 
    description: "Dashboards and QA keep performance high", 
    icon: CreditCard,
    color: "from-primary/20 to-brand-rose/20"
  },
];

export function HowItWorksSection() {
  return (
    <section className="section-spacing bg-background relative overflow-hidden">
      {/* Decorative background */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent/50 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      
      <div className="container-custom relative">
        {/* Section header */}
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-4">Blueprint → Encode → Launch</h2>
          <p className="text-lg text-muted-foreground">
            Your rules are encoded once in our platform, and then every agent and AI follows them 24/7.
          </p>
        </motion.div>

        {/* Horizontal timeline - Desktop */}
        <div className="hidden lg:block relative mb-12">
          {/* Connecting line */}
          <div className="absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />
          
          <div className="grid grid-cols-6 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="relative text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                {/* Step number badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center z-10">
                  {index + 1}
                </div>
                
                {/* Icon container */}
                <motion.div 
                  className={`w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 relative`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <step.icon className="w-10 h-10 text-primary" />
                </motion.div>
                
                <h4 className="font-semibold text-heading text-sm mb-1">{step.label}</h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Vertical list - Mobile/Tablet */}
        <div className="lg:hidden space-y-4 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-4 p-4 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.08 }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <h4 className="font-semibold text-heading">{step.label}</h4>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <Button variant="cta" size="lg" className="rounded-full px-8" asChild>
            <Link to="/get-started">
              Start Your Setup
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            Takes about 5 minutes • No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
}
