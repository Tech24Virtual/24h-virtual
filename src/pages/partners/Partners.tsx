import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Building2, 
  Users, 
  Gift, 
  ArrowRight, 
  CheckCircle, 
  Headphones,
  Bot,
  MessageSquare,
  Briefcase,
  Phone,
  TrendingUp,
  Shield,
  Rocket
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const programs = [
  {
    title: "White Label Partner",
    description: "Resell our services under your own brand. Full white-label solution with custom pricing and branding.",
    icon: Building2,
    href: "/partners/white-label",
    features: ["Your branding", "Set your prices", "Dedicated support", "Full dashboard"],
    color: "primary",
  },
  {
    title: "Affiliate Partner",
    description: "Earn $150 per conversion plus quarterly retention bonuses. Up to $750 per referral in year one.",
    icon: Users,
    href: "/partners/affiliate",
    features: ["$150 conversion bonus", "$50–150 quarterly", "Tier rewards", "No minimum payouts"],
    color: "secondary",
  },
  {
    title: "Referral Partner",
    description: "Earn $150 for every successful referral. Perfect for current clients and one-time recommendations.",
    icon: Gift,
    href: "/partners/referral",
    features: ["$150 per referral", "No commitment", "Easy process", "Quick payouts"],
    color: "cta",
  },
];

const steps = [
  { 
    step: 1, 
    title: "Choose Your Program", 
    description: "Select the partnership model that fits your business goals" 
  },
  { 
    step: 2, 
    title: "Apply & Get Approved", 
    description: "Complete a quick application and get approved within 24-48 hours" 
  },
  { 
    step: 3, 
    title: "Start Earning", 
    description: "Access your dashboard and start generating revenue immediately" 
  },
];

const services = [
  { name: "AI Receptionist", icon: Bot },
  { name: "Virtual Receptionist", icon: Headphones },
  { name: "Virtual Secretary", icon: Briefcase },
  { name: "Message Taking", icon: MessageSquare },
  { name: "24/7 Support", icon: Phone },
];

const faqs = [
  {
    question: "What's the difference between the partner programs?",
    answer: "White Label is for businesses that want to resell our services under their own brand. Affiliate is for those who want to earn recurring commissions through referrals. Referral is a simple one-time bonus for recommending us to others."
  },
  {
    question: "How long does approval take?",
    answer: "Most applications are reviewed within 24-48 hours. You'll receive an email notification once your application has been processed."
  },
  {
    question: "When do I get paid?",
    answer: "Affiliate conversion bonuses are paid monthly on the 15th. Quarterly retention bonuses are paid at the end of each quarter. Referral bonuses are paid after the referred client completes their first month of service. No minimum payout threshold."
  },
  {
    question: "Is there a minimum commitment?",
    answer: "There's no minimum commitment for Affiliate or Referral partners. White Label partners have flexible monthly plans based on their tier."
  },
  {
    question: "Can I be part of multiple programs?",
    answer: "Yes! Many partners combine programs. For example, you could be a White Label partner and still earn referral bonuses for clients you don't white-label."
  },
];

export default function Partners() {
  return (
    <>
      <SEO 
        title="Partner Programs | 24H Virtual"
        description="Join our partner program and unlock multiple revenue streams. Choose from White Label, Affiliate, or Referral partnerships."
      />
      <Navigation />
      
      <main className="min-h-screen pt-20">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 bg-gradient-to-br from-background via-primary/5 to-background overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          </div>
          
          <div className="container-custom relative">
            <motion.div 
              className="text-center max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <TrendingUp className="w-4 h-4" />
                Partner With Us
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold text-heading mb-6 leading-tight">
                Unlock Multiple <span className="text-gradient">Revenue Streams</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Partner with 24H Virtual and grow your business. Whether you want to resell, refer, 
                or recommend, we have a program that fits your goals.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link to="#programs">
                    Explore Programs
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/call-advisor">Talk to an Advisor</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Partner Programs */}
        <section id="programs" className="py-20 bg-background">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Choose Your Partnership Path
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Three flexible programs designed for different business models and goals
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {programs.map((program, index) => (
                <motion.div
                  key={program.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full glass-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-2 group overflow-hidden">
                    <CardContent className="p-8">
                      <motion.div 
                        className={`w-16 h-16 rounded-2xl bg-${program.color}/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                        whileHover={{ rotate: 5 }}
                      >
                        <program.icon className={`w-8 h-8 text-${program.color}`} />
                      </motion.div>
                      
                      <h3 className="text-2xl font-bold text-heading mb-3">{program.title}</h3>
                      <p className="text-muted-foreground mb-6">{program.description}</p>
                      
                      <ul className="space-y-3 mb-8">
                        {program.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <CheckCircle className={`w-4 h-4 text-${program.color}`} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button asChild className="w-full group/btn">
                        <Link to={program.href}>
                          Learn More
                          <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Partner LaunchPad Highlight */}
        <section className="py-16 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <div className="container-custom">
            <motion.div
              className="text-center max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-secondary/10 text-secondary border-secondary/30 mb-4">
                <Rocket className="w-3 h-3 mr-1" />
                New
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Partner <span className="text-gradient">LaunchPad</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Want us to build everything for you? For a one-time $9,997 fee, we'll create your website, buy your domain, 
                configure your dashboard, and set up your pricing. You just bring your brand.
              </p>
              <Button size="lg" variant="cta" asChild>
                <Link to="/partners/launchpad">
                  Learn More About LaunchPad
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-accent/30">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground">
                Getting started is simple
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-12 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
              
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  className="relative text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <motion.div 
                    className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 relative z-10"
                    whileHover={{ scale: 1.1 }}
                  >
                    <span className="text-4xl font-bold text-primary">{step.step}</span>
                  </motion.div>
                  <h3 className="text-xl font-bold text-heading mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Services You Can Offer */}
        <section className="py-20 bg-background">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Range of Services
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Partner with us and offer a complete suite of virtual communication solutions
              </p>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={service.name}
                  className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-accent/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                  >
                    <service.icon className="w-6 h-6 text-primary" />
                  </motion.div>
                  <span className="font-medium text-heading">{service.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container-custom">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="text-5xl font-bold mb-2">100+</div>
                <p className="text-primary-foreground/80">Businesses Served</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <div className="text-5xl font-bold mb-2">99.9%</div>
                <p className="text-primary-foreground/80">Uptime Guarantee</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-5xl font-bold mb-2">$100K+</div>
                <p className="text-primary-foreground/80">Paid to Partners</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-20 bg-background">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Frequently Asked Questions
              </h2>
            </motion.div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={faq.question}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <AccordionItem value={`item-${index}`} className="glass-card rounded-xl px-6">
                      <AccordionTrigger className="text-left text-heading hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Shield className="w-16 h-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Ready to Partner with Us?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join hundreds of successful partners already growing their business with 24H Virtual
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <Link to="/partners/white-label">
                    Apply as White Label Partner
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/partners/affiliate">
                    Become an Affiliate
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
