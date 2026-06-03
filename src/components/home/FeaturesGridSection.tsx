import { Link } from "react-router-dom";
import { 
  Phone, 
  Globe, 
  Calendar, 
  MessageSquare, 
  Shield, 
  Zap,
  Clock,
  Headphones,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const features = [
  { 
    icon: Zap, 
    title: "Launch in Days, Not Months", 
    description: "Connect your tools, define your flows, and go live. Onboarding measured in days." 
  },
  { 
    icon: MessageSquare, 
    title: "Encoded Scripts and Rules", 
    description: "Your greeting, FAQs, and routing live in the platform. Every agent follows them." 
  },
  { 
    icon: Headphones, 
    title: "Trilingual Live Receptionists", 
    description: "English 24/7, Spanish and French in business hours. Real humans on every call." 
  },
  { 
    icon: Clock, 
    title: "Per-Second Handle-Time Billing", 
    description: "We do not bill ringing or queue time. The clock starts when we pick up." 
  },
  { 
    icon: Phone, 
    title: "Real Client Portal", 
    description: "Live call logs, scripts, schedules, billing, and outbound requests in one place." 
  },
  { 
    icon: Globe, 
    title: "Campaign-Ready Architecture", 
    description: "Spin up new brands, locations, or seasonal lines from reusable flows and routing." 
  },
  { 
    icon: Shield, 
    title: "Stack-Friendly Integration", 
    description: "We work with your CRM, FSM, and phone system. Agents never need logins to your tools." 
  },
  { 
    icon: Calendar, 
    title: "No Contracts", 
    description: "Month to month flexibility. Cancel anytime, no lock-ins." 
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  },
};

export function FeaturesGridSection() {
  return (
    <section className="section-spacing bg-background relative overflow-hidden">
      {/* Decorative shapes */}
      <motion.div 
        className="absolute top-20 right-10 w-32 h-32 rounded-full bg-secondary/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-20 left-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      
      <div className="container-custom relative">
        <motion.div 
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-4">Why businesses choose 24H Virtual</h2>
          <p className="text-lg text-muted-foreground">
            Fast to launch, easy to manage, and obsessively accurate call handling
          </p>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group p-4 sm:p-6 rounded-2xl bg-accent/30 hover:bg-accent/60 border border-transparent hover:border-border/30 transition-all duration-300 hover:shadow-soft hover:-translate-y-1"
            >
              <div className="flex flex-col gap-4">
                <motion.div 
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center group-hover:from-primary/25 group-hover:to-secondary/15 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <feature.icon className="w-6 h-6 text-primary" />
                </motion.div>
                <div>
                  <h4 className="font-semibold text-heading mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Button variant="outline" size="lg" className="rounded-full" asChild>
            <Link to="/solutions">
              See All Features
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
