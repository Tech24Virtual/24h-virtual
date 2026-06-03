import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Globe,
  Palette,
  Layers,
  DollarSign,
  Rocket,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const capabilities = [
  {
    icon: Globe,
    title: "Hostname Masking",
    description: "Run portals on portal.yourdomain.com. Clients never see 24H Virtual.",
  },
  {
    icon: Palette,
    title: "Branded Portals",
    description: "Your logo, colors, and emails. Per-tenant branding across every touchpoint.",
  },
  {
    icon: Layers,
    title: "Per-Client Module Visibility",
    description: "Toggle which features each end-client sees. Calls, scripts, billing, support, and more.",
  },
  {
    icon: DollarSign,
    title: "Wholesale Pricing",
    description: "Volume-tiered per-minute rates. Set your own retail margin.",
  },
  {
    icon: Rocket,
    title: "Growth Hub Tools",
    description: "Auto-blog, SEO reports, newsletter, social snippets, and keyword research, all built in.",
  },
  {
    icon: ShieldCheck,
    title: "Masked Ticket Escalation",
    description: "Your team escalates to ours without breaking the white-label boundary.",
  },
];

export function WhiteLabelSpotlightSection() {
  return (
    <section className="section-spacing relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container-custom relative">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <motion.div
            className="lg:col-span-5 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="bg-background">For Agencies & Resellers</Badge>
            <h2>Run a receptionist business under your brand</h2>
            <p className="text-lg text-muted-foreground">
              The full 24H Virtual operations platform, masked behind your domain. Hostname routing, branded client portals, wholesale pricing, and a Growth Hub marketing suite ready to ship under your name.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" variant="cta" className="rounded-full px-8 h-14" asChild>
                <Link to="/get-started">
                  Book FREE Consultation
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8 h-14" asChild>
                <Link to="/partners/white-label">Explore White Label</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="lg:col-span-7 grid sm:grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {capabilities.map((cap) => (
              <div
                key={cap.title}
                className="glass-card p-5 rounded-2xl border-border/40 hover:shadow-elevated transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <cap.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-heading text-sm">{cap.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
