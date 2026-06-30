import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Copy, CreditCard, Lock, History } from "lucide-react";

interface ChargeResult {
  success: boolean;
  transaction_id?: string | null;
  response_text?: string;
  card_type?: string;
  card_last_four?: string;
  error?: string;
}

interface VaultResult {
  success: boolean;
  customer_vault_id?: string;
  card_last_four?: string;
  card_type?: string;
  message?: string;
  error?: string;
}

interface VaultChargeResult {
  success: boolean;
  transaction_id?: string | null;
  message?: string;
  error?: string;
}

interface LogEntry {
  ts: string;
  cardType: string;
  lastFour: string;
  amount: string;
  result: "Approved" | "Declined" | "Error";
  transactionId?: string | null;
}

const TEST_CARDS = [
  {
    label: "Visa (Approved)",
    number: "4111111111111111",
    expiry: "12/28",
    cvv: "999",
    expected: "Approved" as const,
  },
  {
    label: "Mastercard (Approved)",
    number: "5431111111111111",
    expiry: "12/28",
    cvv: "999",
    expected: "Approved" as const,
  },
  {
    label: "Visa (Declined)",
    number: "4111111111111112",
    expiry: "12/28",
    cvv: "999",
    expected: "Declined" as const,
  },
  {
    label: "Amex (Approved)",
    number: "341111111111111",
    expiry: "12/28",
    cvv: "9997",
    expected: "Approved" as const,
  },
] as const;

function detectCardType(num: string): string {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  return "Card";
}

