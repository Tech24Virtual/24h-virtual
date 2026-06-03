import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, CheckCircle2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getIndustryBySlug } from "@/data/industries";
import type { EstimatorData } from "@/pages/LaunchEstimator";

function calculateTimeline(data: EstimatorData): { min: number; max: number; steps: string[] } {
  let base = 5;
  const steps: string[] = [];

  // Location complexity
  if (data.locations === "1") { base += 0; steps.push("Single location — minimal routing setup"); }
  else if (data.locations === "2-5") { base += 2; steps.push("Multi-location routing configuration"); }
  else if (data.locations === "6-20") { base += 5; steps.push("Regional routing and brand isolation"); }
  else { base += 8; steps.push("Enterprise rollout with phased go-live"); }

  // Tool integrations
  const realTools = data.tools.filter(t => !t.includes("None"));
  if (realTools.length > 0) {
    base += Math.min(realTools.length, 3);
    steps.push(`${realTools.length} tool integration(s) to connect`);
  } else {
    steps.push("No integrations — faster standalone setup");
  }

  // Call complexity
  const hasEmergency = data.callTypes.some(ct => ct.includes("Emergency"));
  const hasPayment = data.callTypes.some(ct => ct.includes("Payment"));
  if (hasEmergency) { base += 2; steps.push("Emergency dispatch rules and escalation paths"); }
  if (hasPayment) { base += 1; steps.push("Payment processing flow configuration"); }
  if (data.callTypes.length > 3) { base += 1; steps.push("Multi-flow script encoding"); }

  steps.push("QA testing and go-live validation");

  return { min: Math.max(5, base - 2), max: base + 3, steps };
}

interface Props {
  data: EstimatorData;
  onReset: () => void;
}

export function EstimatorResults({ data, onReset }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const timeline = calculateTimeline(data);
  const industryInfo = getIndustryBySlug(data.industry);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await supabase.rpc("submit_lead" as any, {
        p_name: name || "Launch Estimator User",
        p_email: email,
        p_source: "launch_estimator",
        p_notes: JSON.stringify({
          industry: data.industry,
          locations: data.locations,
          tools: data.tools,
          callTypes: data.callTypes,
          estimatedDays: `${timeline.min}-${timeline.max}`,
        }),
      });
      setSubmitted(true);
      toast.success("We'll send your personalized launch plan shortly!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Timeline Result */}
      <Card className="shadow-card border-0 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="p-8 text-center space-y-4">
          <Clock className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-3xl font-bold text-heading">
            Estimated Launch: <span className="text-primary">{timeline.min}–{timeline.max} days</span>
          </h2>
          <p className="text-muted-foreground">
            For {industryInfo?.name || data.industry} with {data.locations} location{data.locations !== "1" ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Recommended Path */}
      <Card className="shadow-card">
        <CardContent className="p-8">
          <h3 className="text-xl font-semibold text-heading mb-6">Your Recommended Onboarding Path</h3>
          <div className="space-y-4">
            {timeline.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lead Capture */}
      {!submitted ? (
        <Card className="shadow-card">
          <CardContent className="p-8">
            <h3 className="text-lg font-semibold text-heading mb-2">Get Your Detailed Launch Plan</h3>
            <p className="text-sm text-muted-foreground mb-6">
              We'll email you a tailored campaign launch plan based on your answers.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <Button type="submit" variant="cta" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send My Launch Plan"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <p className="text-heading font-semibold">Your launch plan is on its way!</p>
            <Button variant="cta" asChild>
              <Link to="/get-started">
                Start Your Setup Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button variant="ghost" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Start Over
        </Button>
      </div>
    </motion.div>
  );
}
