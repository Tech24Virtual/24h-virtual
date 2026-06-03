import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  MapPin, Linkedin, Instagram, Twitter, Facebook, ArrowRight, Mail, Phone, ChevronUp, ChevronDown,
  Bot, Headphones, Briefcase, Users, MessageSquare, Wand2, Building2, Play, PhoneCall, Handshake
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import logoBlue from "@/assets/logos/logo-blue.png";
import logoWhite from "@/assets/logos/logo-white.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClutchReviewsBadge } from "@/components/home/ClutchReviewsBadge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { WebCallbackWidget } from "@/components/callback/WebCallbackWidget";
import { useGatedServices } from "@/hooks/useLaunchFlags";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

// Solutions for icon grid
const footerSolutions = [
  { name: "AI Receptionist", href: "/solutions/ai-receptionist", icon: Bot, gatedFlag: "ai-receptionist" as const },
  { name: "Message Assistant", href: "/solutions/message-assistant", icon: MessageSquare },
   { name: "Virtual Receptionist", href: "/solutions/virtual-receptionist", icon: Headphones },
   { name: "Virtual Secretary", href: "/solutions/virtual-secretary", icon: Briefcase },
   { name: "Virtual Assistants", href: "/solutions/virtual-assistants", icon: Users },
   { name: "Hybrid Receptionist", href: "/solutions/hybrid-receptionist", icon: Wand2, gatedFlag: "hybrid-receptionist" as const },
];

// Company section
const companyLinks = [
  { name: "About Us", href: "/about" },
  { name: "Join Us", href: "/join-us" },
  { name: "How It Works", href: "/how-it-works" },
  { name: "Pricing", href: "/pricing" },
  { name: "Blog", href: "/blog" },
  { name: "FAQs", href: "/faqs" },
];

// Partner section
const partnerLinks = [
  { name: "Partner Programs", href: "/partners" },
  { name: "Partner LaunchPad", href: "/partners/launchpad" },
  { name: "White Label", href: "/partners/white-label" },
  { name: "Affiliate", href: "/partners/affiliate" },
  { name: "Referral", href: "/partners/referral" },
];

// Quick links
const quickLinks = [
  { name: "Industries", href: "/industries" },
  { name: "Locations", href: "/locations" },
   { name: "Guides", href: "/guides" },
  { name: "Demo", href: "/demo" },
  { name: "Call Advisor", href: "/call-advisor" },
];

