import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const transferOptions = [
  "Transfer to on-call staff",
  "Transfer to specific department",
  "Transfer to voicemail after hours",
  "Warm transfer with context",
];

const promiseOptions = [
  "Never promise pricing or discounts",
  "Never confirm availability without checking",
  "Never share internal policies",
  "Always offer callback within 1 hour",
];

const dataCaptureOptions = [
  "Caller name and phone number",
  "Email address",
  "Reason for calling",
  "Service address / location",
  "Insurance or account number",
  "Urgency level",
];

interface Props {
  rules: { transfers: string[]; promises: string[]; dataCapture: string[] };
  onChange: (rules: { transfers: string[]; promises: string[]; dataCapture: string[] }) => void;
}

export function FlowRuleSelector({ rules, onChange }: Props) {
  const toggle = (key: keyof typeof rules, item: string) => {
    const list = rules[key];
    onChange({
      ...rules,
      [key]: list.includes(item) ? list.filter(i => i !== item) : [...list, item],
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-heading mb-1">Set your call handling rules</h3>
        <p className="text-sm text-muted-foreground mb-4">These rules will be encoded into your call flows.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-heading mb-3">Who gets transfers?</h4>
          <div className="space-y-3">
            {transferOptions.map(opt => (
              <div key={opt} className="flex items-center gap-3">
                <Checkbox id={`t-${opt}`} checked={rules.transfers.includes(opt)} onCheckedChange={() => toggle("transfers", opt)} />
                <Label htmlFor={`t-${opt}`} className="cursor-pointer">{opt}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-heading mb-3">What should agents never promise?</h4>
          <div className="space-y-3">
            {promiseOptions.map(opt => (
              <div key={opt} className="flex items-center gap-3">
                <Checkbox id={`p-${opt}`} checked={rules.promises.includes(opt)} onCheckedChange={() => toggle("promises", opt)} />
                <Label htmlFor={`p-${opt}`} className="cursor-pointer">{opt}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-heading mb-3">What data must be captured?</h4>
          <div className="space-y-3">
            {dataCaptureOptions.map(opt => (
              <div key={opt} className="flex items-center gap-3">
                <Checkbox id={`d-${opt}`} checked={rules.dataCapture.includes(opt)} onCheckedChange={() => toggle("dataCapture", opt)} />
                <Label htmlFor={`d-${opt}`} className="cursor-pointer">{opt}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
