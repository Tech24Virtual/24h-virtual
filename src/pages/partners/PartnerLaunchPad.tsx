import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket,
  CheckCircle,
  ArrowRight,
  Globe,
  Palette,
  DollarSign,
  Settings,
  BookOpen,
  Mail,
  Phone,
  Zap,
  Package,
  Calendar,
  Wrench,
  Users,
  TrendingUp,
  Crown,
  Handshake,
  ShieldCheck,
  BadgeDollarSign,
  Scale,
  Stethoscope,
  Building2,
  Home,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO, createFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const includedFeatures = [
  {
    icon: Globe,
    title: "Custom Branded Website",
    description: "Professionally designed and built website tailored to your brand identity and target market.",
  },
  {
    icon: Package,
    title: "Domain Purchase & Hosting",
    description: "We buy, configure, and host your custom domain, fully managed so you never worry about DNS or servers.",
  },
  {
    icon: Palette,
    title: "Branded Partner Dashboard",
    description: "Fully configured dashboard with your logo, colors, and branding. Your clients never see 24H Virtual.",
  },
  {
    icon: DollarSign,
    title: "Custom Pricing & Packages",
    description: "Your service tiers and pricing structure set up and ready to present to prospective clients.",
  },
  {
    icon: Settings,
    title: "Growth Hub Configuration",
    description: "Marketing tools pre-configured including Auto-Blog, SEO Reports, Social Snippets, and Email Marketing.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base Setup",
    description: "Starter articles and onboarding content seeded for your clients so you're ready to support them from day one.",
  },
  {
    icon: Mail,
    title: "Email Templates & Branding",
    description: "Custom email templates with your branding applied. Client notifications, onboarding sequences, and more.",
  },
  {
    icon: Phone,
    title: "Dedicated Launch Support",
    description: "Onboarding call and launch strategy session included. We walk you through everything before you go live.",
  },
];

const launchpadTemplates = [
  {
    id: "legal",
    name: "LegalConnect",
    niche: "Law Firms & Legal Practices",
    tagline: "Never miss a client call again",
    icon: Scale,
    color: "hsl(220, 70%, 45%)",
    highlights: [
      "Intake screening & new client qualification",
      "After-hours emergency call routing",
      "Appointment scheduling with attorneys",
      "Confidential message handling",
    ],
  },
  {
    id: "medical",
    name: "MedReception",
    niche: "Medical & Dental Offices",
    tagline: "HIPAA-friendly call handling for healthcare",
    icon: Stethoscope,
    color: "hsl(160, 60%, 40%)",
    highlights: [
      "Patient appointment booking & reminders",
      "Prescription refill request routing",
      "After-hours triage call handling",
      "HIPAA-compliant messaging protocols",
    ],
  },
  {
    id: "realestate",
    name: "PropertyLine",
    niche: "Real Estate & Property Management",
    tagline: "Capture every lead, 24/7",
    icon: Building2,
    color: "hsl(30, 80%, 50%)",
    highlights: [
      "Lead capture from listings & signage",
      "Showing scheduling & confirmations",
      "Tenant maintenance request intake",
      "24/7 availability for buyers & sellers",
    ],
  },
  {
    id: "homeservices",
    name: "HomeBase",
    niche: "Home Services (HVAC, Plumbing, etc.)",
    tagline: "Book more jobs while you're on the job",
    icon: Home,
    color: "hsl(200, 65%, 50%)",
    highlights: [
      "Emergency dispatch & priority routing",
      "Job booking & technician scheduling",
      "Quote request intake & follow-up",
    ],
  },
  {
    id: "general",
    name: "BizFirst",
    niche: "General Small Business",
    tagline: "Your professional front desk, without the overhead",
    icon: Briefcase,
    color: "hsl(270, 50%, 50%)",
    highlights: [
      "Professional greeting & call screening",
      "Message taking & CRM integration",
      "Appointment scheduling & reminders",
      "Overflow & after-hours coverage",
    ],
  },
  {
    id: "beauty",
    name: "BeautyBoost",
    niche: "Beauty & Wellness (Salons, Spas, etc.)",
    tagline: "Keep your chair full and your calendar booked",
    icon: Sparkles,
    color: "hsl(310, 75%, 50%)",
    highlights: [
      "Appointment booking & automated reminders",
      "Service inquiry routing & package information",
      "New client intake & availability checking",
      "After-hours message capture & callback scheduling",
    ],
  },
];

