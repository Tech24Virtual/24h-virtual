import { useState } from "react";
import { FileDown, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { captureLead } from "@/lib/intake/captureLead";
import { toast } from "sonner";
import { useUTMParams } from "@/hooks/useUTMParams";
import {
  generateCalculatorReport,
  type CalculatorReportData,
} from "@/lib/calculatorReportGenerator";
import type { PricingTier, ServicePricing } from "@/lib/pricingData";

interface ReportCaptureFormProps {
  callVolume: number;
  avgDuration: number;
  currentCost: number;
  serviceType: string;
  isAnnual: boolean;
  monthlyMinutes: number;
  recommendedTier: PricingTier | null;
  service: ServicePricing | null;
  tierPrice: number;
  overage: number;
  totalMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  roi: number;
}

export function ReportCaptureForm({
  callVolume,
  avgDuration,
  currentCost,
  serviceType,
  isAnnual,
  monthlyMinutes,
  recommendedTier,
  service,
  tierPrice,
  overage,
  totalMonthlyCost,
  monthlySavings,
  annualSavings,
  roi,
}: ReportCaptureFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const utmParams = useUTMParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 1. Save lead
      const notes = JSON.stringify({
        calculator_data: {
          callVolume,
          avgDuration,
          currentCost,
          serviceType,
          serviceName: service?.name || serviceType,
          isAnnual,
          monthlyMinutes,
          recommendedTierMinutes: recommendedTier?.minutes || 0,
          tierPrice,
          overage,
          totalMonthlyCost,
          monthlySavings,
          annualSavings,
          roi,
        },
        utm: utmParams,
      });

      const { error } = await captureLead({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company: company.trim() || null,
        source: "cost_calculator",
        notes,
      });

      if (error) throw new Error(error);

      // 2. Generate and download PDF
      const reportData: CalculatorReportData = {
        callVolume,
        avgDuration,
        currentCost,
        serviceType,
        serviceName: service?.name || serviceType,
        isAnnual,
        monthlyMinutes,
        recommendedTierMinutes: recommendedTier?.minutes || 0,
        tierPrice,
        overage,
        totalMonthlyCost,
        monthlySavings,
        annualSavings,
        roi,
        overageRate: service?.overage || 0,
        name: name.trim(),
        company: company.trim(),
      };

      await generateCalculatorReport(reportData);

      setIsSubmitted(true);
      toast.success("Report downloaded! Check your downloads folder.");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!recommendedTier || !service) return null;

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-heading">
              Report Downloaded!
            </h3>
            <p className="text-muted-foreground">
              Check your downloads folder for your personalized savings report.
            </p>
            <Button variant="cta" size="lg" asChild>
              <a href="/get-started">
                Book Your FREE Consultation
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-2 border-secondary/30 bg-accent/30">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 text-secondary">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Get Your Personalized Savings Report
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Branded PDF with your numbers, hidden cost breakdown, and ROI analysis
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-name">Name *</Label>
                <Input
                  id="report-name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-email">Email *</Label>
                <Input
                  id="report-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-company">Company</Label>
                <Input
                  id="report-company"
                  placeholder="Your company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-phone">Phone</Label>
                <Input
                  id="report-phone"
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="cta"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  Download My Savings Report
                  <FileDown className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-primary" /> No credit card
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-primary" /> Instant download
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-primary" /> Your data stays private
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
