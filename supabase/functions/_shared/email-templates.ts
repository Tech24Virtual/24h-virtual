// Shared branded email templates for all transactional Resend sends.
// Single source of truth used by send functions and the admin preview harness.

export interface Branding {
  brandName: string;
  brandColor: string;
  accentColor: string;
  logoUrl: string | null;
  footerText: string;
  fromName: string;
  fromEmail: string;
  fromAddress: string; // formatted "Name <email>"
  supportEmail: string;
}

const DEFAULT_BRANDING: Branding = {
  brandName: "24H Virtual",
  brandColor: "#0B60B0",
  accentColor: "#40A578",
  logoUrl: null,
  footerText: "Sent by 24H Virtual",
  fromName: "24H Virtual",
  fromEmail: "noreply@24hvirtual.com",
  fromAddress: "24H Virtual <noreply@24hvirtual.com>",
  supportEmail: "hello@24hvirtual.com",
};

/**
 * Resolve branding for a given partner. `partnerId = null` returns 24H defaults.
 * Tolerates missing rows by falling back to defaults silently.
 */
export async function getBrandingForPartner(
  supabase: any,
  partnerId: string | null,
): Promise<Branding> {
  if (!partnerId) return DEFAULT_BRANDING;

  const [{ data: partner }, { data: branding }] = await Promise.all([
    supabase
      .from("white_label_partners")
      .select("company_name, contact_email")
      .eq("id", partnerId)
      .maybeSingle(),
    supabase
      .from("white_label_branding")
      .select(
        "company_name, primary_color, accent_color, logo_url, email_footer, email_from_name, email_from_address, email_reply_to, support_email",
      )
      .eq("partner_id", partnerId)
      .maybeSingle(),
  ]);

  const brandName =
    branding?.company_name || partner?.company_name || DEFAULT_BRANDING.brandName;
  const brandColor = branding?.primary_color || DEFAULT_BRANDING.brandColor;
  const accentColor =
    branding?.accent_color || branding?.primary_color || DEFAULT_BRANDING.accentColor;
  const logoUrl = branding?.logo_url || null;
  const footerText =
    branding?.email_footer || `Sent by ${brandName}`;
  const fromName = branding?.email_from_name || brandName;
  const fromEmail =
    branding?.email_from_address || DEFAULT_BRANDING.fromEmail;
  const supportEmail =
    branding?.support_email || partner?.contact_email || DEFAULT_BRANDING.supportEmail;

  return {
    brandName,
    brandColor,
    accentColor,
    logoUrl,
    footerText,
    fromName,
    fromEmail,
    fromAddress: `${fromName} <${fromEmail}>`,
    supportEmail,
  };
}

interface LayoutOptions {
  branding: Branding;
  preheader?: string;
  bodyHtml: string;
}

/**
 * Bulletproof email shell: tables for layout, inline styles, 600px max-width,
 * dark-mode-safe colors, web-safe fonts. Renders a header with brand color
 * and optional logo, white content area, and a branded footer.
 */
