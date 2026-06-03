import { PhoneIncoming, UserPlus, AlertTriangle, Calendar, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const callTypeOptions = [
  { id: "new-client", label: "New Client Intake", icon: UserPlus, desc: "First-time callers needing qualification" },
  { id: "existing-client", label: "Existing Client", icon: PhoneIncoming, desc: "Current clients with questions or requests" },
  { id: "emergency", label: "Emergency / After-Hours", icon: AlertTriangle, desc: "Urgent calls requiring immediate dispatch" },
  { id: "scheduling", label: "Appointment Scheduling", icon: Calendar, desc: "Booking, rescheduling, or canceling" },
  { id: "payments", label: "Payments & Billing", icon: CreditCard, desc: "Payment processing and billing inquiries" },
];

interface Props {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function FlowStepSelector({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-heading">What types of calls do you handle?</h3>
      <p className="text-sm text-muted-foreground">Select all that apply</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {callTypeOptions.map(opt => (
          <Card
            key={opt.id}
            className={`cursor-pointer transition-all hover:shadow-soft ${
              selected.includes(opt.id)
                ? "border-2 border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
            onClick={() => toggle(opt.id)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selected.includes(opt.id) ? "bg-primary/15" : "bg-accent"
              }`}>
                <opt.icon className={`w-5 h-5 ${selected.includes(opt.id) ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-heading">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