const requirements = [
  {
    title: "Your Stripe Account",
    description: "For accepting payments from your clients",
  },
  {
    title: "Your Resend Account",
    description: "For sending branded emails to your clients",
  },
  {
    title: "Your Logo & Brand Guidelines",
    description: "Colors, fonts, and any brand assets you want us to use",
  },
];

const yourOnlyJob = [
  {
    icon: TrendingUp,
    title: "Market Your Brand",
    description: "Run your marketing, build your presence, and attract clients. The Growth Hub tools are already set up and ready to go.",
  },
  {
    icon: Handshake,
    title: "Close Deals",
    description: "You're the face your clients see. Present your services, sign agreements, and onboard them through your branded portal.",
  },
  {
    icon: Users,
    title: "Grow on Your Terms",
    description: "As your client base grows, hire a dedicated VA through us to manage day-to-day client communication so you can step back and scale.",
  },
];

const steps = [
  {
    step: 1,
    icon: Calendar,
    title: "Schedule a Call",
    description: "We learn about your business, target market, and brand vision. Together, we map out exactly what your white-label business will look like.",
  },
  {
    step: 2,
    icon: Wrench,
    title: "We Build Everything",
    description: "Our team builds your website, configures your dashboard, purchases your domain, and sets up all your tools and pricing.",
  },
  {
    step: 3,
    icon: Rocket,
    title: "Launch Your Business",
    description: "You're live and ready to onboard clients. We hand over the keys and walk you through everything in a dedicated launch session.",
  },
];

const valueProps = [
  "You market. You sell. We handle fulfillment.",
  "Your clients never know we exist",
  "100% ownership of your client book",
  "Scale with a VA or sell the whole business",
  "Launch in as little as 2 weeks",
  "Lowest wholesale rates with better margins than standard partners",
];

const ownershipProps = [
  {
    icon: BadgeDollarSign,
    title: "Your Clients, Your Revenue",
    description: "Every dollar your clients pay goes to you first. You set the prices, you keep the margins.",
  },
  {
    icon: Crown,
    title: "Fully Transferable",
    description: "Sell your business and client book whenever you choose. It's yours, no strings attached.",
  },
  {
    icon: ShieldCheck,
    title: "Passive Income Ready",
    description: "Hire a VA to run operations while you focus on growth, or step away entirely.",
  },
];

const faqs = [
  {
    question: "What exactly is included in the $9,997 fee?",
    answer: "Everything you need to launch a fully branded white-label virtual receptionist business: a custom website, domain purchase and hosting, a fully configured partner dashboard with your branding, custom pricing and packages, Growth Hub marketing tools, a seeded knowledge base, branded email templates, and a dedicated onboarding and launch support call.",
  },
  {
    question: "How long does the setup take?",
    answer: "Most LaunchPad builds are completed within 2 weeks from the time we receive your brand assets. Complex customizations may take slightly longer, but we'll communicate timelines clearly during your onboarding call.",
  },
  {
    question: "Do I need any technical knowledge?",
    answer: "Not at all. That's the whole point of Partner LaunchPad. We handle all the technical setup. You just provide your brand assets (logo, colors, guidelines) and your Stripe and Resend accounts. We take care of the rest.",
  },
  {
    question: "What's the difference between LaunchPad and signing up for a regular White Label plan?",
    answer: "With a regular White Label plan, you get access to the dashboard and tools, but you build and configure everything yourself. LaunchPad is a done-for-you service. We build your website, buy your domain, configure your dashboard, set up your pricing, and launch you. It's the fastest way to get started, and LaunchPad partners receive our lowest wholesale rates, giving you better margins from day one.",
  },
  {
    question: "Can I customize things after launch?",
    answer: "Absolutely. Once we hand over your fully configured dashboard, you have full control to update pricing, branding, knowledge base articles, email templates, and marketing tools at any time.",
  },
  {
    question: "What are the ongoing costs after the one-time fee?",
    answer: "After the $9,997 setup, you'll choose a monthly dashboard plan (Starter at $49/mo, Professional at $149/mo, or Enterprise at $299/mo). As a LaunchPad partner, you also receive our lowest wholesale per-minute rates, which is better pricing than partners who sign up through the standard white-label program. This means higher margins on every client from day one. There are no hidden fees.",
  },
  {
    question: "Do you ever deal with my clients directly?",
    answer: "Never. Your clients only interact with you or your VA. We operate entirely behind the scenes as your silent fulfillment partner. Your brand is the only brand your clients ever see.",
  },
  {
    question: "Can I hire a VA to manage my clients?",
    answer: "Yes. As you scale, you can hire a dedicated VA through us who becomes the point of contact between your clients and our fulfillment team. They work under your brand, so your clients never know we exist.",
  },
  {
    question: "Can I sell my business later?",
    answer: "Absolutely. Your book of business, client relationships, and brand are 100% yours. You can sell your white-label business anytime. It's a real asset you own.",
  },
  {
    question: "Is this a drop-servicing business?",
    answer: "Essentially, yes. You sell the services under your brand, we fulfill them behind the scenes. You own the client relationships, set your own prices, and keep the margins. Build it up, run it passively, or sell it for a profit.",
  },
  {
    question: "Do LaunchPad partners get better pricing than regular White Label partners?",
    answer: "Yes. LaunchPad partners are automatically placed on our lowest wholesale pricing tier for per-minute call handling. This gives you a meaningful margin advantage over partners who join through the standard sign-up process, meaning more profit per client from the start.",
  },
];