export function renderEmailLayout({ branding, preheader, bodyHtml }: LayoutOptions): string {
  const headerInner = branding.logoUrl
    ? `<img src="${escapeAttr(branding.logoUrl)}" alt="${escapeAttr(branding.brandName)}" height="36" style="display:block;max-height:36px;border:0;outline:none;text-decoration:none;" />`
    : `<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.2px;">${escapeHtml(branding.brandName)}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(branding.brandName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827;">
${preheader ? `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr>
          <td style="background-color:${branding.brandColor};padding:20px 28px;" align="left">
            ${headerInner}
          </td>
        </tr>
        <tr>
          <td style="padding:28px;color:#111827;font-size:15px;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f9fafb;border-top:3px solid ${branding.brandColor};padding:18px 28px;color:#6b7280;font-size:12px;line-height:1.5;" align="center">
            ${escapeHtml(branding.footerText)}<br />
            <span style="color:#9ca3af;">Need help? <a href="mailto:${escapeAttr(branding.supportEmail)}" style="color:${branding.brandColor};text-decoration:none;">${escapeHtml(branding.supportEmail)}</a></span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ============================================================================
// Per-template builders. Each returns { subject, html }.
// All accept optional Branding; fall back to 24H defaults via getBrandingForPartner.
// ============================================================================

export interface RenderedEmail {
  subject: string;
  html: string;
}

export function renderWelcomeEmail(args: {
  branding: Branding;
  recipientName: string;
  ctaUrl?: string;
  ctaLabel?: string;
  intro?: string;
}): RenderedEmail {
  const { branding, recipientName, ctaUrl, ctaLabel, intro } = args;
  const introCopy =
    intro ||
    `Welcome to ${branding.brandName}. Your account is ready and we're excited to have you onboard.`;

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">Welcome, ${escapeHtml(recipientName)} 👋</h1>
    <p style="margin:0 0 20px;color:#374151;">${escapeHtml(introCopy)}</p>
    <p style="margin:0 0 20px;color:#374151;">If you have any questions getting started, just reply to this email — a real person will get back to you.</p>
    ${ctaButton(branding, ctaUrl || "https://24hv.io", ctaLabel || "Open your dashboard")}
  `;
  return {
    subject: `Welcome to ${branding.brandName}`,
    html: renderEmailLayout({
      branding,
      preheader: `Your ${branding.brandName} account is ready.`,
      bodyHtml: body,
    }),
  };
}

export function renderInvoiceEmail(args: {
  branding: Branding;
  recipientName: string;
  invoiceNumber: string;
  amount: string; // already formatted, e.g. "$199.00 USD"
  dueDate?: string;
  invoiceUrl?: string;
}): RenderedEmail {
  const { branding, recipientName, invoiceNumber, amount, dueDate, invoiceUrl } = args;
  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">Invoice ${escapeHtml(invoiceNumber)}</h1>
    <p style="margin:0 0 16px;color:#374151;">Hi ${escapeHtml(recipientName)}, your invoice from ${escapeHtml(branding.brandName)} is ready.</p>
    ${detailBox(branding, [
      { label: "Amount due", value: amount },
      ...(dueDate ? [{ label: "Due", value: dueDate }] : []),
      { label: "Invoice #", value: invoiceNumber },
    ])}
    ${invoiceUrl ? ctaButton(branding, invoiceUrl, "View invoice") : ""}
    <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">Thanks for your business.</p>
  `;
  return {
    subject: `${branding.brandName}: Invoice ${invoiceNumber} — ${amount}`,
    html: renderEmailLayout({
      branding,
      preheader: `Invoice ${invoiceNumber} for ${amount}.`,
      bodyHtml: body,
    }),
  };
}

export function renderPaymentFailedEmail(args: {
  branding: Branding;
  recipientName: string;
  amount: string;
  retryDate?: string;
  updateCardUrl?: string;
}): RenderedEmail {
  const { branding, recipientName, amount, retryDate, updateCardUrl } = args;
  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#b91c1c;">Payment failed</h1>
    <p style="margin:0 0 16px;color:#374151;">Hi ${escapeHtml(recipientName)}, we were unable to process your most recent payment of <strong>${escapeHtml(amount)}</strong> for ${escapeHtml(branding.brandName)}.</p>
    ${detailBox(branding, [
      { label: "Amount", value: amount },
      ...(retryDate ? [{ label: "Next retry", value: retryDate }] : []),
    ])}
    <p style="margin:16px 0 20px;color:#374151;">Updating your payment method takes less than a minute and keeps your service uninterrupted.</p>
    ${updateCardUrl ? ctaButton(branding, updateCardUrl, "Update payment method") : ""}
  `;
  return {
    subject: `Action needed: payment failed (${amount})`,
    html: renderEmailLayout({
      branding,
      preheader: `Update your payment method to keep your service active.`,
      bodyHtml: body,
    }),
  };
}

export function renderTicketReplyEmail(args: {
  branding: Branding;
  recipientName: string;
  ticketNumber: string | number;
  subject: string;
  authorName: string;
  message: string;
  portalUrl?: string;
  isNewTicket?: boolean;
}): RenderedEmail {
  const { branding, recipientName, ticketNumber, subject, authorName, message, portalUrl, isNewTicket } = args;

  const heading = isNewTicket
    ? `New ticket #${ticketNumber}`
    : `Reply on ticket #${ticketNumber}`;

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">${escapeHtml(heading)}</h1>
    <p style="margin:0 0 8px;color:#374151;">Hi ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 16px;color:#374151;"><strong>${escapeHtml(authorName)}</strong> ${isNewTicket ? "opened" : "replied to"} <em>${escapeHtml(subject)}</em>:</p>
    <blockquote style="margin:0 0 20px;padding:14px 16px;border-left:3px solid ${branding.brandColor};background-color:#f9fafb;border-radius:6px;color:#374151;white-space:pre-wrap;">${escapeHtml(message)}</blockquote>
    ${portalUrl ? ctaButton(branding, portalUrl, "View ticket") : ""}
  `;
  return {
    subject: `${branding.brandName}: ${heading} — ${subject}`,
    html: renderEmailLayout({
      branding,
      preheader: `${authorName} ${isNewTicket ? "opened" : "replied to"} ticket #${ticketNumber}.`,
      bodyHtml: body,
    }),
  };
}

