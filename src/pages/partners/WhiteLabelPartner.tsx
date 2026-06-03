import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Building2, 
  ArrowRight, 
  CheckCircle, 
  Palette,
  Globe,
  Headphones,
  DollarSign,
  Shield,
  Settings,
  Users,
  Zap,
  Award,
  LayoutDashboard,
  Rocket,
  Check,
  X,
  BarChart3
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const pricingHighlights = [
  {
    title: "Wholesale Per-Minute Rates",
    description: "Tiered pricing based on monthly volume. The more minutes your clients use, the lower your rate.",
    icon: DollarSign,
  },
  {
    title: "$100 One-Time Setup",
    description: "One-time $100 setup fee per client to get them onboarded and ready to receive calls.",
    icon: Settings,
  },
  {
    title: "Volume Discount at 10K Minutes",
    description: "Hit 10,000 combined monthly minutes across all your clients and unlock our lowest fixed wholesale rate.",
    icon: Zap,
  },
  {
    title: "Language Surcharges",
    description: "Multilingual support available starting at $0.05/min per language.",
    icon: Globe,
  },
];

const benefits = [
  {
    icon: Palette,
    title: "Complete Brand Control",
    description: "Your logo, colors, and domain. Clients never see 24H Virtual branding."
  },
  {
    icon: DollarSign,
    title: "Set Your Own Pricing",
    description: "Full margin control. Keep the difference between your pricing and our wholesale rates."
  },
  {
    icon: Globe,
    title: "Custom Domain",
    description: "Host your client portal on your own domain for seamless brand experience."
  },
  {
    icon: LayoutDashboard,
    title: "Dedicated Partner Dashboard",
    description: "Communicate with our team, manage clients, view analytics, and handle ticketing, all from one place."
  },
  {
    icon: Rocket,
    title: "Growth Hub Marketing Suite",
    description: "7 built-in marketing tools including Auto-Blog, SEO Reports, Email Marketing, Social Snippets, and more."
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "Priority support team to help you and your clients succeed."
  },
  {
    icon: Zap,
    title: "Quick Setup",
    description: "Get up and running in 24-48 hours with our streamlined onboarding process."
  },
  {
    icon: Globe,
    title: "WordPress Integration",
    description: "Connect your WordPress site directly to your dashboard. Auto-publish blog posts, manage content, and drive organic traffic for your clients."
  },
  {
    icon: BarChart3,
    title: "Advanced Reporting & Analytics",
    description: "Detailed insights into client usage, call volumes, and performance metrics to help you optimize strategy and demonstrate ROI."
  },
];

