import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Sparkles, Calendar, Phone, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { cn } from "@/lib/utils";

interface Answer {
  callVolume?: string;
  industry?: string;
  primaryNeed?: string;
}

interface Option {
  label: string;
  value: string;
  description?: string;
}

interface Step {
  id: keyof Answer;
  question: string;
  options: Option[];
}

const steps: Step[] = [
  {
    id: "callVolume",
    question: "How many calls does your business receive per month?",
    options: [
      { label: "Under 50", value: "low", description: "Small practice or solo" },
      { label: "50-200", value: "medium", description: "Growing business" },
      { label: "200-500", value: "high", description: "Established company" },
      { label: "500+", value: "enterprise", description: "High volume" },
    ],
  },
  {
    id: "industry",
    question: "What industry is your business in?",
    options: [
      { label: "Healthcare/Medical", value: "healthcare" },
      { label: "Legal Services", value: "legal" },
      { label: "Real Estate", value: "realestate" },
      { label: "Home Services", value: "homeservices" },
      { label: "Other", value: "other" },
    ],
  },
  {
    id: "primaryNeed",
    question: "What's your primary call handling need?",
    options: [
      { label: "Appointment Scheduling", value: "scheduling" },
      { label: "After-Hours Coverage", value: "afterhours" },
      { label: "Message Taking", value: "messages" },
      { label: "Full Receptionist Coverage", value: "full" },
    ],
  },
];

interface Recommendation {
  service: string;
  serviceSlug: string;
  plan: string;
  price: number;
  savings: number;
  features: string[];
}

function getRecommendation(answers: Answer): Recommendation {
  const { callVolume, primaryNeed } = answers;

  // Simple logic to recommend based on answers
  if (primaryNeed === "messages" || callVolume === "low") {
    return {
      service: "Message Assistant",
      serviceSlug: "message-assistant",
      plan: "50 Minutes",
      price: 89,
      savings: 1800,
    features: ["14-hour daily coverage", "After-hours included", "Email notifications"],
    };
  }

  if (primaryNeed === "afterhours") {
    return {
      service: "AI Receptionist",
      serviceSlug: "ai-receptionist",
      plan: "100 Minutes",
      price: 99,
      savings: 2400,
      features: ["24/7 AI coverage", "Appointment booking", "Instant notifications"],
    };
  }

  if (callVolume === "enterprise" || primaryNeed === "full") {
    return {
      service: "Virtual Secretary",
      serviceSlug: "virtual-secretary",
      plan: "250 Minutes",
      price: 699,
      savings: 4800,
      features: ["Executive support", "Calendar management", "Priority handling"],
    };
  }

  // Default recommendation
  return {
    service: "Virtual Receptionist",
    serviceSlug: "virtual-receptionist",
    plan: "100 Minutes",
    price: 299,
    savings: 3600,
    features: ["14-hour daily coverage", "Live answering", "Appointment scheduling"],
  };
}

export function ServiceFinderWidget() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answer>({});
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (stepId: keyof Answer, value: string) => {
    setAnswers((prev) => ({ ...prev, [stepId]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (showResult) {
      setShowResult(false);
    } else if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
  };

  const currentStepData = steps[currentStep];
  const currentAnswer = currentStepData ? answers[currentStepData.id] : undefined;
  const recommendation = getRecommendation(answers);

  return (
    <Card className="glass-card border-white/30 shadow-elevated overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />
      <CardContent className="p-5 sm:p-8 relative">
        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Find Your Perfect Plan</span>
                </div>
                <h3 className="text-xl font-semibold text-heading mb-2">
                  {currentStepData.question}
                </h3>
                {/* Progress */}
                <div className="flex justify-center gap-2 mt-4">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        index === currentStep
                          ? "w-8 bg-primary"
                          : index < currentStep
                          ? "w-4 bg-primary/60"
                          : "w-4 bg-border"
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {currentStepData.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSelect(currentStepData.id, option.value)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all duration-200",
                      currentAnswer === option.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border/50 hover:border-primary/30 hover:bg-accent/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-heading">{option.label}</span>
                      {currentAnswer === option.value && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    {option.description && (
                      <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <span className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <Button
                  onClick={handleNext}
                  disabled={!currentAnswer}
                  className="gap-1"
                >
                  {currentStep === steps.length - 1 ? "See Results" : "Next"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              {/* Result Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-4">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Based on Your Answers</span>
                </div>
                <h3 className="text-2xl font-bold text-heading mb-2">
                  We Recommend: {recommendation.service}
                </h3>
                <p className="text-muted-foreground">
                  {recommendation.plan} Plan
                </p>
              </div>

              {/* Pricing */}
              <div className="flex justify-center items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-primary">
                  <AnimatedCounter value={recommendation.price} prefix="$" />
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>

              {/* Savings */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-status-success/10 text-status-success rounded-full mb-6">
                <Check className="w-4 h-4" />
                <span className="font-medium">
                  Est. Savings: <AnimatedCounter value={recommendation.savings} prefix="$" suffix="/year" />
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-8 max-w-xs mx-auto">
                {recommendation.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  variant="cta"
                  className="w-full rounded-full group"
                  asChild
                >
                  <Link to={`/get-started?service=${recommendation.serviceSlug}`}>
                    Get Started with {recommendation.service}
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-full btn-ghost-blue"
                  asChild
                >
                  <Link to="/demo">
                    <Calendar className="mr-2 w-4 h-4" />
                    Book Free Consultation
                  </Link>
                </Button>
              </div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Start over
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
