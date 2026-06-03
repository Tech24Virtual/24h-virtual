import { useParams, Navigate, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO, createFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Phone, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Shield, 
  TrendingUp,
  CheckCircle,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { getCityBySlug } from "@/data/cities";
import { getIndustryBySlug } from "@/data/industries";
import { generateLocationContent, generateLocationFAQs } from "@/data/locationContent";

const LocationIndustryPage = () => {
  const { city: citySlug, industry: industrySlug } = useParams<{ city: string; industry: string }>();

  const city = citySlug ? getCityBySlug(citySlug) : undefined;
  const industry = industrySlug ? getIndustryBySlug(industrySlug) : undefined;

  // Redirect to 404 if city or industry not found
  if (!city || !industry) {
    return <Navigate to="/404" replace />;
  }

  const content = generateLocationContent(city, industry);
  const faqs = generateLocationFAQs(city, industry);
  const faqSchema = createFAQSchema(faqs);

  const cityWithState = city.country === "US" 
    ? `${city.name}, ${city.stateCode}` 
    : `${city.name}, ${city.state}`;

  const features = [
    {
      icon: Phone,
      title: "Professional Call Answering",
      description: `Live receptionists answer calls for your ${city.name} ${industry.shortName.toLowerCase()} business with a personalized greeting.`,
    },
    {
      icon: Calendar,
      title: "Appointment Scheduling",
      description: `We book appointments directly into your calendar, perfect for ${industry.name.toLowerCase()} businesses.`,
    },
    {
      icon: MessageSquare,
      title: "Message Taking & Delivery",
      description: "Receive detailed messages via email, text, or directly in your CRM.",
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: `Never miss a call from ${city.name} clients, day or night, weekends, or holidays.`,
    },
    {
      icon: Shield,
      title: "Industry Compliance",
      description: industry.slug === "medical-practices" 
        ? "HIPAA-compliant call handling for healthcare providers."
        : industry.slug === "legal-services"
        ? "Confidential call handling for attorney-client privilege."
        : `Professional protocols tailored for ${industry.name.toLowerCase()}.`,
    },
    {
      icon: TrendingUp,
      title: "Lead Capture",
      description: `Capture every potential client calling your ${city.name} business with our lead qualification process.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={content.title}
        description={content.metaDescription}
        canonical={`/locations/${city.slug}/${industry.slug}`}
        jsonLd={{
          ...content.localBusinessSchema,
          ...faqSchema,
        }}
      />
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 via-transparent to-brand-purple/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 text-brand-blue mb-6">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">Serving {cityWithState}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              {content.h1}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {content.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-brand-blue hover:bg-brand-blue/90">
                <Link to="/get-started">
                  Get Started Today
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {content.intro}
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How We Help {industry.name} in {city.name}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional virtual receptionist services designed specifically for {industry.shortName.toLowerCase()} businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:border-brand-blue/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-brand-blue" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why {city.name} {industry.shortName} Businesses Choose Us
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {content.benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-brand-blue to-brand-purple rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your {city.name} Business?
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Join hundreds of {industry.name.toLowerCase()} businesses that trust 24H Virtual for their call answering needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="cta" asChild>
                <Link to="/get-started">
                  Book Your FREE Consultation
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10" asChild>
                <Link to="/demo">View Live Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Common questions about virtual receptionist services for {industry.name.toLowerCase()} in {city.name}
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
              Explore More Services
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/industries/${industry.slug}`}>
                  {industry.name} Services
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/solutions/virtual-receptionist">
                  Virtual Receptionist
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/solutions/ai-receptionist">
                  AI Receptionist
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/pricing">
                  View All Pricing
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LocationIndustryPage;