const dashboardPlans = [
  {
    name: "Starter",
    price: "$49",
    description: "Perfect for new partners getting started",
    features: [
      { name: "Up to 10 clients", included: true },
      { name: "Unlimited campaigns per client", included: true },
      { name: "Basic usage analytics", included: true },
      { name: "Basic branding (logo, colors)", included: true },
      { name: "Client ticketing", included: false },
      { name: "Knowledge base", included: false },
      { name: "Full branding (domain, emails)", included: false },
      { name: "Growth Hub (7 tools)", included: false },
      { name: "Priority support", included: false },
      { name: "Dedicated account manager", included: false },
    ],
  },
  {
    name: "Professional",
    price: "$149",
    popular: true,
    description: "For growing partners scaling their business",
    features: [
      { name: "Up to 50 clients", included: true },
      { name: "Unlimited campaigns per client", included: true },
      { name: "Advanced usage analytics", included: true },
      { name: "Full branding (domain, emails)", included: true },
      { name: "Client ticketing", included: true },
      { name: "Knowledge base", included: true },
      { name: "Full branding (domain, emails)", included: true },
      { name: "Growth Hub (7 tools)", included: false },
      { name: "Priority support", included: false },
      { name: "Dedicated account manager", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "$299",
    description: "For established partners with high volume",
    features: [
      { name: "Unlimited clients", included: true },
      { name: "Unlimited campaigns per client", included: true },
      { name: "Advanced analytics + API access", included: true },
      { name: "Full branding + custom portal", included: true },
      { name: "Client ticketing", included: true },
      { name: "Knowledge base", included: true },
      { name: "Growth Hub (7 tools)", included: true },
      { name: "Priority support", included: true },
      { name: "Dedicated account manager", included: true },
    ],
  },
];

const faqs = [
  {
    question: "How does white-label pricing work?",
    answer: "You pay our tiered wholesale per-minute rates and set your own retail prices to clients. The difference is your margin. Setup fees are $100 per client plus $25 for each additional campaign."
  },
  {
    question: "Can I add my own services on top?",
    answer: "Absolutely! Many partners bundle our services with their own offerings like marketing, web design, or consulting to create comprehensive packages."
  },
  {
    question: "How does the volume discount work?",
    answer: "Once your combined client usage reaches 10,000 minutes per month, you automatically unlock our lowest fixed wholesale rate across all your accounts."
  },
  {
    question: "Do you offer training for my team?",
    answer: "Yes! All partners receive onboarding training, platform walkthroughs, and dedicated support to get up and running quickly."
  },
  {
    question: "Is there a limit on how many clients I can have?",
    answer: "No. There are no client caps. You can onboard as many clients as you need. Our infrastructure scales with your growth."
  },
  {
    question: "What's the minimum contract term?",
    answer: "We offer month-to-month plans with no long-term commitment required."
  },
];

export default function WhiteLabelPartner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    industry: "",
    company_size: "",
    services_interested: [] as string[],
    tech_platform: "",
    hosting_preference: "",
    call_volume: "",
    customization_needs: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the terms and conditions to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('white_label_partners').insert({
        ...formData,
        user_id: user?.id || null,
        agreed_to_terms: agreedToTerms,
        status: 'pending'
      } as any);

      if (error) throw error;

      toast({
        title: "Application Submitted!",
        description: "We'll review your application and get back to you within 24-48 hours.",
      });
      
      navigate("/partners");
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <SEO 
        title="White Label Partner Program | 24H Virtual"
        description="Build your brand with our white-label virtual receptionist solutions. Full branding control, custom pricing, and dedicated support."
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
                ← Back to Partner Programs
              </Link>
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-heading mb-6 leading-tight">
                Build Your Brand. <span className="text-gradient">We Power the Service.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Resell our industry-leading virtual receptionist services under your own brand. 
                Complete white-label solution with full control over pricing and branding.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="cta" asChild>
                  <Link to="/get-started">
                    Book FREE Consultation
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#apply">Apply Now</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-background">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Everything You Need to <span className="text-gradient">Succeed</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Full branding control, powerful tools, and dedicated support to grow your business
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <benefit.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-heading mb-2">{benefit.title}</h3>
                      <p className="text-muted-foreground text-sm">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Wholesale Pricing Model */}
        <section className="py-20 bg-accent/30">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Wholesale Pricing Model
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Usage-based wholesale rates with no client caps. You set your own retail prices and keep the margin
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
              {pricingHighlights.map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6 flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-heading mb-1">{item.title}</h3>
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="text-center">
              <Button size="lg" asChild>
                <a href="#apply">
                  Apply for Custom Rates
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Exact rates are tailored to your expected volume. Apply to get your custom quote
              </p>
            </div>
          </div>
        </section>

        {/* Dashboard Plans */}
        <section className="py-20 bg-background">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Partner Dashboard <span className="text-gradient">Plans</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the dashboard tier that fits your business. Upgrade anytime as you grow
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {dashboardPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={plan.popular ? "md:-mt-4" : ""}
                >
                  <Card
                    className={`relative h-full transition-all duration-300 ${
                      plan.popular
                        ? "border-2 border-secondary shadow-elevated md:scale-105"
                        : "hover:-translate-y-1 hover:shadow-soft"
                    }`}
                  >
                    {plan.popular && (
                      <motion.div
                        className="absolute -top-3 left-1/2 -translate-x-1/2"
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Badge className="bg-secondary text-secondary-foreground px-4 shadow-soft">
                          Most Popular
                        </Badge>
                      </motion.div>
                    )}

                    <CardHeader className="text-center pb-2 pt-8">
                      <h3 className="text-xl font-semibold text-heading mb-2">{plan.name}</h3>
                      <div className="space-y-1">
                        <p className="text-4xl font-bold text-heading">
                          {plan.price}
                          <span className="text-base font-normal text-muted-foreground">/mo</span>
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature, fi) => (
                          <li key={fi} className="flex items-start gap-2">
                            {feature.included ? (
                              <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={cn("text-sm", feature.included ? "text-foreground" : "text-muted-foreground/60")}>
                              {feature.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={plan.popular ? "cta" : "outline"}
                        asChild
                      >
                        <Link to="/call-advisor">
                          Schedule a Call
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

        {/* Partner LaunchPad Promo */}
        <section className="py-16 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
          <div className="container-custom">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="relative overflow-hidden border-2 border-secondary/30 shadow-elevated">
                <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <CardContent className="p-8 lg:p-12 relative">
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    <div className="flex-1 text-center lg:text-left">
                      <Badge className="bg-secondary/10 text-secondary border-secondary/30 mb-4">
                        <Rocket className="w-3 h-3 mr-1" />
                        Done-For-You Setup
                      </Badge>
                      <h3 className="text-2xl lg:text-3xl font-bold text-heading mb-3">
                        Partner <span className="text-gradient">LaunchPad</span>
                      </h3>
                      <p className="text-muted-foreground mb-4 max-w-lg">
                        Don't want to build it yourself? We'll build your website, buy your domain, configure your dashboard, and set up your pricing, all for a one-time fee.
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-6">
                        {["Custom Website", "Domain & Hosting", "Dashboard Setup", "Launch Support"].map((item) => (
                          <span key={item} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-primary" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-center flex-shrink-0">
                      <p className="text-4xl font-bold text-heading mb-1">$9,997</p>
                      <p className="text-sm text-muted-foreground mb-4">One-time setup</p>
                      <Button variant="cta" size="lg" asChild>
                        <Link to="/partners/launchpad">
                          Learn More
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Application Form */}
        <section id="apply" className="py-20 bg-background">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Award className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Apply for White Label Partnership
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Complete the form below and our team will review your application within 24-48 hours
              </p>
            </motion.div>

            <motion.div
              className="max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Company Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Company Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company_name">Company Name *</Label>
                          <Input
                            id="company_name"
                            required
                            value={formData.company_name}
                            onChange={(e) => handleChange("company_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact_name">Contact Name *</Label>
                          <Input
                            id="contact_name"
                            required
                            value={formData.contact_name}
                            onChange={(e) => handleChange("contact_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => handleChange("email", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleChange("phone", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="website">Website URL</Label>
                          <Input
                            id="website"
                            type="url"
                            placeholder="https://"
                            value={formData.website}
                            onChange={(e) => handleChange("website", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Business Profile */}
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Business Profile
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="industry">Industry</Label>
                          <Select onValueChange={(v) => handleChange("industry", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="marketing">Marketing Agency</SelectItem>
                              <SelectItem value="it">IT Services</SelectItem>
                              <SelectItem value="consulting">Consulting</SelectItem>
                              <SelectItem value="telecommunications">Telecommunications</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company_size">Company Size</Label>
                          <Select onValueChange={(v) => handleChange("company_size", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-5">1-5 employees</SelectItem>
                              <SelectItem value="6-20">6-20 employees</SelectItem>
                              <SelectItem value="21-50">21-50 employees</SelectItem>
                              <SelectItem value="51-200">51-200 employees</SelectItem>
                              <SelectItem value="200+">200+ employees</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="call_volume">Expected Monthly Call Volume</Label>
                          <Select onValueChange={(v) => handleChange("call_volume", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select volume" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0-500">0-500 calls</SelectItem>
                              <SelectItem value="500-2000">500-2,000 calls</SelectItem>
                              <SelectItem value="2000-5000">2,000-5,000 calls</SelectItem>
                              <SelectItem value="5000+">5,000+ calls</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Technical Requirements */}
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Technical Requirements
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tech_platform">Current Tech Platform</Label>
                          <Input
                            id="tech_platform"
                            placeholder="e.g., Salesforce, HubSpot"
                            value={formData.tech_platform}
                            onChange={(e) => handleChange("tech_platform", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hosting_preference">Hosting Preference</Label>
                          <Select onValueChange={(v) => handleChange("hosting_preference", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select preference" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cloud">Cloud-hosted (recommended)</SelectItem>
                              <SelectItem value="custom_domain">Custom domain</SelectItem>
                              <SelectItem value="discuss">Need to discuss</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="customization_needs">Customization Needs</Label>
                          <Textarea
                            id="customization_needs"
                            placeholder="Tell us about any specific customization requirements..."
                            value={formData.customization_needs}
                            onChange={(e) => handleChange("customization_needs", e.target.value)}
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Agreement */}
                    <div className="border-t pt-6">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="terms"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                          I agree to the{" "}
                          <Link to="/terms" className="text-primary hover:underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                          </Link>
                          . I understand that my application will be reviewed and I will be contacted within 24-48 hours.
                        </Label>
                      </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Application"}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-20 bg-accent/30">
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
                    <AccordionItem value={`item-${index}`} className="bg-background rounded-xl px-6">
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

        {/* CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Grow Your Business?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                Join our white label program and start offering world-class virtual receptionist services today.
              </p>
              <Button size="lg" variant="cta" asChild>
                <Link to="/get-started">
                  Book FREE Consultation
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
