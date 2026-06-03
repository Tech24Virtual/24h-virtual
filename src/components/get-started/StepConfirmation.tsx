import { useState } from "react";
import { ArrowLeft, Check, Edit2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWizardSession } from "@/hooks/useWizardSession";
import type { WizardData } from "@/pages/GetStarted";
import {
  aiReceptionistPricing,
  messageAssistantPricing,
  virtualReceptionistPricing,
  virtualSecretaryPricing,
  getAnnualPrice,
  formatPrice,
  type ServicePricing,
} from "@/lib/pricingData";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
}

const servicePricingMap: Record<string, ServicePricing> = {
  "ai-receptionist": aiReceptionistPricing,
  "message-assistant": messageAssistantPricing,
  "virtual-receptionist": virtualReceptionistPricing,
  "virtual-secretary": virtualSecretaryPricing,
};

const timezoneLabels: Record<string, string> = {
  pacific: "Pacific Time (PT)",
  mountain: "Mountain Time (MT)",
  central: "Central Time (CT)",
  eastern: "Eastern Time (ET)",
};

const launchTimelineLabels: Record<string, string> = {
  asap: "As Soon As Possible",
  "next-week": "Next Week",
  "next-month": "Next Month",
};

const bestTimeLabels: Record<string, string> = {
  morning: "Morning (9 AM - 12 PM)",
  afternoon: "Afternoon (12 PM - 5 PM)",
  evening: "Evening (5 PM - 8 PM)",
};

const expectedUsageLabels: Record<string, string> = {
  "under-50": "Under 50 minutes",
  "50-100": "50-100 minutes",
  "100-250": "100-250 minutes",
  "250-500": "250-500 minutes",
  "500-plus": "500+ minutes",
  "not-sure": "Not sure yet",
};

// VA-specific label maps
const vaTaskLabels: Record<string, string> = {
  "email-inbox": "Email & inbox management",
  "calendar-scheduling": "Calendar management & scheduling",
  "data-entry": "Data entry & organization",
  "research-reporting": "Research & reporting",
  "customer-support": "Customer support (email/chat)",
  "social-media": "Social media management",
  "bookkeeping": "Bookkeeping & invoicing",
  "travel": "Travel arrangements",
  "project-coordination": "Project coordination",
  "other": "Other",
};

const vaWorkingHoursLabels: Record<string, string> = {
  "sync": "Match my business hours (synchronous)",
  "overlap": "At least 4 hours overlap",
  "async": "Flexible / Async",
};

const vaCommunicationLabels: Record<string, string> = {
  "email": "Email",
  "slack-teams": "Slack / Microsoft Teams",
  "phone": "Phone calls",
  "video": "Video calls",
  "project-tools": "Project management tools",
};

// VA type labels and pricing
const vaTypeLabels: Record<string, string> = {
  offshore: "Offshore",
  nearshore: "Nearshore",
  onshore: "Onshore",
};

const vaPricing: Record<string, number> = {
  offshore: 1899,
  nearshore: 2499,
  onshore: 4899,
};

