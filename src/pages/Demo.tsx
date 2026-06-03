import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, ArrowRight, CheckCircle, Calendar, Clock, Users, Phone } from "lucide-react";
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
import { ServiceCTA } from "@/components/services/ServiceCTA";
import { SEO } from "@/components/SEO";
import { LiveCallSimulator } from "@/components/demo/LiveCallSimulator";

const demoSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  company: z.string().trim().min(1, "Company is required").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  preferredTime: z.string().optional(),
});

type DemoFormData = z.infer<typeof demoSchema>;

const features = [
  "A clear picture of how your callers will be greeted",
  "Confidence in which solution fits your business",
  "Your custom call flow mapped out",
  "A personalized plan recommendation",
  "All your questions answered, no pressure",
];

const testimonials = [
  {
    quote: "The consultation showed me exactly how 24H Virtual would work for my practice. I signed up immediately.",
    name: "Dr. Sarah M.",
    role: "Medical Practice Owner",
  },
  {
    quote: "I was skeptical about AI receptionists but the consultation completely changed my mind.",
    name: "James T.",
    role: "Law Firm Partner",
  },
  {
    quote: "The personalized consultation helped me understand which plan was right for my business.",
    name: "Maria G.",
    role: "Real Estate Broker",
  },
];

export default function Demo() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DemoFormData>({
    resolver: zodResolver(demoSchema),
  });

  const onSubmit = async (formData: DemoFormData) => {
    setIsSubmitting(true);
    
    try {
      const notes = formData.preferredTime 
        ? JSON.stringify({ preferredTime: formData.preferredTime })
        : null;

      const { error } = await supabase.from("leads").insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company,
        source: "demo_consultation",
        status: "new",
        notes,
      });

      if (error) throw error;

      toast({
        title: "Consultation request received!",
        description: "We'll contact you within 24 hours to schedule your consultation.",
      });
      reset();
    } catch (error) {
      console.error("Failed to submit demo request:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="See 24H Virtual in Action"
        description="In 15 minutes, see exactly how your calls will be answered and how you'll capture more leads. Schedule a personalized demo today."
        canonical="/demo"
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
            <h1 className="text-balance">See How You'll Never Miss Another Call</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              In 15 minutes, see exactly how your calls will be answered and how you'll capture more leads.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Live Call Simulator */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <LiveCallSimulator />
          </motion.div>
        </div>
      </section>

      {/* Live Demo Request */}
      <section className="section-spacing bg-accent/30">
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
                  <h2 className="text-2xl font-bold text-heading mb-2">Schedule Your Free Consultation</h2>
                  <p className="text-muted-foreground mb-6">
                    Get a personalized walkthrough tailored to your business needs.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          {...register("name")}
                          className={errors.name ? "border-destructive" : ""}
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          {...register("email")}
                          className={errors.email ? "border-destructive" : ""}
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company *</Label>
                        <Input
                          id="company"
                          placeholder="Your company"
                          {...register("company")}
                          className={errors.company ? "border-destructive" : ""}
                        />
                        {errors.company && (
                          <p className="text-sm text-destructive">{errors.company.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="(555) 555-5555"
                          {...register("phone")}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Time</Label>
                      <Select onValueChange={(value) => setValue("preferredTime", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                          <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                          <SelectItem value="evening">Evening (5pm - 7pm)</SelectItem>
                          <SelectItem value="flexible">I'm flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" variant="cta" className="w-full" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : (
                        <>
                          Request Consultation
                          <Calendar className="ml-2 w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* What You'll Learn */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <h2 className="text-2xl font-bold text-heading mb-6">What You'll Walk Away With</h2>
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="text-center">
                  <CardContent className="p-4">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-heading">15 min</p>
                    <p className="text-sm text-muted-foreground">Quick overview</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-4">
                    <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-heading">1-on-1</p>
                    <p className="text-sm text-muted-foreground">Personal call</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-4">
                    <Phone className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-heading">No pressure</p>
                    <p className="text-sm text-muted-foreground">Just info</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-spacing bg-background">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="mb-4">What Our Clients Are Saying</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6 space-y-4">
                    <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                    <div>
                      <p className="font-semibold text-heading">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <ServiceCTA
        title="Ready to Get Started?"
        subtitle="Skip ahead and start your 6-step setup now"
        ctaText="Get Started Today"
        ctaLink="/get-started"
      />

      <Footer />
    </div>
  );
}
