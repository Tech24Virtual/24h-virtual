import { PhoneIncoming, ArrowDown, CheckCircle2, ShieldAlert, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FlowConfig } from "@/pages/CallFlowBuilder";

const callTypeLabels: Record<string, string> = {
  "new-client": "New Client Intake",
  "existing-client": "Existing Client",
  "emergency": "Emergency / After-Hours",
  "scheduling": "Appointment Scheduling",
  "payments": "Payments & Billing",
};

interface Props {
  config: FlowConfig;
}

export function FlowPreview({ config }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-heading mb-1">Your Call Flow Preview</h3>
        <p className="text-sm text-muted-foreground">Here's a visual outline of how your calls will be handled.</p>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-6">
          {/* Incoming call */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <PhoneIncoming className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-heading">Incoming Call</p>
              <p className="text-xs text-muted-foreground">Call received and routed to 24H Virtual</p>
            </div>
          </div>

          <div className="flex justify-center py-2">
            <ArrowDown className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Call type routing */}
          <div className="p-4 rounded-xl bg-accent/50 border border-border">
            <p className="font-medium text-heading mb-3">Call Type Identification</p>
            <div className="flex flex-wrap gap-2">
              {config.callTypes.map(ct => (
                <Badge key={ct} variant="secondary">{callTypeLabels[ct] || ct}</Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-center py-2">
            <ArrowDown className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Data capture */}
          {config.rules.dataCapture.length > 0 && (
            <>
              <div className="p-4 rounded-xl bg-accent/30 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Database className="w-4 h-4 text-primary" />
                  <p className="font-medium text-heading">Data Capture</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {config.rules.dataCapture.map(d => (
                    <div key={d} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center py-2">
                <ArrowDown className="w-5 h-5 text-muted-foreground" />
              </div>
            </>
          )}

          {/* Guardrails */}
          {config.rules.promises.length > 0 && (
            <>
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-destructive" />
                  <p className="font-medium text-heading">Guardrails</p>
                </div>
                <div className="space-y-1">
                  {config.rules.promises.map(p => (
                    <p key={p} className="text-sm text-muted-foreground">• {p}</p>
                  ))}
                </div>
              </div>
              <div className="flex justify-center py-2">
                <ArrowDown className="w-5 h-5 text-muted-foreground" />
              </div>
            </>
          )}

          {/* Transfers */}
          <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/20">
            <p className="font-medium text-heading mb-2">Resolution & Transfer</p>
            {config.rules.transfers.length > 0 ? (
              <div className="space-y-1">
                {config.rules.transfers.map(t => (
                  <p key={t} className="text-sm text-muted-foreground">→ {t}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Message taken and delivered</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
