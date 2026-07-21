import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Users, 
  ArrowRight, 
  CheckCircle, 
  DollarSign,
  TrendingUp,
  Megaphone,
  BarChart3,
  CreditCard,
  Shield,
  Clock,
  Target,
  FileText
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

const features = [
  {
    icon: DollarSign,
    title: "$150 + Quarterly Bonuses",
    description: "Earn a $150 conversion bonus for every referral that becomes a client, plus quarterly retention bonuses from $50–$150 as you tier up."
  },
  {
    icon: Clock,
    title: "90-Day Cookie Window",
    description: "Your referral is tracked for 90 days. Even if they sign up months after clicking your link, you still earn the full bonus."
  },
  {
    icon: Megaphone,
    title: "Marketing Materials",
    description: "Access banners, email templates, landing pages, and social media content to promote effectively."
  },
  {
    icon: BarChart3,
    title: "Real-time Tracking",
    description: "Monitor clicks, conversions, and earnings in real-time through your personalized affiliate dashboard."
  },
  {
    icon: CreditCard,
    title: "Monthly Payouts",
    description: "Get paid on the 15th of each month via PayPal, direct deposit, or wire transfer. No minimum threshold."
  },
  {
    icon: Shield,
    title: "Referral Discount",
    description: "Your referrals get 10% off for their first 3 months, making it easier for you to close the deal."
  },
  {
    icon: Target,
    title: "Tier Rewards",
    description: "Unlock higher quarterly retention bonuses as you grow. Platinum affiliates earn up to $750 per referral in year one."
  },
  {
    icon: FileText,
    title: "Compliance Support",
    description: "All marketing materials are FTC compliant. We provide guidelines to keep your promotions legal."
  },
];

const commissionTiers = [
  { tier: "Standard", referrals: "0–24", conversion: "$150", quarterly: "$50", yearOne: "$350" },
  { tier: "Silver", referrals: "25–49", conversion: "$150", quarterly: "$75", yearOne: "$450" },
  { tier: "Gold", referrals: "50–99", conversion: "$150", quarterly: "$100", yearOne: "$550" },
  { tier: "Platinum", referrals: "100+", conversion: "$150", quarterly: "$150", yearOne: "$750" },
];

const faqs = [
  {
    question: "How do commissions work?",
    answer: "You earn a flat $150 conversion bonus when your referral becomes a paying client. On top of that, you receive quarterly retention bonuses ($50–$150 depending on your tier) for each client that stays active, paid every 3 months."
  },
  {
    question: "When do I get paid?",
    answer: "Conversion bonuses are paid monthly on the 15th. Quarterly retention bonuses are paid at the end of each quarter. There's no minimum payout threshold."
  },
  {
    question: "How do I track my referrals?",
    answer: "Your affiliate dashboard provides real-time tracking of clicks, sign-ups, conversions, and earnings. You can also access detailed reports and analytics."
  },
  {
    question: "What marketing materials do you provide?",
    answer: "We provide a complete marketing kit including banners, email templates, social media posts, landing page templates, and product descriptions, all with your unique referral link baked in."
  },
  {
    question: "How do tiers work?",
    answer: "Your tier is based on your total lifetime referrals. As you refer more clients, you automatically unlock higher quarterly retention bonuses. Standard starts at $50/quarter per client, and Platinum earns $150/quarter per client."
  },
  {
    question: "Do my referrals get a discount?",
    answer: "Yes! Every client you refer gets 10% off their first 3 months of service, making it a win-win for both of you."
  },
];

