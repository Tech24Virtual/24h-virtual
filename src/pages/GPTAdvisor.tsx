import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Phone,
  PhoneCall,
  FileText,
  CalendarCheck,
  Languages,
  UserCheck,
  ShieldCheck,
  Bot,
  Headphones,
  Zap,
  Clock,
  Star,
  CreditCard,
  Timer,
  ThumbsUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ServiceFeatureGrid } from "@/components/services/ServiceFeatureGrid";
import { ServiceProcess } from "@/components/services/ServiceProcess";
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO } from "@/components/SEO";
import { InlineCalculatorPreview } from "@/components/InlineCalculatorPreview";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useUTMParams } from "@/hooks/useUTMParams";
import heroImage from "@/assets/heroes/hero-header.png";

// --- Data ---

const features = [
  {
    icon: PhoneCall,
    title: "24/7 Live Answering",
    description:
      "Real humans, not bots, answering every call around the clock so you never miss an opportunity.",
  },
  {
    icon: FileText,
    title: "Custom Call Scripts",
    description:
      "Tailored greetings and workflows that match your brand voice and industry needs.",
  },
  {
    icon: CalendarCheck,
    title: "Appointment Booking",
    description:
      "Direct calendar integration so appointments are booked in real-time, no double-booking.",
  },
  {
    icon: Languages,
    title: "Trilingual Support",
    description:
      "English, Spanish, and French agents ready to serve your diverse customer base.",
  },
  {
    icon: UserCheck,
    title: "Lead Capture",
    description:
      "Every caller becomes a tracked opportunity with detailed notes and follow-up triggers.",
  },
  {
    icon: ShieldCheck,
    title: "HIPAA Compliant",
    description:
      "Secure call handling that meets healthcare and legal compliance standards.",
  },
];

const services = [
  {
    icon: Bot,
    title: "AI Receptionist",
    price: "$49",
    description: "Instant AI answering, 24/7",
    link: "/solutions/ai-receptionist",
  },
  {
    icon: Headphones,
    title: "Virtual Receptionist",
    price: "$149",
    description: "Live human agents for your brand",
    link: "/solutions/virtual-receptionist",
  },
  {
    icon: Zap,
    title: "Hybrid Receptionist",
    price: "$99",
    description: "AI speed + human expertise",
    link: "/solutions/hybrid-receptionist",
  },
];

const processSteps = [
  {
    number: 1,
    title: "Book a Free Consultation",
    description:
      "15-minute call to map your call flow and understand your business needs.",
  },
  {
    number: 2,
    title: "We Build Your Scripts",
    description:
      "Custom training for your industry, brand voice, and specific workflows.",
  },
  {
    number: 3,
    title: "Go Live in 24-48 Hours",
    description:
      "Start forwarding calls and track everything from your dashboard.",
  },
];

const stats = [
  { value: 20, suffix: "+", label: "Years Experience" },
  { value: 1, suffix: "M+", label: "Calls Handled" },
  { value: 3, suffix: "", label: "Rings Average", prefix: "<" },
  { value: 1, suffix: "K+", label: "Happy Customers" },
];

const testimonials = [
  {
    quote:
      "24H Virtual completely transformed how we handle after-hours calls. Our booking rate doubled within a month.",
    name: "Shauna MacKenzie",
    role: "Logistics Manager",
    rating: 5,
  },
  {
    quote:
      "Professional, reliable, and our clients can't tell the difference. It's like having an in-house team at a fraction of the cost.",
    name: "Julianne Aury",
    role: "CEO, Financial Foothold",
    rating: 5,
  },
];

// --- Form Schema ---

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  company: z.string().trim().min(1, "Company is required").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  source: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// --- Component ---