export function renderLeadAlertEmail(args: {
  branding: Branding;
  lead: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    service_type?: string;
    source?: string;
    notes?: string;
    plan_minutes?: number;
  };
  sourceLabel?: string;
  adminUrl?: string;
}): RenderedEmail {
  const { branding, lead, sourceLabel, adminUrl } = args;
  const notesPreview = lead.notes ? lead.notes.substring(0, 300) : null;
  const truncated = (lead.notes?.length || 0) > 300;

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: lead.name },
    { label: "Email", value: lead.email },
  ];
  if (lead.phone) rows.push({ label: "Phone", value: lead.phone });
  if (lead.company) rows.push({ label: "Company", value: lead.company });
  if (lead.service_type) rows.push({ label: "Service", value: lead.service_type });
  if (lead.plan_minutes) rows.push({ label: "Plan minutes", value: String(lead.plan_minutes) });

  const body = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;">🔔 New lead received</h1>
    ${sourceLabel ? `<p style="margin:0 0 16px;"><span style="display:inline-block;padding:4px 10px;border-radius:9999px;background-color:#e0f2fe;color:#0369a1;font-size:12px;font-weight:600;">${escapeHtml(sourceLabel)}</span></p>` : ""}
    ${detailBox(branding, rows)}
    ${notesPreview ? `<div style="margin:16px 0;padding:12px 14px;background-color:#f9fafb;border-radius:6px;"><strong style="color:#374151;font-size:13px;">Notes</strong><p style="margin:6px 0 0;color:#374151;white-space:pre-wrap;">${escapeHtml(notesPreview)}${truncated ? "…" : ""}</p></div>` : ""}
    ${adminUrl ? ctaButton(branding, adminUrl, "View lead") : ""}
  `;
  return {
    subject: `New lead: ${lead.name}${sourceLabel ? ` — ${sourceLabel}` : ""}`,
    html: renderEmailLayout({
      branding,
      preheader: `${lead.name} (${lead.email}) just came in.`,
      bodyHtml: body,
    }),
  };
}

export function renderApplicationEmail(args: {
  branding: Branding;
  application: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cover_letter?: string;
  };
  adminUrl?: string;
}): RenderedEmail {
  const { branding, application, adminUrl } = args;
  const coverPreview = application.cover_letter
    ? application.cover_letter.substring(0, 400)
    : null;
  const truncated = (application.cover_letter?.length || 0) > 400;

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: application.name },
    { label: "Email", value: application.email },
  ];
  if (application.phone) rows.push({ label: "Phone", value: application.phone });

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;">📋 New job application</h1>
    ${detailBox(branding, rows)}
    ${coverPreview ? `<div style="margin:16px 0;padding:12px 14px;background-color:#f9fafb;border-radius:6px;"><strong style="color:#374151;font-size:13px;">Cover letter</strong><p style="margin:6px 0 0;color:#374151;white-space:pre-wrap;">${escapeHtml(coverPreview)}${truncated ? "…" : ""}</p></div>` : ""}
    ${adminUrl ? ctaButton(branding, adminUrl, "View application") : ""}
  `;
  return {
    subject: `New job application: ${application.name}`,
    html: renderEmailLayout({
      branding,
      preheader: `${application.name} just applied.`,
      bodyHtml: body,
    }),
  };
}

