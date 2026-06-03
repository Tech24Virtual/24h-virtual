import { useState } from "react";
import { DollarSign, CreditCard, FileText, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaymentSettingsProps {
  lead: {
    id: string;
    payment_method_type?: string | null;
    invoice_terms?: string | null;
    payment_method_on_file?: boolean | null;
    country?: string | null;
    billing_currency?: string | null;
  };
  onUpdate: () => void;
}

const invoiceTermsOptions = [
  { value: "net_7", label: "NET 7", days: 7 },
  { value: "net_15", label: "NET 15", days: 15 },
  { value: "net_20", label: "NET 20", days: 20 },
  { value: "net_25", label: "NET 25", days: 25 },
  { value: "net_30", label: "NET 30", days: 30 },
];

export function PaymentSettings({ lead, onUpdate }: PaymentSettingsProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState(
    lead.payment_method_type || "auto_charge"
  );
  const [invoiceTerms, setInvoiceTerms] = useState(lead.invoice_terms || "net_15");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({
          payment_method_type: paymentMethodType,
          invoice_terms: paymentMethodType === "invoice" ? invoiceTerms : null,
        })
        .eq("id", lead.id);

      if (error) throw error;

      toast({
        title: "Payment settings saved",
        description: "Payment configuration updated successfully.",
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currencyLabel = lead.billing_currency?.toUpperCase() || "USD";
  const countryLabel = lead.country === "CA" ? "Canada" : "United States";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment Settings
        </CardTitle>
        <CardDescription>
          Configure how this client is billed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Country & Currency */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Billing Region</p>
            <p className="text-xs text-muted-foreground">
              {countryLabel} • {currencyLabel} billing
            </p>
          </div>
          <Badge variant="secondary">{currencyLabel}</Badge>
        </div>

        {/* Payment Method Type */}
        <div className="space-y-3">
          <Label>Payment Method</Label>
          
          <div 
            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
              paymentMethodType === "auto_charge" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setPaymentMethodType("auto_charge")}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Auto-Charge Credit Card</p>
                <p className="text-sm text-muted-foreground">
                  Card saved on file, charged automatically
                </p>
              </div>
            </div>
            <Switch 
              checked={paymentMethodType === "auto_charge"} 
              onCheckedChange={() => setPaymentMethodType("auto_charge")}
            />
          </div>

          <div 
            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
              paymentMethodType === "invoice" ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setPaymentMethodType("invoice")}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Send Invoice</p>
                <p className="text-sm text-muted-foreground">
                  Client pays invoice within terms
                </p>
              </div>
            </div>
            <Switch 
              checked={paymentMethodType === "invoice"} 
              onCheckedChange={() => setPaymentMethodType("invoice")}
            />
          </div>
        </div>

        {/* Invoice Terms (only show if invoice mode) */}
        {paymentMethodType === "invoice" && (
          <div className="space-y-2">
            <Label>Invoice Terms</Label>
            <Select value={invoiceTerms} onValueChange={setInvoiceTerms}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {invoiceTermsOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({option.days} days)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Client has {invoiceTermsOptions.find(o => o.value === invoiceTerms)?.days} days to pay
            </p>
          </div>
        )}

        {/* Card on File Status */}
        {paymentMethodType === "auto_charge" && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            {lead.payment_method_on_file ? (
              <>
                <CreditCard className="h-4 w-4 text-cta" />
                <span className="text-sm">Card on file</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">
                  No card on file - payment link required
                </span>
              </>
            )}
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? "Saving..." : "Save Payment Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