const socialLinks = [
  { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com/company/24hvirtual" },
  { name: "Instagram", icon: Instagram, href: "https://instagram.com/24hvirtual" },
  { name: "Twitter", icon: Twitter, href: "https://twitter.com/24hvirtual" },
  { name: "Facebook", icon: Facebook, href: "https://facebook.com/24hvirtual" },
];

const footerStats = [
  { value: "1M+", label: "Calls Handled" },
  { value: "1K+", label: "Happy Clients" },
  { value: "99.9%", label: "Uptime" },
  { value: "24/7", label: "Support" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

// Mobile accordion section component
function MobileSection({ title, icon: Icon, children, defaultOpen = false }: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="lg:hidden border-b border-border/30">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-heading">{title}</span>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4 px-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const [callbackOpen, setCallbackOpen] = useState(false);
  const statsRef = useRef(null);
  const isInView = useInView(statsRef, { once: true });
  const { isGated } = useGatedServices();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
    <footer className="relative overflow-hidden">
      {/* Wave SVG Divider */}
      <div className="wave-divider-footer" />

      {/* Newsletter Section */}
      <div className="bg-gradient-to-r from-primary/5 via-accent/50 to-secondary/5 py-10 relative backdrop-blur-sm">
        <div className="container-custom">
          <motion.div 
            className="glass-card rounded-2xl p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 max-w-5xl mx-auto border border-white/20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                <Mail className="w-5 h-5 text-secondary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">Newsletter</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-heading mb-1">Stay Updated</h3>
              <p className="text-muted-foreground text-sm">Get tips on improving your customer experience</p>
            </div>
            <form className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto" onSubmit={(e) => e.preventDefault()}>
              <div className="relative flex-1 lg:w-72">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-full border-border/50 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button type="submit" variant="cta" className="h-12 px-4 sm:px-6 rounded-full whitespace-nowrap shadow-lg w-full sm:w-auto">
                Subscribe
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Main Footer Content - Desktop */}
      <div className="bg-muted/40 py-12 lg:py-16 relative">
        {/* Decorative shapes */}
        <div className="absolute top-20 right-10 w-48 h-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-10 w-56 h-56 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-accent/20 blur-3xl opacity-50" />

        <div className="container-custom relative">
          {/* Desktop Layout */}
          <motion.div 
            className="hidden lg:grid grid-cols-5 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Column 1: Featured Actions */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <Link to="/" className="inline-block group">
                  <motion.img 
                    src={logoBlue} 
                    alt="24H Virtual" 
                    className="h-10 w-auto transition-transform duration-300 group-hover:scale-105" 
                    whileHover={{ scale: 1.05 }}
                  />
                </Link>
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                Professional virtual receptionist solutions for businesses of all sizes.
              </p>

              {/* Featured Cards */}
              <Link 
                to="/demo" 
                className="group block glass-card p-4 rounded-xl transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 border border-secondary/20"
              >
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center text-white shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Play className="w-5 h-5" />
                  </motion.div>
                  <div className="flex-1">
                    <span className="font-semibold text-heading text-sm">View Demo</span>
                    <Badge variant="cta" className="ml-2 text-[10px] px-1.5 py-0">LIVE</Badge>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
              
              <Link 
                to="/call-advisor" 
                className="group block glass-card p-4 rounded-xl transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-md"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <PhoneCall className="w-5 h-5" />
                  </motion.div>
                  <div className="flex-1">
                    <span className="font-semibold text-heading text-sm">Call Advisor</span>
                    <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-green-500/20">FREE</Badge>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>

              {/* Social Icons */}
              <div className="flex items-center gap-2 pt-4">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/25"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.name}
                  >
                    <social.icon className="w-4 h-4" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Column 2: Solutions Grid */}
            <motion.div variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-2 mb-5 pb-3 border-b border-border/50 group cursor-default"
                whileHover={{ x: 3 }}
              >
                <motion.div 
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transition-all duration-300 group-hover:from-primary group-hover:to-primary/80"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Bot className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                </motion.div>
                <h4 className="font-semibold text-heading group-hover:text-primary transition-colors">Solutions</h4>
              </motion.div>
              
              <ul className="space-y-1">
                {footerSolutions.map((solution, index) => {
                  const SolutionIcon = solution.icon;
                  const gated = "gatedFlag" in solution && solution.gatedFlag ? isGated(solution.gatedFlag) : false;
                  return (
                    <motion.li 
                      key={solution.name}
                      variants={itemVariants}
                      custom={index}
                    >
                      <Link
                        to={solution.href}
                        className="group flex items-center gap-3 p-2 rounded-xl transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent hover:translate-x-1"
                      >
                        <motion.div 
                          className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:shadow-md"
                          whileHover={{ scale: 1.15, rotate: 5 }}
                        >
                          <SolutionIcon className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                        </motion.div>
                        <span className="text-sm text-muted-foreground group-hover:text-primary font-medium transition-colors flex items-center gap-1.5">
                          {solution.name}
                          {gated && <ComingSoonBadge />}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ml-auto" />
                      </Link>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>

            {/* Column 3: Company */}
            <motion.div variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-2 mb-5 pb-3 border-b border-border/50 group cursor-default"
                whileHover={{ x: 3 }}
              >
                <motion.div 
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transition-all duration-300 group-hover:from-primary group-hover:to-primary/80"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Building2 className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                </motion.div>
                <h4 className="font-semibold text-heading group-hover:text-primary transition-colors">Company</h4>
              </motion.div>
              
              <ul className="space-y-1">
                {companyLinks.map((link, index) => (
                  <motion.li 
                    key={link.name}
                    variants={itemVariants}
                    custom={index}
                    whileHover={{ x: 4 }}
                  >
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent/50 transition-all"
                    >
                      {link.name}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                    </Link>
                  </motion.li>
                ))}
              </ul>

              {/* Partners Sub-section */}
              <div className="mt-6 pt-4 border-t border-border/30">
                <div className="flex items-center gap-2 mb-3">
                  <Handshake className="w-4 h-4 text-secondary" />
                  <h5 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Partners</h5>
                </div>
                <ul className="space-y-1">
                  {partnerLinks.map((link) => (
                    <motion.li key={link.name} whileHover={{ x: 4 }}>
                      <Link
                        to={link.href}
                        className="group flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:text-secondary hover:bg-secondary/5 transition-all"
                      >
                        {link.name}
                        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Column 4: Quick Links */}
            <motion.div variants={itemVariants}>
              <motion.div 
                className="flex items-center gap-2 mb-5 pb-3 border-b border-border/50 group cursor-default"
                whileHover={{ x: 3 }}
              >
                <motion.div 
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transition-all duration-300 group-hover:from-primary group-hover:to-primary/80"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <ArrowRight className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                </motion.div>
                <h4 className="font-semibold text-heading group-hover:text-primary transition-colors">Quick Links</h4>
              </motion.div>
              
              <ul className="space-y-1">
                {quickLinks.map((link, index) => (
                  <motion.li 
                    key={link.name}
                    variants={itemVariants}
                    custom={index}
                    whileHover={{ x: 4 }}
                  >
                    <Link
                      to={link.href}
                      className="group flex items-center gap-2 p-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-accent/50 transition-all"
                    >
                      {link.name}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                    </Link>
                  </motion.li>
                ))}
              </ul>

              {/* Trust Badge */}
              <div className="mt-6 pt-4">
                <ClutchReviewsBadge className="!shadow-none !border-border/20" size="sm" />
              </div>
            </motion.div>

            {/* Column 5: Connect */}
            <motion.div variants={itemVariants} className="space-y-4">
              <motion.div 
                className="flex items-center gap-2 mb-5 pb-3 border-b border-border/50 group cursor-default"
                whileHover={{ x: 3 }}
              >
                <motion.div 
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center transition-all duration-300 group-hover:from-primary group-hover:to-primary/80"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <MapPin className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                </motion.div>
                <h4 className="font-semibold text-heading group-hover:text-primary transition-colors">Connect</h4>
              </motion.div>
              
              {/* Office Cards */}
              <motion.div 
                className="glass-card p-3 rounded-xl hover:shadow-soft cursor-pointer border border-border/30"
                whileHover={{ scale: 1.02, x: 4 }}
              >
                <p className="font-semibold text-heading text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Chicago
                </p>
                <p className="text-xs text-muted-foreground">119 S Western Ave Suite 219</p>
              </motion.div>
              
              <motion.div 
                className="glass-card p-3 rounded-xl hover:shadow-soft cursor-pointer border border-border/30"
                whileHover={{ scale: 1.02, x: 4 }}
              >
                <p className="font-semibold text-heading text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Toronto
                </p>
                <p className="text-xs text-muted-foreground">18 King St E Suite 1400</p>
              </motion.div>
              
              {/* Quick Action Buttons */}
              <div className="flex gap-2 pt-2">
                <motion.button 
                  onClick={() => setCallbackOpen(true)}
                  className="flex-1 glass-card p-3 rounded-xl flex items-center justify-center gap-2 text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-xs font-medium">Call Back</span>
                </motion.button>
                
                <motion.a 
                  href="mailto:hello@24hvirtual.com"
                  className="flex-1 glass-card p-3 rounded-xl flex items-center justify-center gap-2 text-secondary hover:bg-secondary hover:text-white transition-all border border-secondary/20"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-medium">Email</span>
                </motion.a>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Toll Free: <span className="text-primary font-medium">1.800.825.2587</span>
              </p>
            </motion.div>
          </motion.div>

          {/* Mobile Layout - Accordions */}
          <div className="lg:hidden space-y-0">
            {/* Logo and CTA cards for mobile */}
            <div className="pb-6 mb-4 border-b border-border/30">
              <Link to="/" className="inline-block mb-4">
                <img src={logoBlue} alt="24H Virtual" className="h-10 w-auto" />
              </Link>
              <p className="text-muted-foreground text-sm mb-4">
                Professional virtual receptionist solutions for businesses of all sizes.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  to="/demo" 
                  className="glass-card p-3 rounded-xl border border-secondary/20 flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-secondary" />
                  </div>
                  <span className="text-sm font-medium">Demo</span>
                </Link>
                <Link 
                  to="/call-advisor" 
                  className="glass-card p-3 rounded-xl border border-primary/20 flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Advisor</span>
                </Link>
              </div>
            </div>

            <MobileSection title="Solutions" icon={Bot}>
              <ul className="space-y-2 pl-11">
                {footerSolutions.map((solution) => {
                  const gated = "gatedFlag" in solution && solution.gatedFlag ? isGated(solution.gatedFlag) : false;
                  return (
                    <li key={solution.name}>
                      <Link to={solution.href} className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
                        {solution.name}
                        {gated && <ComingSoonBadge />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </MobileSection>

            <MobileSection title="Company" icon={Building2}>
              <ul className="space-y-2 pl-11">
                {companyLinks.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </MobileSection>

            <MobileSection title="Partners" icon={Handshake}>
              <ul className="space-y-2 pl-11">
                {partnerLinks.map((link) => (
                  <li key={link.name}>
                    <Link to={link.href} className="text-sm text-muted-foreground hover:text-secondary transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </MobileSection>

            <MobileSection title="Connect" icon={MapPin} defaultOpen>
              <div className="space-y-3 pl-11">
                <div>
                  <p className="text-sm font-medium text-heading">Chicago</p>
                  <p className="text-xs text-muted-foreground">119 S Western Ave Suite 219</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-heading">Toronto</p>
                  <p className="text-xs text-muted-foreground">18 King St E Suite 1400</p>
                </div>
                <button onClick={() => setCallbackOpen(true)} className="text-sm text-primary font-medium hover:underline">
                  Request a Callback
                </button>
              </div>
            </MobileSection>

            {/* Social Links - Mobile */}
            <div className="flex items-center justify-center gap-3 pt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary"
                  aria-label={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 py-8" ref={statsRef}>
        <div className="container-custom">
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {footerStats.map((stat, index) => (
              <motion.div 
                key={stat.label}
                className="glass-card px-5 py-3 md:px-6 md:py-4 rounded-2xl text-center min-w-[120px] md:min-w-[140px] border border-white/20"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <p className="text-xl md:text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-primary text-primary-foreground py-5">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Left - Copyright */}
            <p className="text-sm text-primary-foreground/80">
              © {new Date().getFullYear()} 24H Virtual. All Rights Reserved.
            </p>
            
            {/* Center - UNSOX Branding */}
            <motion.a
              href="https://unsox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary-foreground/90 hover:text-primary-foreground transition-colors group"
              whileHover={{ scale: 1.02 }}
            >
              <span>An</span>
              <span className="font-semibold">UNSOX Digital</span>
              <span>Solution</span>
              <motion.span
                className="text-orange-400 text-lg ml-1"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                whileHover={{ 
                  scale: [1, 1.4, 1.2, 1.5, 1],
                  rotate: [0, -10, 10, -10, 0],
                  transition: { duration: 0.5, ease: "easeOut" }
                }}
              >
                🧡
              </motion.span>
            </motion.a>
            
            {/* Right - Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <Link
                to="/trust"
                className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                Trust
              </Link>
              <Link
                to="/security"
                className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                Security
              </Link>
              <Link
                to="/privacy"
                className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                Terms
              </Link>
              <Link
                to="/legal/dpa"
                className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                DPA
              </Link>
              <Link
                to="/responsible-disclosure"
                className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                Disclosure
              </Link>
              <motion.button
                onClick={scrollToTop}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Back to top"
              >
                <ChevronUp className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </footer>
    <WebCallbackWidget open={callbackOpen} onOpenChange={setCallbackOpen} />
    </>
  );
}