// ============================================================================
// Template registry — used by preview harness to enumerate options.
// ============================================================================

export const TEMPLATE_KEYS = [
  "welcome",
  "invoice",
  "payment_failed",
  "ticket_reply",
  "lead_alert",
  "application_received",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export function renderTemplate(
  key: TemplateKey,
  branding: Branding,
  sample: Record<string, any>,
): RenderedEmail {
  switch (key) {
    case "welcome":
      return renderWelcomeEmail({
        branding,
        recipientName: sample.recipientName || "Alex",
        ctaUrl: sample.ctaUrl,
        ctaLabel: sample.ctaLabel,
        intro: sample.intro,
      });
    case "invoice":
      return renderInvoiceEmail({
        branding,
        recipientName: sample.recipientName || "Alex",
        invoiceNumber: sample.invoiceNumber || "INV-001",
        amount: sample.amount || "$199.00 USD",
        dueDate: sample.dueDate,
        invoiceUrl: sample.invoiceUrl,
      });
    case "payment_failed":
      return renderPaymentFailedEmail({
        branding,
        recipientName: sample.recipientName || "Alex",
        amount: sample.amount || "$199.00 USD",
        retryDate: sample.retryDate,
        updateCardUrl: sample.updateCardUrl,
      });
    case "ticket_reply":
      return renderTicketReplyEmail({
        branding,
        recipientName: sample.recipientName || "Alex",
        ticketNumber: sample.ticketNumber || "1042",
        subject: sample.subject || "Forwarding number not working",
        authorName: sample.authorName || "Support",
        message: sample.message || "Thanks for reaching out — we've updated your forwarding number and tested it end-to-end.",
        portalUrl: sample.portalUrl,
        isNewTicket: !!sample.isNewTicket,
      });
    case "lead_alert":
      return renderLeadAlertEmail({
        branding,
        lead: {
          id: sample.id || "lead_sample",
          name: sample.name || "Jamie Rivera",
          email: sample.email || "jamie@example.com",
          phone: sample.phone || "+1 555 123 4567",
          company: sample.company || "Acme Co",
          service_type: sample.service_type || "AI Receptionist",
          source: sample.source,
          notes: sample.notes || "Looking for 24/7 coverage on inbound sales calls.",
          plan_minutes: sample.plan_minutes || 500,
        },
        sourceLabel: sample.sourceLabel || "Cost Calculator",
        adminUrl: sample.adminUrl,
      });
    case "application_received":
      return renderApplicationEmail({
        branding,
        application: {
          id: sample.id || "app_sample",
          name: sample.name || "Morgan Lee",
          email: sample.email || "morgan@example.com",
          phone: sample.phone,
          cover_letter:
            sample.cover_letter ||
            "I have 5+ years of customer support experience and would love to join the team.",
        },
        adminUrl: sample.adminUrl,
      });
  }
}

// ============================================================================
// HTML helpers
// ============================================================================

function ctaButton(branding: Branding, href: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
      <tr><td style="background-color:${branding.brandColor};border-radius:6px;">
        <a href="${escapeAttr(href)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">${escapeHtml(label)}</a>
      </td></tr>
    </table>`;
}

function detailBox(branding: Branding, rows: { label: string; value: string }[]): string {
  const items = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px;">${escapeHtml(r.label)}</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:500;">${escapeHtml(r.value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 16px;border-left:3px solid ${branding.brandColor};padding-left:14px;">${items}</table>`;
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
