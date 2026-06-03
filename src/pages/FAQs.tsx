import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO, createFAQSchema } from "@/components/SEO";

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  // General
  { category: "general", question: "What is 24H Virtual?", answer: "24H Virtual is a professional virtual receptionist service that answers calls on behalf of your business 24/7. We offer AI-powered receptionists, live human receptionists, and hybrid solutions to ensure you never miss a call." },
  { category: "general", question: "Who is 24H Virtual for?", answer: "Our services are designed for businesses of all sizes across various industries including healthcare, legal, real estate, home services, and more. If you receive phone calls and want professional handling, we're for you." },
  { category: "general", question: "How does it work?", answer: "Simply forward your business phone number to our dedicated line. When calls come in, our receptionists answer in your business name, take messages, schedule appointments, transfer calls, and more—based on your customized instructions." },
  { category: "general", question: "What makes you different from other answering services?", answer: "We combine cutting-edge AI technology with highly trained US-based receptionists. Our flexible plans, industry-specific training, and seamless integration options set us apart from traditional answering services." },
  
  // Pricing
  { category: "pricing", question: "How does billing work?", answer: "We bill monthly based on your selected minute tier. Minutes are calculated from the time a receptionist answers until the call ends. You can upgrade or downgrade your plan at any time." },
  { category: "pricing", question: "What happens if I exceed my minutes?", answer: "If you exceed your plan minutes, overage rates apply based on your service type. AI Receptionist: $0.75/min, Message Assistant: $1.75/min, Virtual Receptionist: $2.00/min, Virtual Secretary: $2.50/min." },
  { category: "pricing", question: "Are there any contracts?", answer: "No long-term contracts required. All our plans are month-to-month. You can cancel anytime with no penalties or hidden fees." },
  { category: "pricing", question: "Do you offer refunds?", answer: "We offer a satisfaction guarantee for new customers. If you're not happy within the first 14 days, contact us for a full refund of your subscription." },
  { category: "pricing", question: "Is there a discount for annual billing?", answer: "Yes! Annual plans receive a 10% discount, still billed monthly. You commit to 12 months of service and save on every bill." },
  
  // Setup
  { category: "setup", question: "How long does setup take?", answer: "Most accounts are fully configured within 24-48 hours. Our 6-step onboarding wizard takes about 5 minutes to complete, then our team handles the rest." },
  { category: "setup", question: "How do I forward my calls to 24H Virtual?", answer: "We provide you with a dedicated phone number. You can forward calls through your phone carrier's settings, VoIP platform, or we can help set up call routing for you." },
  { category: "setup", question: "Can I customize how calls are handled?", answer: "Absolutely! You create custom scripts, greetings, call handling rules, and FAQs. Our receptionists follow your specific instructions for every call." },
  { category: "setup", question: "Can I keep my existing phone number?", answer: "Yes! Simply forward your existing number to our service. Your callers will never know the difference—we answer in your business name." },
  
  // Services
  { category: "services", question: "What's the difference between AI and Live receptionists?", answer: "AI receptionists use advanced technology to handle calls instantly, 24/7, at lower cost—ideal for routine inquiries. Live receptionists provide human warmth and handle complex situations. Many clients use our Hybrid Receptionist for the best of both." },
  { category: "services", question: "What hours are you available?", answer: "Our AI Receptionist is available 24/7/365. Live receptionist coverage varies by plan: standard plans include 14-hour daily coverage plus after-hours, with 24/7 options available." },
  { category: "services", question: "Can you schedule appointments for my business?", answer: "Yes! We integrate with popular scheduling tools like Calendly, Acuity, and others. We can also use your existing website booking system." },
  { category: "services", question: "Do you offer trilingual services?", answer: "Yes! We offer trilingual support in English, Spanish, and French. English is available 24/7, while Spanish and French support is available during business hours (8 AM - 8 PM ET). This is available as an add-on for $50/month." },
  
  // Security
  { category: "security", question: "Is my data secure?", answer: "Absolutely. We use industry-standard encryption for all data transmission and storage. Our systems are regularly audited for security compliance." },
  { category: "security", question: "Are you HIPAA compliant?", answer: "Yes, we offer HIPAA-compliant services for healthcare providers. Our receptionists are trained on healthcare protocols and we sign BAAs with medical clients." },
  { category: "security", question: "How do you protect caller information?", answer: "All call data is encrypted and stored securely. Access is restricted to authorized personnel only. We never share your caller information with third parties." },
  { category: "security", question: "Can I control who accesses my account?", answer: "Yes, you have full control over account access. You can set up multiple users with different permission levels through your dashboard." },
];

const categories = [
  { value: "all", label: "All Questions" },
  { value: "general", label: "General" },
  { value: "pricing", label: "Pricing" },
  { value: "setup", label: "Setup" },
  { value: "services", label: "Services" },
  { value: "security", label: "Security" },
];

export default function FAQs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
      const matchesSearch = 
        searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Frequently Asked Questions"
        description="Everything you need to know about never missing another call. Find answers about pricing, setup, services, and security."
        canonical="/faqs"
        jsonLd={createFAQSchema(faqs)}
      />
      <Navigation />

      {/* Hero */}
      <section className="gradient-hero pt-32 pb-20">
        <div className="container-custom">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-balance">Get Answers and Get Started Faster</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know about never missing another call.
            </p>

            {/* Search */}
            <div className="max-w-xl mx-auto pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQs */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <TabsList className="flex flex-wrap justify-center gap-2 h-auto bg-transparent mb-8">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.value}
                    value={category.value}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeCategory} className="mt-0">
                {filteredFaqs.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">No questions found matching your search.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Accordion type="single" collapsible className="space-y-4">
                    {filteredFaqs.map((faq, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      >
                        <AccordionItem
                          value={`item-${index}`}
                          className="bg-card border rounded-xl px-6 shadow-sm"
                        >
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
                )}
              </TabsContent>
            </Tabs>

            {/* Still have questions CTA */}
            <motion.div
              className="mt-12"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-accent/50">
                <CardContent className="p-8 text-center">
                  <h2 className="text-2xl font-bold text-heading mb-4">Still Have Questions?</h2>
                  <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                    Can't find the answer you're looking for? Our team is here to help.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button variant="cta" asChild>
                      <Link to="/contact">
                        Contact Us
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/demo">Book Your FREE Consultation</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
