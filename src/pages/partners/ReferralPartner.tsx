import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Gift, 
  ArrowRight, 
  CheckCircle, 
  DollarSign,
  Users,
  Clock,
  Handshake,
  Send
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

const rewards = [
  {
    icon: DollarSign,
    title: "$150 Per Referral",
    description: "Earn $150 for every successful referral that signs up and completes their first month of service."
  },
  {
    icon: Users,
    title: "No Limit",
    description: "There's no cap on how many referrals you can make. Refer 10 clients, earn $1,500."
  },
  {
    icon: Clock,
    title: "Quick Payout",
    description: "Get paid within 30 days after your referral completes their first month."
  },
];

const steps = [
  {
    step: 1,
    title: "Submit Referral",
    description: "Fill out the form with your referral's information"
  },
  {
    step: 2,
    title: "We Reach Out",
    description: "Our team contacts your referral and provides a personalized demo"
  },
  {
    step: 3,
    title: "Get Rewarded",
    description: "Once they sign up and complete their first month, you get $150"
  },
];

const faqs = [
  {
    question: "Who can I refer?",
    answer: "You can refer any business that could benefit from virtual receptionist services. This includes doctors, lawyers, real estate agents, contractors, and many other professionals."
  },
  {
    question: "When do I get paid?",
    answer: "You receive your $150 reward after your referral has been a paying customer for 30 days. This ensures the referral is genuine and helps us maintain quality."
  },
  {
    question: "How do I receive my payment?",
    answer: "We offer payment via PayPal, direct deposit, or can apply it as a credit to your own 24H Virtual account if you're a customer."
  },
  {
    question: "Is there a limit to how many referrals I can make?",
    answer: "No limit! You can refer as many businesses as you'd like. Each successful referral earns you $150."
  },
  {
    question: "What if my referral doesn't sign up immediately?",
    answer: "No problem! We track referrals for up to 90 days. If they sign up within that window, you still get credit."
  },
];

