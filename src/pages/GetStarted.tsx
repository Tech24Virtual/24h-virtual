import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { WizardProgress } from "@/components/get-started/WizardProgress";
import { StepBusinessInfo } from "@/components/get-started/StepBusinessInfo";
import { StepServiceSelect } from "@/components/get-started/StepServiceSelect";
import { StepPlanSelect } from "@/components/get-started/StepPlanSelect";
import { StepContactDetails } from "@/components/get-started/StepContactDetails";
import { StepCustomization } from "@/components/get-started/StepCustomization";
import { StepConfirmation } from "@/components/get-started/StepConfirmation";
import { StepCustomizationVA } from "@/components/get-started/StepCustomizationVA";
import { useWizardSession } from "@/hooks/useWizardSession";
import { track, usePageView } from "@/lib/analytics";

export interface WizardData {
  // Step 1 - Business Info
  companyName: string;
  industry: string;
  website: string;
  country: string;
  billingCurrency: string;
  timezone: string;
  phoneProvider: string;
  // Step 2 - Service Selection
  service: string;
  // Step 3 - Plan Selection
  minutes: number;
  billingPeriod: "monthly" | "annual";
  annualCommitmentAcknowledged: boolean;
  vaType: "offshore" | "nearshore" | "onshore" | "";
  // Step 4 - Contact Details
  contactName: string;
  email: string;
  phone: string;
  // Step 5 - Customization (Receptionist Services)
  callHandling: string;
  businessHours: string;
  specialInstructions: string;
  transferNumbers: string;
  wantCallsTransferred: string;
  numberOfTransferLines: string;
  scheduleAppointments: string;
  appointmentSoftware: string;
  hasCrmSoftware: string;
  crmSoftwareName: string;
  launchTimeline: string;
  bestTimeToConnect: string;
  expectedMonthlyUsage: string;
  // Step 5 - Customization (Virtual Assistants)
  vaTasks: string[];
  vaWorkingHours: string;
  vaCommunication: string[];
  vaToolsPlatforms: string;
  vaPreviousExperience: string;
  vaBiggestChallenge: string;
}

const initialData: WizardData = {
  companyName: "",
  industry: "",
  website: "",
  country: "US",
  billingCurrency: "usd",
  timezone: "",
  phoneProvider: "",
  service: "",
  minutes: 250,
  billingPeriod: "monthly",
  annualCommitmentAcknowledged: false,
  vaType: "",
  contactName: "",
  email: "",
  phone: "",
  callHandling: "",
  businessHours: "",
  specialInstructions: "",
  transferNumbers: "",
  wantCallsTransferred: "",
  numberOfTransferLines: "",
  scheduleAppointments: "",
  appointmentSoftware: "",
  hasCrmSoftware: "",
  crmSoftwareName: "",
  launchTimeline: "",
  bestTimeToConnect: "",
  expectedMonthlyUsage: "",
  // VA-specific fields
  vaTasks: [],
  vaWorkingHours: "",
  vaCommunication: [],
  vaToolsPlatforms: "",
  vaPreviousExperience: "",
  vaBiggestChallenge: "",
};

const steps = [
  { id: 1, title: "Business Info" },
  { id: 2, title: "Service" },
  { id: 3, title: "Plan" },
  { id: 4, title: "Contact" },
  { id: 5, title: "Customize" },
  { id: 6, title: "Confirm" },
];

const GetStarted = () => {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const wizardSession = useWizardSession();
  const lastSavedStep = useRef<number>(0);

  // Pre-fill from URL params
  useEffect(() => {
    const service = searchParams.get("service");
    const minutes = searchParams.get("minutes");
    const industry = searchParams.get("industry");
    const stepParam = searchParams.get("step");

    setData((prev) => ({
      ...prev,
      ...(service && { service }),
      ...(minutes && { minutes: parseInt(minutes, 10) }),
      ...(industry && { industry }),
    }));

    // Honor ?step=N for resume links from the dashboard
    if (stepParam) {
      const n = parseInt(stepParam, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 6) setCurrentStep(n);
    }
  }, [searchParams]);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  usePageView('get_started_wizard', 'anonymous');

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setCurrentStep((prev) => {
      const completed = prev;
      const next = Math.min(prev + 1, 6);
      void wizardSession.completeStep(completed, data);
      track.cta('get_started_wizard', `step_${completed}_complete`, 'anonymous', {
        service: data.service,
        industry: data.industry,
      });
      lastSavedStep.current = next;
      return next;
    });
  };
  const prevStep = () => {
    setCurrentStep((prev) => {
      const next = Math.max(prev - 1, 1);
      track.cta('get_started_wizard', `step_${prev}_back`, 'anonymous');
      return next;
    });
  };
  const goToStep = (step: number) => {
    setCurrentStep(step);
    track.cta('get_started_wizard', `step_${step}_jump`, 'anonymous');
    void wizardSession.saveStep(step, data);
  };

  const renderStep = () => {
    const props = { data, updateData, nextStep, prevStep, goToStep };

    switch (currentStep) {
      case 1:
        return <StepBusinessInfo {...props} />;
      case 2:
        return <StepServiceSelect {...props} />;
      case 3:
        return <StepPlanSelect {...props} />;
      case 4:
        return <StepContactDetails {...props} />;
      case 5:
        return data.service === "virtual-assistants" 
          ? <StepCustomizationVA {...props} />
          : <StepCustomization {...props} />;
      case 6:
        return <StepConfirmation {...props} />;
      default:
        return <StepBusinessInfo {...props} />;
    }
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Get Started - Setup Your Virtual Receptionist"
        description="Start your virtual receptionist service in 5 minutes. Simple guided setup with no IT required."
        canonical="/get-started"
        noindex
      />
      <Navigation />
      <main className="py-12 md:py-20 bg-gradient-to-b from-accent/50 to-background">
        <div className="container-custom max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-heading mb-2">
              Get Started with 24H Virtual
            </h1>
            <p className="text-muted-foreground">
              Set up your professional answering service in minutes
            </p>
          </div>

          <WizardProgress steps={steps} currentStep={currentStep} />

          <div className="mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GetStarted;