export default function GPTAdvisor() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const utmParams = useUTMParams();
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: "AI Assistant / ChatGPT",
    },
  });

  const onSubmit = async (formData: FormData) => {
    setIsSubmitting(true);

    try {
      const notes = JSON.stringify({
        how_found: formData.source,
        utm: utmParams,
      });

      const { error } = await supabase.from("leads").insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company,
        source: "gpt_advisor",
        status: "new",
        notes,
      });

      if (error) throw error;

      toast({
        title: "Consultation request received!",
        description:
          "We'll contact you within 24 hours to schedule your free consultation.",
      });
      reset();
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or call us at 1.800.825.2587",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextTestimonial = () =>
    setTestimonialIndex((i) => (i + 1) % testimonials.length);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Your AI Receptionist Plan: Let's Make It Real"
        description="You've seen what AI can do. Now let real professionals handle your calls 24/7. Book a free consultation and go live in 48 hours."
        canonical="/gpt-advisor"
        noindex
      />
      <Navigation />

      {/* Section 1: Hero */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Bot className="w-4 h-4" />
                Powered by AI, Backed by Humans
              </span>

              <h1 className="text-balance">
                Your AI Advisor Gave You the Plan{" "}
                <span className="text-secondary">We Execute It</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-xl">
                You just explored how a virtual receptionist can transform your
                business. Now talk to a real person who'll make it happen.
                Setup in 24-48 hours.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Button size="lg" variant="cta" className="text-base px-8 h-14" asChild>
                  <a href="#consultation-form">
                    Book Your FREE Consultation
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-14"
                  asChild
                >
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" />
                or call{" "}
                <a
                  href="tel:18008252587"
                  className="font-semibold text-foreground hover:text-primary transition-colors"
                >
                  1.800.825.2587
                </a>
              </p>
            </motion.div>

            {/* Right */}
            <motion.div
              className="relative hidden lg:block"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <img
                src={heroImage}
                alt="24H Virtual professional receptionist ready to answer your calls"
                className="w-full max-w-lg mx-auto"
                loading="eager"
              />

              {/* Floating glass cards */}
              <motion.div
                className="absolute top-[40%] left-[5%] bg-background/90 backdrop-blur-xl rounded-2xl p-4 shadow-elevated border border-border/50"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <PhoneCall className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-heading text-sm">1M+ Calls Answered</p>
                    <p className="text-xs text-muted-foreground">And counting</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute bottom-12 -right-4 bg-background/90 backdrop-blur-xl rounded-2xl p-4 shadow-elevated border border-border/50"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-status-success/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[hsl(var(--status-success))]" />
                  </div>
                  <div>
                    <p className="font-semibold text-heading text-sm">Setup in 24-48 Hours</p>
                    <p className="text-xs text-muted-foreground">Fast onboarding</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2: Feature Grid */}
      <ServiceFeatureGrid
        title="What the AI Told You, We Deliver"
        subtitle="Everything your AI advisor covered, backed by 20+ years of real-world experience"
        features={features}
      />

      {/* Section 3: Quick Service Comparison */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="mb-4">
              Find Your <span className="text-secondary">Perfect Fit</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Three flexible solutions starting from just $49/mo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card className="h-full text-center hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-6 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                      <service.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-heading">
                      {service.title}
                    </h3>
                    <p className="text-2xl font-bold text-primary">
                      From {service.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {service.description}
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={service.link}>
                        Learn More
                        <ArrowRight className="ml-1 w-4 h-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator Diagnostic Tool */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-balance">
                How Much Are{" "}
                <span className="text-secondary">Missed Calls</span> Costing You?
              </h2>
              <p className="text-lg text-muted-foreground">
                Use our free calculator to see exactly how much you could save compared to hiring
                in-house. Get a personalized savings report with your numbers.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  Compare your current costs vs. 24H Virtual
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  See recommended plans for your call volume
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  Download a branded PDF report
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <InlineCalculatorPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <ServiceProcess
        title="How It Works"
        subtitle="From consultation to live in 3 simple steps"
        steps={processSteps}
      />

      {/* Section 5: Social Proof */}
      <section className="section-spacing bg-accent/30">
        <div className="container-custom">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  {stat.prefix}
                  <AnimatedCounter value={stat.value} />
                  {stat.suffix}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Testimonial Card */}
          <motion.div
            className="max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Card
              className="cursor-pointer hover:shadow-card-hover transition-shadow"
              onClick={nextTestimonial}
            >
              <CardContent className="p-8 text-center space-y-4">
                <div className="flex justify-center gap-1">
                  {Array.from({ length: testimonials[testimonialIndex].rating }).map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-[hsl(var(--status-warning))] text-[hsl(var(--status-warning))]"
                      />
                    )
                  )}
                </div>
                <p className="text-lg text-muted-foreground italic">
                  "{testimonials[testimonialIndex].quote}"
                </p>
                <div>
                  <p className="font-semibold text-heading">
                    {testimonials[testimonialIndex].name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonials[testimonialIndex].role}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verified on Clutch.co • Click for next review
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Section 6: Lead Capture Form */}
      <section id="consultation-form" className="section-spacing bg-background scroll-mt-24">
        <div className="container-custom">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-heading mb-2">
                    Book Your Free Consultation
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    15 minutes. No pressure. Just a clear plan for your
                    business.
                  </p>

                  {submitted ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <CalendarCheck className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-heading">
                        We Got Your Request!
                      </h3>
                      <p className="text-muted-foreground">
                        A team member will reach out within 24 hours to schedule
                        your consultation.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gpt-name">Name *</Label>
                          <Input
                            id="gpt-name"
                            placeholder="Your name"
                            {...register("name")}
                            className={errors.name ? "border-destructive" : ""}
                          />
                          {errors.name && (
                            <p className="text-sm text-destructive">
                              {errors.name.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gpt-email">Email *</Label>
                          <Input
                            id="gpt-email"
                            type="email"
                            placeholder="your@email.com"
                            {...register("email")}
                            className={errors.email ? "border-destructive" : ""}
                          />
                          {errors.email && (
                            <p className="text-sm text-destructive">
                              {errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gpt-company">Company *</Label>
                          <Input
                            id="gpt-company"
                            placeholder="Your company"
                            {...register("company")}
                            className={
                              errors.company ? "border-destructive" : ""
                            }
                          />
                          {errors.company && (
                            <p className="text-sm text-destructive">
                              {errors.company.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gpt-phone">Phone</Label>
                          <Input
                            id="gpt-phone"
                            type="tel"
                            placeholder="(555) 555-5555"
                            {...register("phone")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>How Did You Find Us?</Label>
                        <Select
                          defaultValue="AI Assistant / ChatGPT"
                          onValueChange={(value) => setValue("source", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AI Assistant / ChatGPT">
                              AI Assistant / ChatGPT
                            </SelectItem>
                            <SelectItem value="Google Search">
                              Google Search
                            </SelectItem>
                            <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                            <SelectItem value="Facebook / Instagram">
                              Facebook / Instagram
                            </SelectItem>
                            <SelectItem value="Referral">Referral</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        variant="cta"
                        className="w-full"
                        size="lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          "Submitting..."
                        ) : (
                          <>
                            Book Your FREE Consultation
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Trust Signals */}
            <motion.div
              className="space-y-8 flex flex-col justify-center"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-heading">
                Why Book a{" "}
                <span className="text-secondary">Consultation?</span>
              </h2>
              <p className="text-muted-foreground">
                Your AI advisor mapped out the strategy. Now let a real expert
                customize it for your specific business, industry, and call
                volume.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: CreditCard,
                    text: "No credit card required",
                  },
                  {
                    icon: Timer,
                    text: "15-minute call. We respect your time",
                  },
                  {
                    icon: ThumbsUp,
                    text: "No pressure, just honest recommendations",
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-muted-foreground font-medium">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Prefer to call?{" "}
                  <a
                    href="tel:18008252587"
                    className="font-semibold text-primary hover:underline"
                  >
                    1.800.825.2587
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 7: CTA Banner */}
      <ServiceCTA
        title={{
          primary: "Ready to Turn AI Insights Into",
          highlight: "Real Results?",
        }}
        subtitle="Your AI advisor showed you the plan. Let's make it happen. Setup in 24-48 hours."
        ctaText="Book Your FREE Consultation"
        ctaLink="/gpt-advisor#consultation-form"
        showPhone={false}
      />

      <Footer />
    </div>
  );
}
