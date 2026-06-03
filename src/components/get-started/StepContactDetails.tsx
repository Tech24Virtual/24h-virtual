import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WizardData } from "@/pages/GetStarted";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepContactDetails({ data, updateData, nextStep, prevStep }: StepProps) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;

  const isValid =
    data.contactName.trim().length >= 2 &&
    emailRegex.test(data.email) &&
    phoneRegex.test(data.phone.replace(/\s/g, ""));

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle>Your contact information</CardTitle>
        <CardDescription>
          We'll use this to set up your account and keep you updated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="contactName">Full Name *</Label>
          <Input
            id="contactName"
            placeholder="John Smith"
            value={data.contactName}
            onChange={(e) => updateData({ contactName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@yourcompany.com"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={data.phone}
            onChange={(e) => updateData({ phone: e.target.value })}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            disabled={!isValid}
            variant="cta"
          >
            Continue
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
