import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { FlowStepSelector } from "@/components/call-flow-builder/FlowStepSelector";
import { FlowRuleSelector } from "@/components/call-flow-builder/FlowRuleSelector";
import { FlowPreview } from "@/components/call-flow-builder/FlowPreview";
import { FlowCaptureForm } from "@/components/call-flow-builder/FlowCaptureForm";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

export interface FlowConfig {
  callTypes: string[];
  rules: {
    transfers: string[];
    promises: string[];
    dataCapture: string[];
  };
}

export default function CallFlowBuilder() {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<FlowConfig>({
    callTypes: [],
    rules: { transfers: [], promises: [], dataCapture: [] },
  });
  const [captured, setCaptured] = useState(false);

  const canProceed = [
    () => config.callTypes.length > 0,
    () => config.rules.transfers.length > 0 || config.rules.dataCapture.length > 0,
    () => true, // preview always OK
    () => true, // capture form
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Call-Flow Builder | Design Your Ideal Call Handling"
        description="Build a visual outline of your ideal call flow in minutes. Choose call types, set rules, and see your flow—then let 24H Virtual encode it for you."
        canonical="/call-flow-builder"
      />
      <Navigation />

      <section className="gradient-hero pt-32 pb-12">
        <div className="container-custom">
          <motion.div
            className="max-w-2xl mx-auto text-center space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-balance">Build Your Call Flow</h1>
            <p className="text-lg text-muted-foreground">
              Design your ideal call handling in minutes. We'll encode it and go live in days.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="section-spacing bg-background">
        <div className="container-custom max-w-3xl">
          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {["Call Types", "Rules", "Preview", "Get Started"].map((label, i) => (
              <div key={i} className="flex-1 text-center">
                <div className={`h-1.5 rounded-full mb-2 transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
                <span className={`text-xs font-medium ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
              </div>
            ))}
          </div>

          {step === 0 && (
            <FlowStepSelector
              selected={config.callTypes}
              onChange={(callTypes) => setConfig({ ...config, callTypes })}
            />
          )}
          {step === 1 && (
            <FlowRuleSelector
              rules={config.rules}
              onChange={(rules) => setConfig({ ...config, rules })}
            />
          )}
          {step === 2 && <FlowPreview config={config} />}
          {step === 3 && (
            <FlowCaptureForm config={config} onCaptured={() => setCaptured(true)} captured={captured} />
          )}

          {!captured && (
            <div className="flex justify-between mt-8">
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button variant="cta" onClick={() => setStep(step + 1)} disabled={step === 3 || !canProceed[step]()}>
                {step === 2 ? "Book a Strategy Session" : "Next"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
