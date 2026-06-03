/**
 * Helpers for generating DNS instructions and validating partner-provided hostnames
 * for the WL custom domain feature.
 */

export const LOVABLE_A_RECORD_TARGET = "185.158.133.1";
export const LOVABLE_CNAME_TARGET = "virtual-rep.lovable.app";

export interface DnsRecord {
  type: "CNAME" | "A" | "TXT";
  host: string;
  value: string;
  note?: string;
}

export interface DnsInstructionPayload {
  hostname: string;
  isApex: boolean;
  records: DnsRecord[];
}

/**
 * Return the host portion (subdomain label) of a hostname.
 * Example: portal.acmevoice.com → "portal"
 *          acmevoice.com        → "@" (apex)
 */
export function getHostLabel(hostname: string): string {
  const parts = hostname.split(".");
  if (parts.length <= 2) return "@";
  return parts.slice(0, parts.length - 2).join(".");
}

export function isApexDomain(hostname: string): boolean {
  return hostname.split(".").length === 2;
}

/**
 * Build the DNS records a partner needs to add for a given hostname.
 * Subdomains use CNAME → virtual-rep.lovable.app
 * Apex domains use A → 185.158.133.1
 */
export function buildDnsInstructions(hostname: string): DnsInstructionPayload {
  const apex = isApexDomain(hostname);
  const host = getHostLabel(hostname);

  const records: DnsRecord[] = apex
    ? [
        {
          type: "A",
          host: "@",
          value: LOVABLE_A_RECORD_TARGET,
          note: "Required for apex (root) domains",
        },
      ]
    : [
        {
          type: "CNAME",
          host,
          value: LOVABLE_CNAME_TARGET,
          note: "Points your subdomain to our edge",
        },
      ];

  return { hostname, isApex: apex, records };
}

export interface HostnameValidation {
  valid: boolean;
  error?: string;
  normalized?: string;
}

const HOSTNAME_REGEX = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/**
 * Validate a partner hostname input.
 * - Trims and lowercases
 * - Must contain at least one dot
 * - Must match a basic hostname regex
 * - Rejects bare apex unless allowApex is true
 * - Strips protocol and trailing slashes if present
 */
export function validateHostname(
  raw: string,
  opts: { allowApex?: boolean } = {},
): HostnameValidation {
  if (!raw || typeof raw !== "string") {
    return { valid: false, error: "Please enter a domain." };
  }

  let value = raw.trim().toLowerCase();
  // strip protocol
  value = value.replace(/^https?:\/\//, "");
  // strip path / trailing slash
  value = value.split("/")[0];
  // strip port
  value = value.split(":")[0];

  if (!value.includes(".")) {
    return { valid: false, error: "Domain must include a dot, e.g. portal.example.com" };
  }

  if (!HOSTNAME_REGEX.test(value)) {
    return { valid: false, error: "Invalid characters or format. Use letters, numbers, dots, and hyphens." };
  }

  if (isApexDomain(value) && !opts.allowApex) {
    return {
      valid: false,
      error: "Please use a subdomain like portal.example.com (apex domains aren't supported here).",
    };
  }

  return { valid: true, normalized: value };
}

export type CnameStatus = "pending" | "verifying" | "active" | "verified" | "failed" | "error";

export function describeStatus(status: string | null | undefined) {
  switch (status) {
    case "active":
    case "verified":
      return { label: "Connected", tone: "success" as const };
    case "verifying":
      return { label: "Verifying…", tone: "info" as const };
    case "failed":
    case "error":
      return { label: "Verification failed", tone: "error" as const };
    case "pending":
    default:
      return { label: "Pending DNS setup", tone: "muted" as const };
  }
}
