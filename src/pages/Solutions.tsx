import { Link } from "react-router-dom";
import { Bot, MessageCircle, Headphones, Briefcase, Users, ArrowRight, Award, Handshake, Shield, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Badge } from "@/components/ui/badge";
import { useGatedServices } from "@/hooks/useLaunchFlags";
import { ComingSoonBadge } from "@/components/ComingSoonBadge";

const stats = [
  { value: 50, suffix: "+", label: "Team Members" },
  { value: 10, suffix: "+", label: "Countries Served" },
  { value: 44, suffix: "%", label: "Efficiency Improvement" },
  { value: 1, suffix: "M+", label: "Calls Handled" },
];

const services = [
  {
    id: "virtual-receptionist",
    name: "Virtual Receptionist",
    icon: Headphones,
    description: "Live trilingual receptionists who answer, screen, and warm-transfer the right calls.",
    features: ["Live professionals", "Appointment booking", "Trilingual support"],
    link: "/solutions/virtual-receptionist",
    price: "From $149/mo",
    popular: true,
  },
  {
    id: "message-assistant",
    name: "Message Assistant",
    icon: MessageCircle,
    description: "Capture every caller. Clean message, accurate details, delivered to your inbox.",
    features: ["Accurate message taking", "Secure delivery", "Custom channels"],
    link: "/solutions/message-assistant",
    price: "From $89/mo",
  },
  {
    id: "virtual-secretary",
    name: "Virtual Secretary",
    icon: Briefcase,
    description: "Receptionist coverage plus admin work. Calendar, correspondence, and follow-ups handled.",
    features: ["Task management", "Scheduling", "Correspondence"],
    link: "/solutions/virtual-secretary",
    price: "From $199/mo",
  },
  {
    id: "virtual-assistants",
    name: "Virtual Assistants",
    icon: Users,
    description: "A dedicated assistant or small team that learns your business and runs your projects.",
    features: ["Dedicated support", "Project coordination", "Email management"],
    link: "/solutions/virtual-assistants",
    price: "From $1,899/mo",
  },
];

const comingSoonServices = [
  {
    id: "ai-receptionist",
    name: "AI Receptionist",
    icon: Bot,
    description: "Always-on AI call answering with zero wait times. Built on your encoded scripts.",
    features: ["Instant response", "Unlimited calls", "24/7 availability"],
    link: "/solutions/ai-receptionist",
    price: "Launching Soon",
  },
  {
    id: "hybrid-receptionist",
    name: "Hybrid Receptionist",
    icon: Award,
    description: "AI handles routine calls, humans take complex ones. The best of both layers.",
    features: ["AI + Human combined", "Smart routing", "Cost optimized"],
    link: "/solutions/hybrid-receptionist",
    price: "Launching Soon",
  },
];

const capabilities = [
  "24/7 Availability",
  "Trilingual Support",
  "HIPAA Compliant",
  "Custom Scripts",
  "CRM Integration",
  "Real-time Reporting",
];

