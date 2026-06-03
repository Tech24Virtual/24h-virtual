import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WizardData } from "@/pages/GetStarted";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const taskOptions = [
  { value: "email-inbox", label: "Email & inbox management" },
  { value: "calendar-scheduling", label: "Calendar management & scheduling" },
  { value: "data-entry", label: "Data entry & organization" },
  { value: "research-reporting", label: "Research & reporting" },
  { value: "customer-support", label: "Customer support (email/chat)" },
  { value: "social-media", label: "Social media management" },
  { value: "bookkeeping", label: "Bookkeeping & invoicing" },
  { value: "travel", label: "Travel arrangements" },
  { value: "project-coordination", label: "Project coordination" },
  { value: "other", label: "Other (describe in notes)" },
];

const workingHoursOptions = [
  { value: "sync", label: "Match my business hours (synchronous)" },
  { value: "overlap", label: "At least 4 hours overlap with my day" },
  { value: "async", label: "Flexible / Async (work can be done anytime)" },
];

const communicationOptions = [
  { value: "email", label: "Email" },
  { value: "slack-teams", label: "Slack / Microsoft Teams" },
  { value: "phone", label: "Phone calls" },
  { value: "video", label: "Video calls (Zoom, Google Meet)" },
  { value: "project-tools", label: "Project management tools (Asana, Trello, etc.)" },
];

const launchTimelineOptions = [
  { value: "asap", label: "As Soon As Possible" },
  { value: "next-week", label: "Next Week" },
  { value: "next-month", label: "Next Month" },
];

