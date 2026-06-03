import { Link } from "react-router-dom";
import { ArrowRight, Stethoscope, Scale, Wrench, Home, DollarSign, Monitor } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const industries = [
  {
    name: "Medical Practices",
    slug: "medical-practices",
    icon: Stethoscope,
    benefit: "Reduce no-shows by 35% with appointment reminders",
    description: "HIPAA-compliant call handling for healthcare providers",
    color: "from-primary/20 to-primary/5",
  },
  {
    name: "Legal Services",
    slug: "legal-services",
    icon: Scale,
    benefit: "Capture 40% more client intakes after hours",
    description: "Professional intake and urgent call routing",
    color: "from-secondary/20 to-secondary/5",
  },
  {
    name: "Home Services",
    slug: "home-services",
    icon: Wrench,
    benefit: "Book emergency jobs 24/7, never miss a dispatch",
    description: "Scheduling, dispatching, and customer support",
    color: "from-brand-rose/40 to-brand-rose/10",
  },
  {
    name: "Real Estate",
    slug: "real-estate",
    icon: Home,
    benefit: "Convert more leads with instant response",
    description: "Property inquiries, showings, and lead qualification",
    color: "from-primary/15 to-secondary/10",
  },
  {
    name: "Financial Services",
    slug: "financial-services",
    icon: DollarSign,
    benefit: "Build trust with secure, compliant service",
    description: "Appointment setting and client communications",
    color: "from-secondary/15 to-primary/10",
  },
  {
    name: "IT & Tech Support",
    slug: "it-tech-support",
    icon: Monitor,
    benefit: "Tier-1 support ticketing and escalation",
    description: "24/7 help desk support and ticket management",
    color: "from-primary/20 to-brand-rose/20",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  },
};

export function IndustriesSection() {
  return (
    <section className="section-spacing bg-accent/30 relative overflow-hidden">
      {/* Decorative elements */}
      <motion.div 
        className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      
      <div className="container-custom relative">
        {/* Section Header */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="mb-2">Built for your industry</h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Tailored scripts and workflows for 15+ industries. Your callers get the 
              expert experience they expect.
            </p>
          </div>
          <Button variant="outline" className="rounded-full self-start md:self-auto" asChild>
            <Link to="/industries">
              View all industries
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </motion.div>

        {/* Industry Cards Grid */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {industries.map((industry) => (
            <motion.div key={industry.slug} variants={itemVariants}>
              <Link to={`/industries/${industry.slug}`}>
                <Card className="group h-full overflow-hidden border-0 shadow-soft hover:shadow-elevated transition-all duration-300 hover:-translate-y-2">
                  {/* Gradient header */}
                  <div className={`h-3 bg-gradient-to-r ${industry.color}`} />
                  
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4">
                      {/* Icon */}
                      <motion.div 
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${industry.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                        whileHover={{ rotate: 5 }}
                      >
                        <industry.icon className="w-7 h-7 text-primary" />
                      </motion.div>
                      
                      {/* Content */}
                      <div>
                        <h3 className="text-lg font-semibold text-heading mb-1 group-hover:text-primary transition-colors">
                          {industry.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {industry.description}
                        </p>
                        <p className="text-sm font-medium text-primary">
                          {industry.benefit}
                        </p>
                      </div>
                      
                      {/* Learn more link */}
                      <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors mt-auto pt-2">
                        Learn more
                        <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
