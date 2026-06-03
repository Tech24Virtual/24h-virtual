import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { FlowConfig } from "@/pages/CallFlowBuilder";

interface Props {
  config: FlowConfig;
  onCaptured: () => void;
  captured: boolean;
}

export function FlowCaptureForm({ config, onCaptured, captured }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await supabase.rpc("submit_lead" as any, {
        p_name: name || "Call Flow Builder User",
        p_email: email,
        p_source: "call_flow_builder",
        p_notes: JSON.stringify(config),
      });
      onCaptured();
      toast.success("We'll reach out to encode your call flow!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (captured) {
    return (
      <Card className="shadow-card border-primary/20">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
          <h3 className="text-xl font-semibold text-heading">Your call flow is saved!</h3>
          <p className="text-muted-foreground">
            We'll reach out to schedule a strategy session and encode this flow for you.
          </p>
          <Button variant="cta" asChild>
            <Link to="/get-started">
              Start Your Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardContent className="p-8">
        <h3 className="text-xl font-semibold text-heading mb-2">
          Book a Strategy Session
        </h3>
        <p className="text-muted-foreground mb-6">
          We'll encode this call flow for you and have it live in days.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cfb-name">Name</Label>
            <Input id="cfb-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label htmlFor="cfb-email">Email *</Label>
            <Input id="cfb-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <Button type="submit" variant="cta" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Encode My Call Flow"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
