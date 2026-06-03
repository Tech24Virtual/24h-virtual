import jsPDF from 'jspdf';
import type { WLPartnerProposal } from '@/hooks/wl/useWLPartnerProposals';
import type { WLPartnerBranding } from '@/hooks/wl/useWLPartnerBranding';

interface RenderInput {
  proposal: WLPartnerProposal;
  branding: WLPartnerBranding;
}

const PAGE_W = 595; // A4 portrait points (jsPDF default unit = pt)
const MARGIN_X = 48;
const HEADER_H = 88;

function hexToRgb(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const h = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function pickTextColor([r, g, b]: [number, number, number]): [number, number, number] {
  // Luminance-based contrast
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? [20, 20, 20] : [255, 255, 255];
}

async function loadImageAsDataUrl(url: string): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  format: 'PNG' | 'JPEG';
} | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image load failed'));
    });
    img.src = url;
    await loaded;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    return {
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
      format: 'PNG',
    };
  } catch {
    return null;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'draft': return 'Draft';
    case 'sent': return 'Sent';
    case 'viewed': return 'Viewed';
    case 'accepted': return 'Accepted';
    case 'declined': return 'Declined';
    case 'expired': return 'Expired';
    default: return status;
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
}

function fmtAmount(amount: number | null, currency: string | null): string {
  if (amount == null) return '—';
  const num = amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${num}` : num;
}

/**
 * Render a partner-branded proposal PDF.
 * Returns a jsPDF instance; caller decides whether to .save() or .output().
 */
export async function renderProposalPdf({
  proposal,
  branding,
}: RenderInput): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const headerRgb = hexToRgb(branding.primary_color) ?? [30, 30, 30];
  const accentRgb = hexToRgb(branding.accent_color) ?? headerRgb;
  const headerText = pickTextColor(headerRgb);

  const company =
    branding.company_name?.trim() ||
    branding.partner_company_name_fallback?.trim() ||
    'Proposal';

  // ---- Header band ----
  doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');

  let logoPlaced = false;
  if (branding.logo_url) {
    const img = await loadImageAsDataUrl(branding.logo_url);
    if (img) {
      const maxH = 40;
      const ratio = img.width / img.height;
      const h = maxH;
      const w = h * ratio;
      try {
        doc.addImage(img.dataUrl, img.format, MARGIN_X, (HEADER_H - h) / 2, w, h);
        logoPlaced = true;
      } catch {
        logoPlaced = false;
      }
    }
  }

  if (!logoPlaced) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(headerText[0], headerText[1], headerText[2]);
    doc.text(company, MARGIN_X, HEADER_H / 2 + 6);
  }

  // Right-aligned proposal number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(headerText[0], headerText[1], headerText[2]);
  doc.text(proposal.proposal_number, PAGE_W - MARGIN_X, HEADER_H / 2 + 4, {
    align: 'right',
  });

  // ---- Body ----
  let y = HEADER_H + 36;
  doc.setTextColor(20, 20, 20);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(proposal.title, PAGE_W - MARGIN_X * 2);
  doc.text(titleLines, MARGIN_X, y);
  y += titleLines.length * 22 + 12;

  // Accent rule
  doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.setLineWidth(2);
  doc.line(MARGIN_X, y, MARGIN_X + 60, y);
  y += 24;

  // Key/value grid
  const labelColor: [number, number, number] = [120, 120, 120];
  const valueColor: [number, number, number] = [25, 25, 25];

  const drawKV = (label: string, value: string, col: 0 | 1, row: number) => {
    const colW = (PAGE_W - MARGIN_X * 2) / 2;
    const x = MARGIN_X + col * colW;
    const ry = y + row * 44;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text(label.toUpperCase(), x, ry);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    const lines = doc.splitTextToSize(value, colW - 12);
    doc.text(lines, x, ry + 14);
  };

  drawKV('Offering', proposal.offering_name || '—', 0, 0);
  drawKV('Status', statusLabel(proposal.status), 1, 0);
  drawKV('Amount', fmtAmount(proposal.amount, proposal.currency), 0, 1);
  drawKV('Valid until', fmtDate(proposal.valid_until), 1, 1);
  y += 44 * 2 + 16;

  // Recipient (if present)
  if (proposal.last_recipient_name || proposal.last_recipient_email) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text('PREPARED FOR', MARGIN_X, y);
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    const recip = [proposal.last_recipient_name, proposal.last_recipient_email]
      .filter(Boolean)
      .join(' · ');
    doc.text(recip, MARGIN_X, y);
    y += 22;
  }

  // Scope
  if (proposal.scope_summary) {
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(labelColor[0], labelColor[1], labelColor[2]);
    doc.text('SCOPE', MARGIN_X, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    const scopeLines = doc.splitTextToSize(
      proposal.scope_summary,
      PAGE_W - MARGIN_X * 2,
    );
    // Auto-paginate
    const lineH = 15;
    for (const line of scopeLines) {
      if (y > 760) {
        doc.addPage();
        y = MARGIN_X;
      }
      doc.text(line, MARGIN_X, y);
      y += lineH;
    }
    y += 8;
  }

  // Final-state banner
  if (proposal.status === 'accepted' && proposal.accepted_at) {
    if (y > 720) { doc.addPage(); y = MARGIN_X; }
    doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.rect(MARGIN_X, y, PAGE_W - MARGIN_X * 2, 48, 'F');
    const bt = pickTextColor(accentRgb);
    doc.setTextColor(bt[0], bt[1], bt[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ACCEPTED', MARGIN_X + 14, y + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const acceptedBy = proposal.accepted_by_name
      ? `By ${proposal.accepted_by_name} · ${fmtDate(proposal.accepted_at)}`
      : `On ${fmtDate(proposal.accepted_at)}`;
    doc.text(acceptedBy, MARGIN_X + 14, y + 36);
    y += 60;
  } else if (proposal.status === 'declined' && proposal.declined_at) {
    if (y > 720) { doc.addPage(); y = MARGIN_X; }
    doc.setDrawColor(180, 60, 60);
    doc.setLineWidth(1);
    doc.rect(MARGIN_X, y, PAGE_W - MARGIN_X * 2, 32);
    doc.setTextColor(180, 60, 60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Declined on ${fmtDate(proposal.declined_at)}`, MARGIN_X + 12, y + 20);
    y += 44;
  }

  // ---- Footer on every page ----
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = 800;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, fy, PAGE_W - MARGIN_X, fy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const footerLeft = [company, branding.support_email, branding.support_phone]
      .filter(Boolean)
      .join(' · ');
    doc.text(footerLeft, MARGIN_X, fy + 14);
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN_X, fy + 14, {
      align: 'right',
    });
    if (branding.portal_footer_text) {
      const lines = doc.splitTextToSize(
        branding.portal_footer_text,
        PAGE_W - MARGIN_X * 2,
      );
      doc.text(lines.slice(0, 2), MARGIN_X, fy + 28);
    }
  }

  return doc;
}

export async function downloadProposalPdf(input: RenderInput): Promise<void> {
  const doc = await renderProposalPdf(input);
  doc.save(`${input.proposal.proposal_number}.pdf`);
}