const Solutions = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Virtual Receptionist Solutions"
        description="Explore our AI, live, and hybrid receptionist solutions. Find the perfect fit for your business communication needs."
        canonical="/solutions"
      />
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative gradient-hero overflow-hidden pt-32 pb-20">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 right-[10%] w-72 h-72 bg-brand-rose/30 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="container-custom relative">
            <motion.div
              className="max-w-3xl mx-auto text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="secondary" className="text-sm px-4 py-1">
                24/7 VIRTUAL SUPPORT SERVICES
              </Badge>
              <h1 className="text-heading">Solutions</h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Empower Your Customer Service with Professional Virtual Receptionists 
                for Every Call, 24/7
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" variant="cta" className="text-base px-8 h-14" asChild>
                  <Link to="/get-started">
                    Book FREE Consultation
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="btn-ghost-blue text-base px-8 h-14" asChild>
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="section-spacing bg-accent/30">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="mb-4">Our Success at a Glance</h2>
              <p className="text-lg text-muted-foreground">
                Trusted by businesses across North America
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="text-center border-0 shadow-card bg-card">
                    <CardContent className="p-6">
                      <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                        <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                      </div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Live Services Grid */}
        <section className="section-spacing bg-background">
          <div className="container-custom">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge variant="outline" className="mb-4">LIVE SERVICES</Badge>
              <h2 className="mb-4">Pick the level of handling your business needs</h2>
              <p className="text-lg text-muted-foreground">
                Live human receptionists, all using the same encoded scripts and per-second billing.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className={service.popular ? "relative" : ""}
                >
                  <Card className={`h-full hover:shadow-card-hover transition-all relative ${
                    service.popular ? "border-2 border-secondary" : ""
                  }`}>
                    {service.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-secondary-foreground">
                        Most Popular
                      </Badge>
                    )}
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <service.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-heading">{service.name}</h3>
                          <p className="text-sm text-primary font-medium">{service.price}</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm">{service.description}</p>
                      <ul className="space-y-2">
                        {service.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-col gap-2">
                        <Button variant="cta" className="w-full" asChild>
                          <Link to="/get-started">
                            Book FREE Consultation
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full text-primary" asChild>
                          <Link to={service.link}>Learn More</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Coming Next */}
        <section className="section-spacing bg-accent/30">
          <div className="container-custom">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <ComingSoonBadge label="Coming Next" className="mb-4" />
              <h2 className="mb-4">AI and Hybrid coverage launching soon</h2>
              <p className="text-lg text-muted-foreground">
                The same encoded scripts and routing rules, layered with AI for instant response and human escalation when it matters. Join the waitlist today.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {comingSoonServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-card-hover transition-all relative border-cta/30">
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cta text-cta-foreground">
                      Launching Soon
                    </Badge>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <service.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-heading">{service.name}</h3>
                          <p className="text-sm text-primary font-medium">{service.price}</p>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm">{service.description}</p>
                      <ul className="space-y-2">
                        {service.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button variant="cta" className="w-full" asChild>
                        <Link to={service.link}>
                          Join Waitlist
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

        {/* Company Story Section */}
        <section className="section-spacing bg-accent/30">
          <div className="container-custom">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <Badge variant="outline">STREAMLINING SERVICE OPERATIONS</Badge>
                <h2>Our Story</h2>
                <p className="text-muted-foreground">
                  Founded in 2019, 24H Virtual started with a simple mission: help businesses 
                  never miss another important call. What began as a small team of dedicated 
                  receptionists has grown into a comprehensive virtual support platform serving 
                  businesses across 10+ countries.
                </p>
                <p className="text-muted-foreground">
                  In 2025, we enhanced our services with AI technology, combining the efficiency 
                  of automation with the warmth of human interaction. Today, we handle over 
                  1 million calls annually, helping businesses grow while maintaining the 
                  personal touch their customers expect.
                </p>
                <Button asChild>
                  <Link to="/about">
                    Learn More About Us
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-6"
              >
                {/* Trust & Recognition */}
                <Card className="border-0 shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Award className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold text-heading">Trust & Recognition</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Recognized as a leading virtual receptionist provider, trusted by 
                      medical practices, law firms, and businesses nationwide.
                    </p>
                  </CardContent>
                </Card>

                {/* Partnerships */}
                <Card className="border-0 shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Handshake className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold text-heading">Partnerships</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Integrated with leading CRMs, calendars, and business tools to 
                      seamlessly fit into your existing workflow.
                    </p>
                  </CardContent>
                </Card>

                {/* Capabilities */}
                <Card className="border-0 shadow-card">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Shield className="w-6 h-6 text-primary" />
                      <h3 className="font-semibold text-heading">Capabilities</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-spacing bg-primary text-primary-foreground">
          <div className="container-custom">
            <motion.div
              className="max-w-3xl mx-auto text-center space-y-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                Ready to Capture Every Call and Scale Your Business?
              </h2>
              <p className="text-lg opacity-90">
                Book your FREE consultation today and discover how we can help
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  variant="cta"
                  className="text-base px-8 h-14"
                  asChild
                >
                  <Link to="/get-started">
                    Get Started Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-14 border-white/30 text-white hover:bg-white/10"
                  asChild
                >
                  <Link to="/demo">Book Your FREE Consultation</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Solutions;