export default function PartnerLaunchPad() {
  return (
    <>
      <SEO
        title="Partner LaunchPad: Your White Label Business Built For You"
        description="Get your white-label virtual receptionist business built and launched for $9,997. Website, domain, dashboard, pricing, everything done for you."
        canonical="/partners/launchpad"
        jsonLd={createFAQSchema(faqs)}
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
              <Link
                to="/partners"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors"
              >
                ← Back to Partner Program
              </Link>

              <div className="flex items-center justify-center gap-3 mb-6">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Rocket className="w-8 h-8 text-primary" />
                </motion.div>
              </div>

              <Badge className="bg-secondary/10 text-secondary border-secondary/30 mb-4">
                Turnkey Solution
              </Badge>

              <h1 className="text-4xl lg:text-6xl font-bold text-heading mb-6 leading-tight">
                Partner <span className="text-gradient">LaunchPad</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
                Your White Label Business, Built and Ready to Launch
              </p>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                We build your website, buy your domain, configure your dashboard, and set up your pricing.
                You just bring your brand, and we handle the rest.
              </p>

              <motion.div
                className="inline-flex flex-col items-center gap-2 mb-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="text-6xl lg:text-7xl font-bold text-heading">$9,997</span>
                <span className="text-muted-foreground text-lg">One-time setup fee</span>
              </motion.div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" variant="cta" asChild>
                  <Link to="/call-advisor">
                    Schedule a Call
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/partners/white-label">View White Label Plans</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-20 bg-background">
          <div className="container-custom">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Everything That's <span className="text-gradient">Included</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A complete done-for-you setup so you can focus on selling, not building
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {includedFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Card className="h-full hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6 flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-heading mb-1">{feature.title}</h3>
                        <p className="text-muted-foreground text-sm">{feature.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Launch Templates */}
        <section className="py-20 bg-gradient-to-br from-secondary/5 via-background to-primary/5">
          <div className="container-custom">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-secondary/10 text-secondary border-secondary/30 mb-4">
                Starting Points
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Choose Your Launch <span className="text-gradient">Template</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Pick an industry template as your starting point, or bring your own vision. Every template is fully customizable.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {launchpadTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`h-full hover:shadow-soft transition-all duration-300 hover:-translate-y-1 border-l-4`} style={{ borderLeftColor: template.color }}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${template.color}15` }}>
                          <template.icon className="w-6 h-6" style={{ color: template.color }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-heading">{template.name}</h3>
                          <p className="text-xs text-muted-foreground">{template.niche}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground italic mb-4">"{template.tagline}"</p>
                      <ul className="space-y-2 mb-6">
                        {template.highlights.map((point) => (
                          <li key={point} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: template.color }} />
                            <span className="text-muted-foreground">{point}</span>
                          </li>
                        ))}
                      </ul>
                      <Button size="sm" variant="outline" className="w-full" asChild>
                        <Link to="/call-advisor">
                          Schedule a Call
                          <ArrowRight className="ml-2 w-3 h-3" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.p
              className="text-center text-sm text-muted-foreground mt-8 max-w-xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              These are starting points. We customize everything to your exact brand and vision during setup.
            </motion.p>
          </div>
        </section>

        {/* What You Bring */}
        <section className="py-16 bg-accent/30">
          <div className="container-custom">
            <motion.div
              className="max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-heading mb-8 text-center">
                What You <span className="text-gradient">Bring</span>
              </h2>
              <div className="grid sm:grid-cols-3 gap-6">
                {requirements.map((req, index) => (
                  <motion.div
                    key={req.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full text-center">
                      <CardContent className="p-6">
                        <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
                        <h3 className="font-bold text-heading mb-1">{req.title}</h3>
                        <p className="text-sm text-muted-foreground">{req.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Your Only Job */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="container-custom">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-primary/10 text-primary border-primary/30 mb-4">
                Your Role
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Your Only <span className="text-gradient">Job</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Be the face. Close the deals. We do everything else.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {yourOnlyJob.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card className="h-full text-center hover:shadow-soft transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20">
                    <CardContent className="p-8">
                      <motion.div
                        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <item.icon className="w-8 h-8 text-primary" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-heading mb-3">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="max-w-2xl mx-auto text-center space-y-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm font-medium">We never interact with your clients directly. Your VA becomes the go-between.</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Crown className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm font-medium">Your book of business is 100% yours, always.</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-background">
          <div className="container-custom">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                How It <span className="text-gradient">Works</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Three simple steps to your fully branded business
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

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
                    <step.icon className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-heading mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Partner LaunchPad */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container-custom">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Why Partner LaunchPad
              </h2>
            </motion.div>

            <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
              {valueProps.map((prop, index) => (
                <motion.div
                  key={prop}
                  className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20"
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Zap className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{prop}</span>
                </motion.div>
              ))}
            </div>

            <div className="text-center mt-8">
              <p className="text-primary-foreground/80 text-sm">
                After launch, choose a{" "}
                <Link to="/partners/white-label" className="underline underline-offset-2 hover:text-primary-foreground">
                  monthly dashboard plan
                </Link>{" "}
                to keep your tools and support active.
              </p>
            </div>
          </div>
        </section>

        {/* Build It. Own It. Sell It. */}
        <section className="py-20 bg-gradient-to-br from-secondary/5 via-background to-primary/5">
          <div className="container-custom">
            <motion.div
              className="text-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-secondary/10 text-secondary border-secondary/30 mb-4">
                Ownership
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Build It. Own It. <span className="text-gradient">Sell It.</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
                This isn't a job, it's a business you own. Your client relationships, your revenue, your brand.
                Build it up, run it passively with a VA, or sell it for a profit. The book of business belongs to you.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {ownershipProps.map((prop, index) => (
                <motion.div
                  key={prop.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                >
                  <Card className="h-full text-center border-2 border-transparent hover:border-secondary/20 hover:shadow-soft transition-all duration-300">
                    <CardContent className="p-8">
                      <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-5">
                        <prop.icon className="w-7 h-7 text-secondary" />
                      </div>
                      <h3 className="text-lg font-bold text-heading mb-2">{prop.title}</h3>
                      <p className="text-muted-foreground text-sm">{prop.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-accent/30">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto">
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                  Frequently Asked Questions
                </h2>
              </motion.div>

              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={faq.question}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <AccordionItem value={`item-${index}`} className="bg-card border rounded-xl px-6 shadow-sm">
                      <AccordionTrigger className="text-left text-heading hover:no-underline py-6">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-6">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Rocket className="w-16 h-16 text-primary mx-auto mb-6" />
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Ready to <span className="text-gradient">Launch?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Schedule a call with our team and we'll have your white-label business built and ready in as little as 5 business days.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" variant="cta" asChild>
                  <Link to="/call-advisor">
                    Schedule a Call
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/partners/white-label">Explore White Label Plans</Link>
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