export default function AffiliatePartner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    audience_size: "",
    audience_type: "",
    promotion_channels: "",
    promotion_strategy: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the affiliate terms to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate a unique affiliate code
      const affiliateCode = `AFF${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase.from('affiliates').insert({
        name: formData.name,
        email: formData.email,
        affiliate_code: affiliateCode,
        user_id: user?.id || null,
        status: 'pending'
      });

      if (error) throw error;

      // Best-effort — mirrors this application into Admin Leads / Sales so it's
      // visible in the pipeline. The application itself already succeeded above;
      // this must never block or fail the user-facing flow.
      supabase.functions.invoke('lead-intake', {
        body: {
          type: 'affiliate',
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          form_data: { ...formData, affiliate_code: affiliateCode },
        },
      }).catch(() => {});

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
          title="Affiliate Partner Program | 24H Virtual"
          description="Earn $150 per conversion plus quarterly retention bonuses by referring clients to 24H Virtual. Up to $750 per referral in year one."
        />
      <Navigation />
      
      <main className="min-h-screen pt-20">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 bg-gradient-to-br from-background via-secondary/5 to-background overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-72 h-72 bg-secondary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
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
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-secondary" />
                </div>
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-heading mb-6 leading-tight">
                Earn Up to $750 Per Referral <span className="text-secondary">In Year One</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Earn a $150 bonus for every referral that converts, plus up to $150 in quarterly retention bonuses. 
                That's up to $750 per referral in year one, with no cap on earnings.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button size="lg" asChild>
                  <a href="#apply">
                    Become an Affiliate
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/call-advisor">Schedule a Call</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Commission Tiers */}
        <section className="py-20 bg-background">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Earning Tiers
              </h2>
              <p className="text-lg text-muted-foreground">
                The more you refer, the higher your quarterly retention bonuses
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-accent/50">
                          <th className="text-left p-4 font-semibold text-heading">Tier</th>
                          <th className="text-center p-4 font-semibold text-heading">Referrals</th>
                          <th className="text-center p-4 font-semibold text-heading">Conversion Bonus</th>
                          <th className="text-center p-4 font-semibold text-heading">Quarterly Bonus</th>
                          <th className="text-center p-4 font-semibold text-heading">Year 1 Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissionTiers.map((tier, index) => (
                          <motion.tr
                            key={tier.tier}
                            className={`border-b last:border-0 ${index === 3 ? 'bg-secondary/5' : ''}`}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <td className="p-4 font-semibold text-heading">{tier.tier}</td>
                            <td className="p-4 text-center text-muted-foreground">{tier.referrals}</td>
                            <td className="p-4 text-center font-medium text-secondary">{tier.conversion}</td>
                            <td className="p-4 text-center font-medium text-secondary">{tier.quarterly}</td>
                            <td className="p-4 text-center font-bold text-heading">{tier.yearOne}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Year 1 Total = Conversion Bonus + (4 × Quarterly Bonus). Bonuses paid per referred client.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-accent/30">
          <div className="container-custom">
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Everything You Need to Succeed
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                        <feature.icon className="w-6 h-6 text-secondary" />
                      </div>
                      <h3 className="text-lg font-bold text-heading mb-2">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
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
              <TrendingUp className="w-12 h-12 text-secondary mx-auto mb-4" />
              <h2 className="text-3xl lg:text-4xl font-bold text-heading mb-4">
                Apply to Become an Affiliate
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get started in minutes and start earning commissions today
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
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Partner Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-4">Partner Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => handleChange("name", e.target.value)}
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
                        <div className="space-y-2">
                          <Label htmlFor="website">Website/Social URL</Label>
                          <Input
                            id="website"
                            placeholder="https://"
                            value={formData.website}
                            onChange={(e) => handleChange("website", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Audience & Reach */}
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-4">Audience & Reach</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="audience_size">Audience Size</Label>
                          <Select onValueChange={(v) => handleChange("audience_size", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0-1000">0-1,000</SelectItem>
                              <SelectItem value="1000-10000">1,000-10,000</SelectItem>
                              <SelectItem value="10000-50000">10,000-50,000</SelectItem>
                              <SelectItem value="50000-100000">50,000-100,000</SelectItem>
                              <SelectItem value="100000+">100,000+</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="audience_type">Audience Type</Label>
                          <Select onValueChange={(v) => handleChange("audience_type", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="small_business">Small Business Owners</SelectItem>
                              <SelectItem value="entrepreneurs">Entrepreneurs</SelectItem>
                              <SelectItem value="professionals">Professionals</SelectItem>
                              <SelectItem value="marketing">Marketing Professionals</SelectItem>
                              <SelectItem value="mixed">Mixed Audience</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="promotion_channels">Promotion Channels</Label>
                          <Input
                            id="promotion_channels"
                            placeholder="e.g., Blog, YouTube, LinkedIn, Email Newsletter"
                            value={formData.promotion_channels}
                            onChange={(e) => handleChange("promotion_channels", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Promotion Strategy */}
                    <div>
                      <h3 className="text-lg font-semibold text-heading mb-4">Promotion Strategy</h3>
                      <div className="space-y-2">
                        <Label htmlFor="promotion_strategy">How do you plan to promote 24H Virtual?</Label>
                        <Textarea
                          id="promotion_strategy"
                          placeholder="Tell us about your promotion strategy..."
                          value={formData.promotion_strategy}
                          onChange={(e) => handleChange("promotion_strategy", e.target.value)}
                          rows={4}
                        />
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
                            Affiliate Terms
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                          </Link>
                          . I understand commissions are subject to the terms and verification.
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
        <section className="py-20 bg-secondary text-secondary-foreground">
          <div className="container-custom text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Start Earning Today
              </h2>
              <p className="text-lg text-secondary-foreground/80 mb-8 max-w-2xl mx-auto">
                Join our affiliate program and turn your audience into a recurring revenue stream.
              </p>
              <Button size="lg" variant="outline" className="border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10" asChild>
                <a href="#apply">
                  Apply Now
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