function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function ResultBox({ result }: { result: { success: boolean; message: string } }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
        result.success
          ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
      }`}
    >
      {result.success ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{result.message}</span>
    </div>
  );
}

export default function NmiPaymentTest() {
  const [charge, setCharge] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    amount: "99.00",
    firstName: "",
    lastName: "",
  });
  const [isCharging, setIsCharging] = useState(false);
  const [chargeResult, setChargeResult] = useState<ChargeResult | null>(null);

  const [vault, setVault] = useState({
    leadId: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    firstName: "",
    lastName: "",
  });
  const [isAddingVault, setIsAddingVault] = useState(false);
  const [vaultResult, setVaultResult] = useState<VaultResult | null>(null);
  const [vaultChargeAmount, setVaultChargeAmount] = useState("99.00");
  const [isChargingVault, setIsChargingVault] = useState(false);
  const [vaultChargeResult, setVaultChargeResult] = useState<VaultChargeResult | null>(null);

  const [log, setLog] = useState<LogEntry[]>([]);

  function addToLog(entry: LogEntry) {
    setLog((prev) => [entry, ...prev].slice(0, 5));
  }

  async function handleTestCharge() {
    if (!charge.cardNumber || !charge.expiry || !charge.cvv || !charge.amount) {
      toast.error("Card number, expiry, CVV, and amount are required");
      return;
    }
    setIsCharging(true);
    setChargeResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("nmi-test-charge", {
        body: {
          card_number: charge.cardNumber.replace(/\D/g, ""),
          card_expiry: charge.expiry,
          card_cvv: charge.cvv,
          amount: parseFloat(charge.amount),
          first_name: charge.firstName,
          last_name: charge.lastName,
        },
      });
      if (error) {
        const msg = error.message || "Request failed";
        setChargeResult({ success: false, error: msg });
        addToLog({
          ts: new Date().toLocaleTimeString(),
          cardType: detectCardType(charge.cardNumber),
          lastFour: charge.cardNumber.replace(/\D/g, "").slice(-4),
          amount: charge.amount,
          result: "Error",
        });
      } else {
        setChargeResult(data as ChargeResult);
        addToLog({
          ts: new Date().toLocaleTimeString(),
          cardType: (data as ChargeResult).card_type || detectCardType(charge.cardNumber),
          lastFour:
            (data as ChargeResult).card_last_four ||
            charge.cardNumber.replace(/\D/g, "").slice(-4),
          amount: charge.amount,
          result: (data as ChargeResult).success ? "Approved" : "Declined",
          transactionId: (data as ChargeResult).transaction_id,
        });
      }
    } catch (err) {
      setChargeResult({ success: false, error: String(err) });
    } finally {
      setIsCharging(false);
    }
  }

  async function handleVaultAdd() {
    if (!vault.leadId || !vault.cardNumber || !vault.expiry || !vault.cvv) {
      toast.error("Lead ID and card details are required");
      return;
    }
    setIsAddingVault(true);
    setVaultResult(null);
    setVaultChargeResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("nmi-vault-add", {
        body: {
          lead_id: vault.leadId,
          card_number: vault.cardNumber.replace(/\D/g, ""),
          card_expiry: vault.expiry,
          card_cvv: vault.cvv,
          first_name: vault.firstName,
          last_name: vault.lastName,
        },
      });
      if (error) {
        let msg = error.message || "Request failed";
        const httpError = error as { context?: Response };
        if (httpError.context) {
          try {
            const body = (await httpError.context.json()) as {
              message?: string;
              error?: string;
            };
            msg = body?.message || body?.error || msg;
          } catch {
            // ignore parse errors
          }
        }
        setVaultResult({ success: false, error: msg });
      } else {
        setVaultResult(data as VaultResult);
        if ((data as VaultResult).success) {
          addToLog({
            ts: new Date().toLocaleTimeString(),
            cardType:
              (data as VaultResult).card_type || detectCardType(vault.cardNumber),
            lastFour:
              (data as VaultResult).card_last_four ||
              vault.cardNumber.replace(/\D/g, "").slice(-4),
            amount: "—",
            result: "Approved",
            transactionId: `vault:${(data as VaultResult).customer_vault_id}`,
          });
        }
      }
    } catch (err) {
      setVaultResult({ success: false, error: String(err) });
    } finally {
      setIsAddingVault(false);
    }
  }

  async function handleVaultCharge() {
    if (!vault.leadId || !vaultChargeAmount) {
      toast.error("Lead ID and amount are required");
      return;
    }
    setIsChargingVault(true);
    setVaultChargeResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("nmi-charge", {
        body: {
          lead_id: vault.leadId,
          amount: parseFloat(vaultChargeAmount),
          description: "NMI sandbox test charge",
        },
      });
      if (error) {
        setVaultChargeResult({
          success: false,
          error: error.message || "Request failed",
        });
      } else {
        setVaultChargeResult(data as VaultChargeResult);
        addToLog({
          ts: new Date().toLocaleTimeString(),
          cardType: vaultResult?.card_type || "Vault",
          lastFour: vaultResult?.card_last_four || "????",
          amount: vaultChargeAmount,
          result: (data as VaultChargeResult).success ? "Approved" : "Declined",
          transactionId: (data as VaultChargeResult).transaction_id,
        });
      }
    } catch (err) {
      setVaultChargeResult({ success: false, error: String(err) });
    } finally {
      setIsChargingVault(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  }

  function prefillSection1(card: (typeof TEST_CARDS)[number]) {
    setCharge((prev) => ({ ...prev, cardNumber: card.number, expiry: card.expiry, cvv: card.cvv }));
    toast.success(`${card.label} prefilled in Section 1`);
  }

  function prefillSection2(card: (typeof TEST_CARDS)[number]) {
    setVault((prev) => ({ ...prev, cardNumber: card.number, expiry: card.expiry, cvv: card.cvv }));
    toast.success(`${card.label} prefilled in Section 2`);
  }

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <h1 className="text-2xl font-bold">NMI Payment Gateway Test</h1>
        <p className="text-muted-foreground mt-1">
          Validate the payment gateway end-to-end without affecting real accounts.
        </p>
      </div>

      {/* Sandbox banner */}
      <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        <span className="text-xl" role="img" aria-label="test tube">🧪</span>
        <span className="font-semibold">Sandbox Mode — No real charges will be made</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Section 1: Direct Card Charge */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Test a Card Charge
            </CardTitle>
            <CardDescription>
              Runs a direct sale through NMI with no vault storage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="c-number">Card Number</Label>
                <Input
                  id="c-number"
                  placeholder="4111111111111111"
                  value={charge.cardNumber}
                  onChange={(e) =>
                    setCharge({ ...charge, cardNumber: e.target.value })
                  }
                  maxLength={19}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-expiry">Expiry (MM/YY)</Label>
                <Input
                  id="c-expiry"
                  placeholder="12/28"
                  value={charge.expiry}
                  onChange={(e) =>
                    setCharge({ ...charge, expiry: formatExpiry(e.target.value) })
                  }
                  maxLength={5}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-cvv">CVV</Label>
                <Input
                  id="c-cvv"
                  placeholder="999"
                  value={charge.cvv}
                  onChange={(e) =>
                    setCharge({
                      ...charge,
                      cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-first">First Name</Label>
                <Input
                  id="c-first"
                  placeholder="John"
                  value={charge.firstName}
                  onChange={(e) => setCharge({ ...charge, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-last">Last Name</Label>
                <Input
                  id="c-last"
                  placeholder="Doe"
                  value={charge.lastName}
                  onChange={(e) => setCharge({ ...charge, lastName: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="c-amount">Amount (USD)</Label>
                <Input
                  id="c-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="99.00"
                  value={charge.amount}
                  onChange={(e) => setCharge({ ...charge, amount: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={handleTestCharge} disabled={isCharging} className="w-full">
              {isCharging ? "Processing..." : "Run Test Charge"}
            </Button>

            {chargeResult && (
              <ResultBox
                result={{
                  success: chargeResult.success,
                  message: chargeResult.success
                    ? `✅ Approved — Transaction ID: ${chargeResult.transaction_id}`
                    : `❌ Declined — ${chargeResult.response_text || chargeResult.error}`,
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Section 2: Customer Vault */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Test Customer Vault
            </CardTitle>
            <CardDescription>
              Store a card in NMI's Customer Vault, then charge by vault token.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="v-lead">
                  Lead ID{" "}
                  <span className="font-normal text-muted-foreground">
                    (card stored against this lead)
                  </span>
                </Label>
                <Input
                  id="v-lead"
                  placeholder="Paste a lead UUID..."
                  value={vault.leadId}
                  onChange={(e) => setVault({ ...vault, leadId: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="v-number">Card Number</Label>
                <Input
                  id="v-number"
                  placeholder="4111111111111111"
                  value={vault.cardNumber}
                  onChange={(e) => setVault({ ...vault, cardNumber: e.target.value })}
                  maxLength={19}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-expiry">Expiry (MM/YY)</Label>
                <Input
                  id="v-expiry"
                  placeholder="12/28"
                  value={vault.expiry}
                  onChange={(e) =>
                    setVault({ ...vault, expiry: formatExpiry(e.target.value) })
                  }
                  maxLength={5}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-cvv">CVV</Label>
                <Input
                  id="v-cvv"
                  placeholder="999"
                  value={vault.cvv}
                  onChange={(e) =>
                    setVault({
                      ...vault,
                      cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  maxLength={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-first">First Name</Label>
                <Input
                  id="v-first"
                  placeholder="John"
                  value={vault.firstName}
                  onChange={(e) => setVault({ ...vault, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-last">Last Name</Label>
                <Input
                  id="v-last"
                  placeholder="Doe"
                  value={vault.lastName}
                  onChange={(e) => setVault({ ...vault, lastName: e.target.value })}
                />
              </div>
            </div>

            <Button
              onClick={handleVaultAdd}
              disabled={isAddingVault}
              variant="outline"
              className="w-full"
            >
              {isAddingVault ? "Adding to Vault..." : "Add to Vault"}
            </Button>

            {vaultResult && (
              <ResultBox
                result={{
                  success: vaultResult.success,
                  message: vaultResult.success
                    ? `✅ Vault ID: ${vaultResult.customer_vault_id}`
                    : `❌ Error: ${vaultResult.message || vaultResult.error}`,
                }}
              />
            )}

            {vaultResult?.success && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Card stored. Charge the vault:
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="vc-amount">Charge Amount (USD)</Label>
                  <Input
                    id="vc-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={vaultChargeAmount}
                    onChange={(e) => setVaultChargeAmount(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleVaultCharge}
                  disabled={isChargingVault}
                  className="w-full"
                >
                  {isChargingVault ? "Charging..." : "Charge Vault"}
                </Button>

                {vaultChargeResult && (
                  <ResultBox
                    result={{
                      success: vaultChargeResult.success,
                      message: vaultChargeResult.success
                        ? `✅ Approved — Transaction ID: ${vaultChargeResult.transaction_id}`
                        : `❌ Declined — ${vaultChargeResult.message || vaultChargeResult.error}`,
                    }}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Test Cards Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Test Cards Reference</CardTitle>
          <CardDescription>
            NMI sandbox test cards. Click a number to copy, or use the prefill buttons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card Type</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>CVV</TableHead>
                <TableHead>Expected Result</TableHead>
                <TableHead className="text-right">Prefill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEST_CARDS.map((card) => (
                <TableRow key={card.number}>
                  <TableCell className="font-medium">{card.label}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => copyToClipboard(card.number)}
                      className="flex items-center gap-1.5 rounded px-1 transition-colors hover:bg-accent"
                      title="Copy card number"
                    >
                      <code className="font-mono text-xs">{card.number}</code>
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs">{card.expiry}</code>
                  </TableCell>
                  <TableCell>
                    <code className="font-mono text-xs">{card.cvv}</code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={card.expected === "Approved" ? "default" : "destructive"}
                      className={
                        card.expected === "Approved"
                          ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300"
                          : ""
                      }
                    >
                      {card.expected}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => prefillSection1(card)}>
                        §1
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => prefillSection2(card)}>
                        §2
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 4: Transaction Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction Log
          </CardTitle>
          <CardDescription>
            Last 5 test transactions this session — cleared on page refresh.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {log.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No transactions yet. Run a test charge above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Card Type</TableHead>
                  <TableHead>Last 4</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Transaction ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log.map((entry, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.ts}
                    </TableCell>
                    <TableCell>{entry.cardType}</TableCell>
                    <TableCell>
                      <code className="font-mono text-sm">••••{entry.lastFour}</code>
                    </TableCell>
                    <TableCell>
                      {entry.amount !== "—"
                        ? `$${parseFloat(entry.amount).toFixed(2)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.result === "Approved"
                            ? "default"
                            : entry.result === "Declined"
                            ? "destructive"
                            : "outline"
                        }
                        className={
                          entry.result === "Approved"
                            ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300"
                            : ""
                        }
                      >
                        {entry.result}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.transactionId ? (
                        <code className="font-mono text-xs">{entry.transactionId}</code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
