import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WizardData } from "@/pages/GetStarted";

interface StepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const callHandlingOptions = [
  "Take a message and email it to me",
  "Transfer calls to my mobile",
  "Transfer to the appropriate department",
  "Take message + attempt transfer",
  "Custom handling (describe below)",
];

const businessHoursOptions = [
  "9 AM - 5 PM (Standard)",
  "8 AM - 6 PM (Extended)",
  "24/7 Coverage",
  "Call Overflow Only",
  "After Hours Only",
  "Custom hours",
];

const launchTimelineOptions = [
  { value: "asap", label: "As Soon As Possible" },
  { value: "next-week", label: "Next Week" },
  { value: "next-month", label: "Next Month" },
];

const expectedUsageOptions = [
  { value: "under-50", label: "Under 50 minutes" },
  { value: "50-100", label: "50-100 minutes" },
  { value: "100-250", label: "100-250 minutes" },
  { value: "250-500", label: "250-500 minutes" },
  { value: "500-plus", label: "500+ minutes" },
  { value: "not-sure", label: "Not sure yet" },
];

const bestTimeOptions = [
  { value: "morning", label: "Morning (9 AM - 12 PM)" },
  { value: "afternoon", label: "Afternoon (12 PM - 5 PM)" },
  { value: "evening", label: "Evening (5 PM - 8 PM)" },
];

const numberOfLinesOptions = [
  { value: "1", label: "1 Line" },
  { value: "2", label: "2 Lines" },
  { value: "3", label: "3 Lines" },
  { value: "4", label: "4 Lines" },
  { value: "5+", label: "5+ Lines" },
];

export function StepCustomization({ data, updateData, nextStep, prevStep }: StepProps) {
  const isValid = 
    data.wantCallsTransferred && 
    (data.wantCallsTransferred === "no" || data.numberOfTransferLines) &&
    data.scheduleAppointments && 
    (data.scheduleAppointments === "no" || data.appointmentSoftware) &&
    data.hasCrmSoftware && 
    data.launchTimeline && 
    data.bestTimeToConnect &&
    data.expectedMonthlyUsage;

  return (
    <Card className="border-0 shadow-card">
      <CardHeader>
        <CardTitle>Customize your service</CardTitle>
        <CardDescription>
          Tell us how you'd like calls to be handled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="callHandling">How should we handle your calls?</Label>
          <Select
            value={data.callHandling}
            onValueChange={(value) => updateData({ callHandling: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select call handling preference" />
            </SelectTrigger>
            <SelectContent>
              {callHandlingOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Do you want calls transferred to you? *</Label>
          <RadioGroup
            value={data.wantCallsTransferred}
            onValueChange={(value) => updateData({ wantCallsTransferred: value })}
            className="flex gap-4"
          >
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.wantCallsTransferred === "yes" 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="yes" id="transfer-yes" />
              <Label htmlFor="transfer-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.wantCallsTransferred === "no" 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="no" id="transfer-no" />
              <Label htmlFor="transfer-no" className="cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        {data.wantCallsTransferred === "yes" && (
          <>
            <div className="space-y-3">
              <Label>How many phone numbers will you be transferring to us? *</Label>
              <RadioGroup
                value={data.numberOfTransferLines}
                onValueChange={(value) => updateData({ numberOfTransferLines: value })}
                className="grid grid-cols-5 gap-3"
              >
                {numberOfLinesOptions.map((option) => (
                  <div 
                    key={option.value}
                    className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                      data.numberOfTransferLines === option.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={`lines-${option.value}`} />
                    <Label htmlFor={`lines-${option.value}`} className="cursor-pointer text-sm">{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Each phone number requires a separate campaign (e.g., one for Sales, one for Support, one for Billing)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transferNumbers">Transfer Phone Numbers</Label>
              <Textarea
                id="transferNumbers"
                placeholder="e.g., 555-123-4567 - Sales&#10;555-123-4568 - Support&#10;555-123-4569 - Billing"
                value={data.transferNumbers}
                onChange={(e) => updateData({ transferNumbers: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Please list each number with its purpose (Sales, Support, Billing, etc.)
              </p>
            </div>
          </>
        )}

        <div className="space-y-3">
          <Label>Would you like us to schedule/book appointments for you? *</Label>
          <RadioGroup
            value={data.scheduleAppointments}
            onValueChange={(value) => {
              updateData({ scheduleAppointments: value });
              if (value === "no") {
                updateData({ appointmentSoftware: "" });
              }
            }}
            className="flex gap-4"
          >
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.scheduleAppointments === "yes" 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="yes" id="schedule-yes" />
              <Label htmlFor="schedule-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.scheduleAppointments === "no" 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="no" id="schedule-no" />
              <Label htmlFor="schedule-no" className="cursor-pointer">No</Label>
            </div>
          </RadioGroup>
        </div>

        {data.scheduleAppointments === "yes" && (
          <div className="space-y-2">
            <Label htmlFor="appointmentSoftware">What appointment booking software do you use? *</Label>
            <Input
              id="appointmentSoftware"
              placeholder="e.g., Calendly, Acuity, Google Calendar, Zoho Bookings..."
              value={data.appointmentSoftware}
              onChange={(e) => updateData({ appointmentSoftware: e.target.value })}
            />
          </div>
        )}

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
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}>
              <RadioGroupItem value="yes" id="crm-yes" />
              <Label htmlFor="crm-yes" className="cursor-pointer">Yes</Label>
            </div>
            <div className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors flex-1 ${
              data.hasCrmSoftware === "no" 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
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

        <div className="space-y-2">
          <Label htmlFor="businessHours">Your business hours</Label>
          <Select
            value={data.businessHours}
            onValueChange={(value) => updateData({ businessHours: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select business hours" />
            </SelectTrigger>
            <SelectContent>
              {businessHoursOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>When are you looking to launch? *</Label>
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
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={option.value} id={`launch-${option.value}`} />
                <Label htmlFor={`launch-${option.value}`} className="cursor-pointer text-sm">{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

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
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={option.value} id={`time-${option.value}`} />
                <Label htmlFor={`time-${option.value}`} className="cursor-pointer text-sm">{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>What's your expected monthly minute usage? *</Label>
          <RadioGroup
            value={data.expectedMonthlyUsage}
            onValueChange={(value) => updateData({ expectedMonthlyUsage: value })}
            className="grid grid-cols-2 gap-3"
          >
            {expectedUsageOptions.map((option) => (
              <div 
                key={option.value}
                className={`flex items-center space-x-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                  data.expectedMonthlyUsage === option.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={option.value} id={`usage-${option.value}`} />
                <Label htmlFor={`usage-${option.value}`} className="cursor-pointer text-sm">{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialInstructions">
            Special instructions (optional)
          </Label>
          <Textarea
            id="specialInstructions"
            placeholder="Any specific requirements, FAQs, or special handling instructions..."
            value={data.specialInstructions}
            onChange={(e) => updateData({ specialInstructions: e.target.value })}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Maximum 1000 characters
          </p>
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