const bestTimeOptions = [
  { value: "morning", label: "Morning (9 AM - 12 PM)" },
  { value: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
  { value: "evening", label: "Evening (5 PM - 8 PM)" },
];

export function StepCustomizationVA({ data, updateData, nextStep, prevStep }: StepProps) {
  const toggleTask = (value: string) => {
    const current = data.vaTasks || [];
    const updated = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value];
    updateData({ vaTasks: updated });
  };

  const toggleCommunication = (value: string) => {
    const current = data.vaCommunication || [];
    const updated = current.includes(value)
      ? current.filter((c) => c !== value)
      : [...current, value];
    updateData({ vaCommunication: updated });
  };

  const isValid =
    data.vaTasks.length > 0 &&
    data.vaWorkingHours &&
    data.vaCommunication.length > 0 &&
    data.hasCrmSoftware &&
    data.launchTimeline &&
    data.bestTimeToConnect;

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle>Customize your Virtual Assistant</CardTitle>
        <CardDescription>
          Tell us about your needs and preferences for your full-time VA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Tasks - Multi-select */}
        <div className="space-y-3">
          <Label>What tasks do you need help with? * <span className="text-muted-foreground font-normal">(Select all that apply)</span></Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {taskOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  data.vaTasks?.includes(option.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => toggleTask(option.value)}
              >
                <Checkbox
                  checked={data.vaTasks?.includes(option.value)}
                  onCheckedChange={() => toggleTask(option.value)}
                />
                <Label className="cursor-pointer text-sm flex-1">{option.label}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Working Hours Preference */}
        <div className="space-y-3">
          <Label>Preferred working hours? *</Label>
          <RadioGroup
            value={data.vaWorkingHours}
            onValueChange={(value) => updateData({ vaWorkingHours: value })}
            className="space-y-2"
          >
            {workingHoursOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  data.vaWorkingHours === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value={option.value} id={`hours-${option.value}`} />
                <Label htmlFor={`hours-${option.value}`} className="cursor-pointer text-sm flex-1">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Communication Preference - Multi-select */}
        <div className="space-y-3">
          <Label>How do you prefer to communicate? * <span className="text-muted-foreground font-normal">(Select all that apply)</span></Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communicationOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                  data.vaCommunication?.includes(option.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => toggleCommunication(option.value)}
              >
                <Checkbox
                  checked={data.vaCommunication?.includes(option.value)}
                  onCheckedChange={() => toggleCommunication(option.value)}
                />
                <Label className="cursor-pointer text-sm flex-1">{option.label}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* CRM/Software Access */}
        <div className="space-y-3">
          <Label>Do you have CRM or Software we will need access to? *</Label>
          <RadioGroup
            value={data.hasCrmSoftware}
            onValueChange={(value) => {
              updateData({ hasCrmSoftware: value });
              if (value === "no") {
                updateData({ crmSoftwareName: "" });
              }
            }}
            className="flex gap-4"
          >
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.hasCrmSoftware === "yes"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}>
              <RadioGroupItem value="yes" id="crm-yes" />
              <Label htmlFor="crm-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.hasCrmSoftware === "no"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}>
              <RadioGroupItem value="no" id="crm-no" />
              <Label htmlFor="crm-no" className="cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        {data.hasCrmSoftware === "yes" && (
          <div className="space-y-2">
            <Label htmlFor="crmSoftwareName">What CRM or Software do you use?</Label>
            <Input
              id="crmSoftwareName"
              placeholder="e.g., Salesforce, HubSpot, Zoho"
              value={data.crmSoftwareName}
              onChange={(e) => updateData({ crmSoftwareName: e.target.value })}
            />
          </div>
        )}

        {/* Tools & Platforms */}
        <div className="space-y-2">
          <Label htmlFor="vaToolsPlatforms">What tools/platforms do you use? (optional)</Label>
          <Input
            id="vaToolsPlatforms"
            placeholder="e.g., Google Workspace, QuickBooks, Notion"
            value={data.vaToolsPlatforms}
            onChange={(e) => updateData({ vaToolsPlatforms: e.target.value })}
          />
        </div>

        {/* Previous VA Experience */}
        <div className="space-y-3">
          <Label>Have you worked with a VA before?</Label>
          <RadioGroup
            value={data.vaPreviousExperience}
            onValueChange={(value) => updateData({ vaPreviousExperience: value })}
            className="flex gap-4"
          >
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.vaPreviousExperience === "yes"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}>
              <RadioGroupItem value="yes" id="exp-yes" />
              <Label htmlFor="exp-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.vaPreviousExperience === "no"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}>
              <RadioGroupItem value="no" id="exp-no" />
              <Label htmlFor="exp-no" className="cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Launch Timeline */}
        <div className="space-y-3">
          <Label>When are you looking to start? *</Label>
          <RadioGroup
            value={data.launchTimeline}
            onValueChange={(value) => updateData({ launchTimeline: value })}
            className="grid grid-cols-3 gap-3"
          >
            {launchTimelineOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                  data.launchTimeline === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value={option.value} id={`launch-${option.value}`} />
                <Label htmlFor={`launch-${option.value}`} className="cursor-pointer text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Best Time to Connect */}
        <div className="space-y-3">
          <Label>When is a good time to connect with you? *</Label>
          <RadioGroup
            value={data.bestTimeToConnect}
            onValueChange={(value) => updateData({ bestTimeToConnect: value })}
            className="grid grid-cols-3 gap-3"
          >
            {bestTimeOptions.map((option) => (
              <div
                key={option.value}
                className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                  data.bestTimeToConnect === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value={option.value} id={`time-${option.value}`} />
                <Label htmlFor={`time-${option.value}`} className="cursor-pointer text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Biggest Challenge */}
        <div className="space-y-2">
          <Label htmlFor="vaBiggestChallenge">What's your biggest challenge? (optional)</Label>
          <Textarea
            id="vaBiggestChallenge"
            placeholder="What are you hoping a VA will help you solve?"
            value={data.vaBiggestChallenge}
            onChange={(e) => updateData({ vaBiggestChallenge: e.target.value })}
            rows={3}
          />
        </div>

        {/* Special Instructions */}
        <div className="space-y-2">
          <Label htmlFor="specialInstructions">Additional notes (optional)</Label>
          <Textarea
            id="specialInstructions"
            placeholder="Any specific requirements, preferences, or details you'd like to share..."
            value={data.specialInstructions}
            onChange={(e) => updateData({ specialInstructions: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">Maximum 1000 characters</p>
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>
          <Button onClick={nextStep} variant="cta" disabled={!isValid}>
            Review & Submit
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
