import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { industries } from "@/data/industries";
import type { EstimatorData } from "@/pages/LaunchEstimator";

const locationOptions = [
  { value: "1", label: "1 location" },
  { value: "2-5", label: "2–5 locations" },
  { value: "6-20", label: "6–20 locations" },
  { value: "20+", label: "20+ locations" },
];

const toolOptions = [
  "CRM (Salesforce, HubSpot, etc.)",
  "Field Service Management (ServiceTitan, Housecall Pro, etc.)",
  "Phone system / VoIP",
  "Scheduling software",
  "EHR / EMR system",
  "None / Not sure",
];

const callTypeOptions = [
  "New client intake",
  "Appointment scheduling",
  "Emergency / after-hours dispatch",
  "Payment processing",
  "General inquiries",
  "Transfer / routing",
];

interface Props {
  onComplete: (data: EstimatorData) => void;
}

export function EstimatorForm({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState("");
  const [locations, setLocations] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [callTypes, setCallTypes] = useState<string[]>([]);

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const canProceed = [
    () => !!industry,
    () => !!locations,
    () => tools.length > 0,
    () => callTypes.length > 0,
  ];

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({ industry, locations, tools, callTypes });
    }
  };

  const steps = [
    // Step 1: Industry
    <div key="industry" className="space-y-4">
      <h3 className="text-xl font-semibold text-heading">What industry are you in?</h3>
      <Select value={industry} onValueChange={setIndustry}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select your industry" />
        </SelectTrigger>
        <SelectContent>
          {industries.map(ind => (
            <SelectItem key={ind.slug} value={ind.slug}>{ind.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>,

    // Step 2: Locations
    <div key="locations" className="space-y-4">
      <h3 className="text-xl font-semibold text-heading">How many locations?</h3>
      <div className="grid grid-cols-2 gap-3">
        {locationOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setLocations(opt.value)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              locations === opt.value
                ? "border-primary bg-primary/5 text-heading"
                : "border-border hover:border-primary/30 text-muted-foreground"
            }`}
          >
            <span className="font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>,

    // Step 3: Tools
    <div key="tools" className="space-y-4">
      <h3 className="text-xl font-semibold text-heading">What tools do you use?</h3>
      <p className="text-sm text-muted-foreground">Select all that apply</p>
      <div className="space-y-3">
        {toolOptions.map(tool => (
          <div key={tool} className="flex items-center gap-3">
            <Checkbox
              id={`tool-${tool}`}
              checked={tools.includes(tool)}
              onCheckedChange={() => toggleItem(tools, setTools, tool)}
            />
            <Label htmlFor={`tool-${tool}`} className="cursor-pointer">{tool}</Label>
          </div>
        ))}
      </div>
    </div>,

    // Step 4: Call types
    <div key="callTypes" className="space-y-4">
      <h3 className="text-xl font-semibold text-heading">What types of calls do you handle?</h3>
      <p className="text-sm text-muted-foreground">Select all that apply</p>
      <div className="space-y-3">
        {callTypeOptions.map(ct => (
          <div key={ct} className="flex items-center gap-3">
            <Checkbox
              id={`ct-${ct}`}
              checked={callTypes.includes(ct)}
              onCheckedChange={() => toggleItem(callTypes, setCallTypes, ct)}
            />
            <Label htmlFor={`ct-${ct}`} className="cursor-pointer">{ct}</Label>
          </div>
        ))}
      </div>
    </div>,
  ];

  return (
    <Card className="shadow-card">
      <CardContent className="p-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            variant="cta"
            onClick={handleNext}
            disabled={!canProceed[step]()}
          >
            {step === 3 ? "See My Estimate" : "Next"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