export function StepConfirmation({ data, prevStep, goToStep }: StepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const wizardSession = useWizardSession();

  const isVirtualAssistants = data.service === "virtual-assistants";
  const pricing = servicePricingMap[data.service] || aiReceptionistPricing;
  const tier = pricing.tiers.find((t) => t.minutes === data.minutes);
  const isAnnual = data.billingPeriod === "annual";
  const displayPrice = tier
    ? isAnnual
      ? formatPrice(getAnnualPrice(tier.price))
      : tier.priceFormatted
    : "$0";

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Build notes with additional wizard data for CRM context
      const wizardNotes = JSON.stringify({
        // Common fields
        timezone: data.timezone,
        phoneProvider: data.phoneProvider,
        hasCrmSoftware: data.hasCrmSoftware,
        crmSoftwareName: data.crmSoftwareName,
        launchTimeline: data.launchTimeline,
        bestTimeToConnect: data.bestTimeToConnect,
        specialInstructions: data.specialInstructions,
        // Conditional: Receptionist fields
        ...(data.service !== "virtual-assistants" && {
          callHandling: data.callHandling,
          businessHours: data.businessHours,
          transferNumbers: data.transferNumbers,
          wantCallsTransferred: data.wantCallsTransferred,
          numberOfTransferLines: data.numberOfTransferLines,
          scheduleAppointments: data.scheduleAppointments,
          appointmentSoftware: data.appointmentSoftware,
          expectedMonthlyUsage: data.expectedMonthlyUsage,
        }),
        // Conditional: VA fields
        ...(data.service === "virtual-assistants" && {
          vaType: data.vaType,
          vaTasks: data.vaTasks,
          vaWorkingHours: data.vaWorkingHours,
          vaCommunication: data.vaCommunication,
          vaToolsPlatforms: data.vaToolsPlatforms,
          vaPreviousExperience: data.vaPreviousExperience,
          vaBiggestChallenge: data.vaBiggestChallenge,
        }),
      });

      // Save lead to database with pipeline tracking fields
      const { data: leadRow, error } = await supabase.from("leads").insert({
        name: data.contactName,
        email: data.email,
        phone: data.phone || null,
        company: data.companyName,
        source: "onboarding_wizard",
        status: "new",
        notes: wizardNotes,
        // New pipeline tracking fields
        pipeline_stage: "new",
        service_type: data.service,
        plan_minutes: data.minutes,
        billing_period: data.billingPeriod,
        country: data.country,
        billing_currency: data.billingCurrency,
        onboarding_checklist: {
          consultation_completed: false,
          call_flows_created: false,
          scripts_written: false,
          dispositions_configured: false,
          post_call_flow_setup: false,
          forwarding_number_assigned: false,
          test_call_completed: false,
        },
      }).select("id").maybeSingle();

      if (error) throw error;

      // Finalize the CRM-style wizard session and link the new lead.
      void wizardSession.finalize(data, leadRow?.id ?? null);

      // Show success - no Stripe checkout, admin will send payment link later
      setIsSubmitted(true);
      // Scroll to top so user sees success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast({
        title: "Welcome aboard! 🎉",
        description: "Our team will contact you within 24-48 hours to complete your setup.",
      });
    } catch (error) {
      console.error("Failed to submit wizard:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-cta/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-cta" />
          </div>
          <h2 className="text-2xl font-bold text-heading mb-2">
            You're all set!
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Thank you for choosing 24H Virtual. Our onboarding team will reach out 
            within 24 hours to complete your setup.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <a href="/">Return Home</a>
            </Button>
            <Button asChild>
              <a href="/pricing">View All Services</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle>Review your order</CardTitle>
        <CardDescription>
          Please confirm your information before submitting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Business Info */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-heading text-sm mb-1">
              Business Information
            </h3>
            <p className="text-muted-foreground text-sm">{data.companyName}</p>
            <p className="text-muted-foreground text-sm capitalize">
              {data.industry.replace(/-/g, " ")}
            </p>
            {data.website && (
              <p className="text-muted-foreground text-sm">{data.website}</p>
            )}
            <p className="text-muted-foreground text-sm">
              {timezoneLabels[data.timezone] || data.timezone}
            </p>
            {data.phoneProvider && (
              <p className="text-muted-foreground text-sm">
                Phone: {data.phoneProvider}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(1)}
            className="text-primary"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        <Separator />

        {/* Service & Plan */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-heading text-sm mb-1">
              Selected Plan
            </h3>
            {isVirtualAssistants ? (
              <>
                <p className="text-muted-foreground text-sm">Virtual Assistants</p>
                <p className="text-muted-foreground text-sm">
                  {vaTypeLabels[data.vaType] || "Not selected"} (Full-time 40 hrs/wk)
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-primary">
                    Starting at ${vaPricing[data.vaType]?.toLocaleString() || "—"}/mo
                  </span>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-sm">{pricing.name}</p>
                <p className="text-muted-foreground text-sm">
                  {data.minutes.toLocaleString()} minutes/month
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-primary">{displayPrice}/mo</span>
                  {isAnnual && (
                    <Badge className="bg-cta/10 text-cta border-cta/20">
                      Annual - 10% off
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(3)}
            className="text-primary"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Annual Commitment Status */}
        {isAnnual && data.annualCommitmentAcknowledged && (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-cta/5 border border-cta/20">
              <ShieldCheck className="w-5 h-5 text-cta" />
              <div>
                <p className="text-sm font-medium text-cta">Annual Commitment Acknowledged</p>
                <p className="text-xs text-muted-foreground">
                  12-month service agreement accepted
                </p>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Billing Region */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-heading text-sm mb-1">
              Billing Region
            </h3>
            <p className="text-muted-foreground text-sm">
              {data.country === "CA" ? "Canada" : "United States"}
            </p>
            <p className="text-muted-foreground text-sm">
              Currency: {data.billingCurrency?.toUpperCase() || "USD"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(1)}
            className="text-primary"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        <Separator />

        {/* Contact Info */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-heading text-sm mb-1">
              Contact Information
            </h3>
            <p className="text-muted-foreground text-sm">{data.contactName}</p>
            <p className="text-muted-foreground text-sm">{data.email}</p>
            <p className="text-muted-foreground text-sm">{data.phone}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(4)}
            className="text-primary"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        <Separator />

        {/* Customization */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-heading text-sm mb-1">
              {isVirtualAssistants ? "Virtual Assistant Preferences" : "Service Preferences"}
            </h3>
            <div className="space-y-1">
              {isVirtualAssistants ? (
                // VA-specific display
                <>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Tasks:</span>{" "}
                    {data.vaTasks?.map((t) => vaTaskLabels[t] || t).join(", ") || "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Working Hours:</span>{" "}
                    {vaWorkingHoursLabels[data.vaWorkingHours] || "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Communication:</span>{" "}
                    {data.vaCommunication?.map((c) => vaCommunicationLabels[c] || c).join(", ") || "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">CRM/Software:</span>{" "}
                    {data.hasCrmSoftware === "yes" ? data.crmSoftwareName || "Yes" : "No"}
                  </p>
                  {data.vaToolsPlatforms && (
                    <p className="text-muted-foreground text-sm">
                      <span className="font-medium">Tools/Platforms:</span> {data.vaToolsPlatforms}
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Previous VA Experience:</span>{" "}
                    {data.vaPreviousExperience === "yes" ? "Yes" : data.vaPreviousExperience === "no" ? "No" : "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Launch Timeline:</span>{" "}
                    {launchTimelineLabels[data.launchTimeline] || "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Best Time to Connect:</span>{" "}
                    {bestTimeLabels[data.bestTimeToConnect] || "Not specified"}
                  </p>
                  {data.vaBiggestChallenge && (
                    <p className="text-muted-foreground text-sm mt-2 italic">
                      <span className="font-medium not-italic">Biggest Challenge:</span> "{data.vaBiggestChallenge.slice(0, 100)}
                      {data.vaBiggestChallenge.length > 100 ? "..." : ""}"
                    </p>
                  )}
                </>
              ) : (
                // Receptionist-specific display
                <>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Call Handling:</span> {data.callHandling || "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Business Hours:</span> {data.businessHours || "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Calls Transferred:</span> {data.wantCallsTransferred === "yes" ? "Yes" : "No"}
                  </p>
                  {data.wantCallsTransferred === "yes" && (
                    <>
                      <p className="text-muted-foreground text-sm">
                        <span className="font-medium">Number of Lines:</span> {data.numberOfTransferLines} campaign{data.numberOfTransferLines !== "1" ? "s" : ""}
                      </p>
                      {data.transferNumbers && (
                        <p className="text-muted-foreground text-sm">
                          <span className="font-medium">Transfer Numbers:</span> {data.transferNumbers.split("\n").join(", ")}
                        </p>
                      )}
                    </>
                  )}
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Schedule Appointments:</span> {data.scheduleAppointments === "yes" ? "Yes" : "No"}
                  </p>
                  {data.scheduleAppointments === "yes" && data.appointmentSoftware && (
                    <p className="text-muted-foreground text-sm">
                      <span className="font-medium">Booking Software:</span> {data.appointmentSoftware}
                    </p>
                  )}
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">CRM/Software:</span> {data.hasCrmSoftware === "yes" ? data.crmSoftwareName || "Yes" : "No"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Launch Timeline:</span> {launchTimelineLabels[data.launchTimeline] || "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Best Time to Connect:</span> {bestTimeLabels[data.bestTimeToConnect] || "Not specified"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    <span className="font-medium">Expected Usage:</span> {expectedUsageLabels[data.expectedMonthlyUsage] || "Not specified"}
                  </p>
                </>
              )}
              {data.specialInstructions && (
                <p className="text-muted-foreground text-sm mt-2 italic">
                  <span className="font-medium not-italic">Notes:</span> "{data.specialInstructions.slice(0, 100)}
                  {data.specialInstructions.length > 100 ? "..." : ""}"
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToStep(5)}
            className="text-primary"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="cta"
          >
            {isSubmitting ? "Submitting..." : "Complete Setup"}
            {!isSubmitting && <Check className="ml-2 w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
