export const NMI_API_URL = "https://secure.nmi.com/api/transact.php";

export function parseNmiResponse(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(text).entries()) {
    result[key] = value;
  }
  return result;
}

export function deriveCardType(cardNumber: string): string {
  const num = cardNumber.replace(/\D/g, "");
  if (/^4/.test(num)) return "Visa";
  if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "Amex";
  if (/^6(?:011|5)/.test(num)) return "Discover";
  return "Card";
}

export interface NmiChargeResult {
  success: boolean;
  transaction_id?: string;
  message: string;
  response_code?: string;
}

/**
 * Charge a stored Customer Vault record directly via the NMI API.
 * Use this from server-side code (edge functions) only — never client-side.
 * Pass order_id (lead UUID) so the nmi-webhook can round-trip the lead identity.
 */
export async function nmiDirectCharge(opts: {
  nmiKey: string;
  customerVaultId: string;
  amount: number;
  currency: string;
  description: string;
  order_id?: string;
}): Promise<NmiChargeResult> {
  const params = new URLSearchParams({
    security_key: opts.nmiKey,
    type: "sale",
    customer_vault_id: opts.customerVaultId,
    amount: opts.amount.toFixed(2),
    currency: opts.currency.toLowerCase(),
    order_description: opts.description,
  });
  if (opts.order_id) {
    params.set("order_id", opts.order_id);
  }

  const res = await fetch(NMI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = parseNmiResponse(await res.text());

  return {
    success: data.response === "1",
    transaction_id: data.transactionid || undefined,
    message: data.responsetext || (data.response === "1" ? "Approved" : "Declined"),
    response_code: data.response_code,
  };
}
