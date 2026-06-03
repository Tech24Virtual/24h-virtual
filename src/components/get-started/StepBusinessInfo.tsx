import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WizardData } from "@/pages/GetStarted";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
}

const industries = [
  "Medical & Healthcare",
  "Legal Services",
  "Real Estate",
  "Home Services",
  "Financial Services",
  "IT & Tech Support",
  "Beauty & Wellness",
  "Emergency Services",
  "Educational Services",
  "Event Planning",
  "Veterinary",
  "Transportation & Logistics",
  "Nonprofit",
  "Other",
];

const countries = [
  { value: "US", label: "United States", currency: "USD" },
  { value: "CA", label: "Canada", currency: "CAD" },
];

const timezones = [
  { value: "pacific", label: "Pacific Time (PT)" },
  { value: "mountain", label: "Mountain Time (MT)" },
  { value: "central", label: "Central Time (CT)" },
  { value: "eastern", label: "Eastern Time (ET)" },
];

export function StepBusinessInfo({ data, updateData, nextStep }: StepProps) {
  const isValid = data.companyName.trim().length >= 2 && data.industry && data.country && data.timezone;

  const handleCountryChange = (country: string) => {
    const countryData = countries.find(c => c.value === country);
    updateData({ 
      country, 
      billingCurrency: countryData?.currency.toLowerCase() || 'usd' 
    });
  };

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle>Tell us about your business</CardTitle>
        <CardDescription>
          We'll use this information to customize your experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            placeholder="Your Business Name"
            value={data.companyName}
            onChange={(e) => updateData({ companyName: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">Industry *</Label>
          <Select
            value={data.industry}
            onValueChange={(value) => updateData({ industry: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country *</Label>
          <Select
            value={data.country || "US"}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Time Zone *</Label>
          <RadioGroup
            value={data.timezone}
            onValueChange={(value) => updateData({ timezone: value })}
            className="grid grid-cols-2 gap-3"
          >
            {timezones.map((tz) => (
              <div 
                key={tz.value} 
                className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                  data.timezone === tz.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={tz.value} id={tz.value} />
                <Label htmlFor={tz.value} className="cursor-pointer flex-1">{tz.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneProvider">Phone Provider (optional)</Label>
          <Input
            id="phoneProvider"
            placeholder="e.g., RingCentral, Vonage, Grasshopper"
            value={data.phoneProvider}
            onChange={(e) => updateData({ phoneProvider: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Let us know your current phone system so we can ensure compatibility
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website (optional)</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://yourwebsite.com"
            value={data.website}
            onChange={(e) => updateData({ website: e.target.value })}
          />
        </div>

        <div className="flex justify-end pt-4">
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