export default function ReferralPartner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    // Your information
    referrer_company_name: "",
    referrer_name: "",
    referrer_email: "",
    referrer_phone: "",
    // Referral information
    referred_company_name: "",
    referred_contact_name: "",
    referred_email: "",
    referred_phone: "",
    relationship: "",
    expected_needs: "",
    is_current_client: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the referral terms to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('referral_partners').insert({
        ...formData,
        user_id: user?.id || null,
        status: 'pending'
      });

      if (error) throw error;

      toast({
        title: "Referral Submitted!",
        description: "Thank you! We'll reach out to your referral within 24 hours.",
      });
      
      // Reset form
      setFormData({
        referrer_company_name: "",
        referrer_name: "",
        referrer_email: "",
        referrer_phone: "",
        referred_company_name: "",
        referred_contact_name: "",
        referred_email: "",
        referred_phone: "",
        relationship: "",
        expected_needs: "",
        is_current_client: false,
      });
      setAgreedToTerms(false);
    } catch (error) {
      console.error("Error submitting referral:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your referral. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <SEO 
        title="Referral Partner Program | 24H Virtual"
        description="Earn $150 for every successful referral. Share 24H Virtual with businesses you know and get rewarded when they sign up."
      />
      <Navigation />
      
      <main className="min-h-screen pt-20">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 bg-gradient-to-br from-background via-cta/5 to-background overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-72 h-72 bg-cta/20 rounded-full blur-3xl" />
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
                <div className="w-16 h-16 rounded-2xl bg-cta/10 flex items-center justify-center">
                  <Gift className="w-8 h-8 text-cta" />
                </div>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-heading mb-6 leading-tight">
                Share. Earn Rewards. <span className="text-cta">Everyone Wins.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Know a business that could use a virtual receptionist? Refer them to us and earn 
                $150 when they sign up. It's that simple.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <a href="#refer">
                    Submit a Referral
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Rewards Section */}
        <section className="py-20 bg-background">
          <div className="container-custom">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {rewards.map((reward, index) => (
                <motion.div
                  key={reward.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full text-center hover:shadow-soft transition-all duration-300">
                    <CardContent className="p-8">
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-cta/10 flex items-center justify-center mx-auto mb-4"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <reward.icon className="w-8 h-8 text-cta" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-heading mb-2">{reward.title}</h3>
                      <p className="text-muted-foreground text-sm">{reward.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
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
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
              {/* Connecting lines */}
              <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-cta/20 via-cta to-cta/20" />
              
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
                    className="w-24 h-24 rounded-full bg-cta/10 flex items-center justify-center mx-auto mb-6 relative z-10"
                    whileHover={{ scale: 1.1 }}
                  >
                    <span className="text-4xl font-bold text-cta">{step.step}</span>
                  </motion.div>
                  <h3 className="text-xl font-bold text-heading mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Referral Form */}
        <section id="refer" className="py-20 bg-background">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Send className="w-12 h-12 text-cta mx-auto mb-4" />
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Submit Your Referral
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Fill out the form below and we'll take care of the rest
              </p>
            </motion.div>

            <motion.div
              className="max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Your Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-cta" />
                        Your Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="referrer_company_name">Your Company Name *</Label>
                          <Input
                            id="referrer_company_name"
                            required
                            value={formData.referrer_company_name}
                            onChange={(e) => handleChange("referrer_company_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="referrer_name">Your Name *</Label>
                          <Input
                            id="referrer_name"
                            required
                            value={formData.referrer_name}
                            onChange={(e) => handleChange("referrer_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="referrer_email">Your Email *</Label>
                          <Input
                            id="referrer_email"
                            type="email"
                            required
                            value={formData.referrer_email}
                            onChange={(e) => handleChange("referrer_email", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="referrer_phone">Your Phone</Label>
                          <Input
                            id="referrer_phone"
                            type="tel"
                            value={formData.referrer_phone}
                            onChange={(e) => handleChange("referrer_phone", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Checkbox
                          id="is_current_client"
                          checked={formData.is_current_client}
                          onCheckedChange={(checked) => handleChange("is_current_client", checked as boolean)}
                        />
                        <Label htmlFor="is_current_client" className="text-sm">
                          I am a current 24H Virtual client
                        </Label>
                      </div>
                    </div>

                    {/* Referral Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-4 flex items-center gap-2">
                        <Handshake className="w-5 h-5 text-cta" />
                        Referral Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="referred_company_name">Company Name *</Label>
                          <Input
                            id="referred_company_name"
                            required
                            value={formData.referred_company_name}
                            onChange={(e) => handleChange("referred_company_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="referred_contact_name">Contact Name *</Label>
                          <Input
                            id="referred_contact_name"
                            required
                            value={formData.referred_contact_name}
                            onChange={(e) => handleChange("referred_contact_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="referred_email">Email Address *</Label>
                          <Input
                            id="referred_email"
                            type="email"
                            required
                            value={formData.referred_email}
                            onChange={(e) => handleChange("referred_email", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="referred_phone">Phone Number</Label>
                          <Input
                            id="referred_phone"
                            type="tel"
                            value={formData.referred_phone}
                            onChange={(e) => handleChange("referred_phone", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="relationship">Your Relationship</Label>
                          <Select onValueChange={(v) => handleChange("relationship", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="colleague">Colleague</SelectItem>
                              <SelectItem value="friend">Friend</SelectItem>
                              <SelectItem value="client">My Client</SelectItem>
                              <SelectItem value="business_partner">Business Partner</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="expected_needs">Expected Needs (Optional)</Label>
                          <Textarea
                            id="expected_needs"
                            placeholder="Tell us about their business and why you think they'd benefit..."
                            value={formData.expected_needs}
                            onChange={(e) => handleChange("expected_needs", e.target.value)}
                            rows={3}
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
                          I confirm that I have permission to share this contact's information and they are 
                          expecting to be contacted by 24H Virtual. I understand the $150 reward is paid after 
                          the referral completes their first month of service.
                        </Label>
                      </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Referral"}
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
        <section className="py-20 bg-gradient-to-r from-cta to-cta/80 text-white">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Gift className="w-16 h-16 mx-auto mb-6 opacity-80" />
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Know Someone Who Needs Us?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Share the gift of professional call answering and earn $150 for every successful referral.
              </p>
              <Button size="lg" variant="cta" asChild>
                <a href="#refer">
                  Submit a Referral Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
