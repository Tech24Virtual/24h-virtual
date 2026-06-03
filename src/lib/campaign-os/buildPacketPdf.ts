/**
 * Phase 4 Wave 1 — Build Packet PDF renderer.
 *
 * Client-side jsPDF, mirrors patterns from `src/lib/wl/proposalPdf.ts`.
 * 10 sections; empty sections render an italic "No data" line.
 */
import jsPDF from 'jspdf';
import type { BuildPacketBundle } from '@/hooks/campaign-os/useBuildPacketData';

const PAGE_W = 595; // A4 portrait in pt
const PAGE_H = 842;
const MARGIN_X = 48;
const MARGIN_Y_TOP = 56;
const MARGIN_Y_BOTTOM = 60;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const DEFAULT_PRIMARY = '#0F172A'; // 24H Virtual fallback
const DEFAULT_BRAND_NAME = '24H Virtual';

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'campaign';
}

function hexToRgb(hex: string | null | undefined): [number, number, number] {
  const fallback: [number, number, number] = [15, 23, 42];
  if (!hex) return fallback;
  const h = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function pickTextColor([r, g, b]: [number, number, number]): [number, number, number] {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? [20, 20, 20] : [255, 255, 255];
}

async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('image load failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null;
  }
}

interface RenderCtx {
  doc: jsPDF;
  y: number;
  primary: [number, number, number];
  brandName: string;
}

function ensureSpace(ctx: RenderCtx, needed: number) {
  if (ctx.y + needed > PAGE_H - MARGIN_Y_BOTTOM) {
    ctx.doc.addPage();
    ctx.y = MARGIN_Y_TOP;
  }
}

function sectionHeader(ctx: RenderCtx, title: string) {
  ensureSpace(ctx, 36);
  ctx.doc.setFillColor(...ctx.primary);
  ctx.doc.rect(MARGIN_X, ctx.y, 4, 18, 'F');
  ctx.doc.setTextColor(20, 20, 20);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(13);
  ctx.doc.text(title, MARGIN_X + 12, ctx.y + 14);
  ctx.y += 26;
}

function bodyText(ctx: RenderCtx, text: string, opts: { italic?: boolean; size?: number; color?: [number, number, number] } = {}) {
  const { italic = false, size = 10, color = [40, 40, 40] as [number, number, number] } = opts;
  ctx.doc.setFont('helvetica', italic ? 'italic' : 'normal');
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(...color);
  const lines = ctx.doc.splitTextToSize(text, CONTENT_W);
  for (const line of lines) {
    ensureSpace(ctx, size + 3);
    ctx.doc.text(line, MARGIN_X, ctx.y);
    ctx.y += size + 3;
  }
}

function noData(ctx: RenderCtx) {
  bodyText(ctx, 'No data', { italic: true, color: [120, 120, 120] });
  ctx.y += 4;
}

function kv(ctx: RenderCtx, label: string, value: string) {
  ensureSpace(ctx, 14);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(80, 80, 80);
  ctx.doc.text(label, MARGIN_X, ctx.y);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setTextColor(20, 20, 20);
  const lines = ctx.doc.splitTextToSize(value || '—', CONTENT_W - 130);
  ctx.doc.text(lines, MARGIN_X + 130, ctx.y);
  ctx.y += Math.max(14, lines.length * 12);
}

function drawCover(ctx: RenderCtx, bundle: BuildPacketBundle, logo: { dataUrl: string; w: number; h: number } | null) {
  const { doc, primary, brandName } = ctx;
  // Color band
  doc.setFillColor(...primary);
  doc.rect(0, 0, PAGE_W, 180, 'F');
  const textColor = pickTextColor(primary);
  if (logo) {
    const ratio = logo.w / logo.h;
    const h = 40;
    const w = h * ratio;
    doc.addImage(logo.dataUrl, 'PNG', MARGIN_X, 36, w, h);
  } else {
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(brandName, MARGIN_X, 60);
  }
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(bundle.campaign.display_name, MARGIN_X, 120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${bundle.department.department_name} · ${bundle.department.department_type}`, MARGIN_X, 142);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, MARGIN_X, 158);
  // Tag pill
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(255, 255, 255);
  doc.roundedRect(PAGE_W - MARGIN_X - 150, 36, 150, 22, 11, 11, 'F');
  doc.setTextColor(...primary);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Wave 1 Build Packet', PAGE_W - MARGIN_X - 75, 50, { align: 'center' });
  ctx.y = 210;
}

function drawFooter(ctx: RenderCtx, footerText: string, page: number, total: number) {
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(120, 120, 120);
  ctx.doc.text(footerText, MARGIN_X, PAGE_H - 30);
  ctx.doc.text(`Page ${page} / ${total}`, PAGE_W - MARGIN_X, PAGE_H - 30, { align: 'right' });
}

export async function renderBuildPacketPdf(bundle: BuildPacketBundle): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const brandPrimary = bundle.branding?.primary_color ?? DEFAULT_PRIMARY;
  const brandName = bundle.branding?.brand_label ?? (bundle.campaign.tenant_kind === 'direct_24h' ? DEFAULT_BRAND_NAME : 'Campaign');
  const logoUrl = bundle.branding?.logo_url ?? null;
  const logo = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;

  const ctx: RenderCtx = {
    doc,
    y: MARGIN_Y_TOP,
    primary: hexToRgb(brandPrimary),
    brandName,
  };

  // 1. Cover
  drawCover(ctx, bundle, logo);

  // 2. Account & Contacts
  doc.addPage();
  ctx.y = MARGIN_Y_TOP;
  sectionHeader(ctx, '1. Account & Contacts');
  kv(ctx, 'Account', brandName);
  kv(ctx, 'Support email', bundle.branding?.support_email ?? '—');
  kv(ctx, 'Support phone', bundle.branding?.support_phone ?? '—');
  ctx.y += 8;
  if (bundle.contacts.length === 0) {
    noData(ctx);
  } else {
    for (const c of bundle.contacts) {
      kv(ctx, c.is_primary ? `${c.role} (Primary)` : c.role, `${c.name} · ${c.email ?? '—'} · ${c.phone ?? '—'}`);
    }
  }

  // 3. Department
  ctx.y += 12;
  sectionHeader(ctx, '2. Department');
  kv(ctx, 'Name', bundle.department.department_name);
  kv(ctx, 'Type', bundle.department.department_type);
  kv(ctx, 'Service type', bundle.department.service_type ?? '—');
  kv(ctx, 'Lifecycle', bundle.department.lifecycle);
  kv(ctx, 'Onboarding owner', bundle.department.onboarding_owner ?? '—');
  kv(ctx, 'Supervisor owner', bundle.department.supervisor_owner ?? '—');
  if (bundle.department.notes) {
    ctx.y += 4;
    bodyText(ctx, bundle.department.notes);
  }

  // 4. Phone Numbers
  ctx.y += 12;
  sectionHeader(ctx, '3. Phone Numbers');
  if (bundle.numbers.length === 0) {
    noData(ctx);
  } else {
    for (const n of bundle.numbers) {
      kv(
        ctx,
        n.phone_role,
        `DNIS: ${n.dnis ?? '—'}  ·  ANI: ${n.ani_display ?? '—'}  ·  VM: ${n.voicemail_enabled ? 'Y' : 'N'}  ·  CB: ${n.callback_enabled ? 'Y' : 'N'}`,
      );
    }
  }

  // 5. Intake Fields
  ctx.y += 12;
  sectionHeader(ctx, '4. Intake Fields');
  if (bundle.fields.length === 0) {
    noData(ctx);
  } else {
    const grouped = new Map<string, typeof bundle.fields>();
    for (const f of bundle.fields) {
      const k = f.field_group_id ?? '__ungrouped__';
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(f);
    }
    for (const [, items] of grouped) {
      for (const f of items) {
        kv(ctx, f.display_label + (f.is_required ? ' *' : ''), `${f.field_key} · ${f.field_type} · scope: ${f.scope}`);
      }
      ctx.y += 4;
    }
  }

  // 6. Five9 Mappings
  ctx.y += 12;
  sectionHeader(ctx, '5. Five9 Mappings');
  if (bundle.mappings.length === 0) {
    noData(ctx);
  } else {
    for (const m of bundle.mappings) {
      kv(ctx, m.five9_variable_name, `${m.five9_variable_kind} · ${m.data_type} · ${(m.direction ?? []).join(', ') || '—'} · ${m.is_active ? 'active' : 'inactive'}`);
    }
  }

  // 7. FAQs
  ctx.y += 12;
  sectionHeader(ctx, '6. FAQs (approved)');
  if (bundle.faqs.length === 0) {
    noData(ctx);
  } else {
    for (const f of bundle.faqs) {
      ensureSpace(ctx, 28);
      ctx.doc.setFont('helvetica', 'bold');
      ctx.doc.setFontSize(10);
      ctx.doc.setTextColor(20, 20, 20);
      const qLines = ctx.doc.splitTextToSize(`Q: ${f.question}`, CONTENT_W);
      ctx.doc.text(qLines, MARGIN_X, ctx.y);
      ctx.y += qLines.length * 12 + 2;
      bodyText(ctx, `A: ${f.answer_md}`);
      ctx.y += 4;
    }
  }

  // 8. Policies
  ctx.y += 12;
  sectionHeader(ctx, '7. Policies (approved)');
  if (bundle.policies.length === 0) {
    noData(ctx);
  } else {
    const byKind = new Map<string, typeof bundle.policies>();
    for (const p of bundle.policies) {
      if (!byKind.has(p.policy_kind)) byKind.set(p.policy_kind, []);
      byKind.get(p.policy_kind)!.push(p);
    }
    for (const [kind, items] of byKind) {
      ensureSpace(ctx, 18);
      ctx.doc.setFont('helvetica', 'bold');
      ctx.doc.setFontSize(10);
      ctx.doc.setTextColor(...ctx.primary);
      ctx.doc.text(kind.toUpperCase(), MARGIN_X, ctx.y);
      ctx.y += 14;
      for (const p of items) {
        ensureSpace(ctx, 24);
        ctx.doc.setFont('helvetica', 'bold');
        ctx.doc.setFontSize(10);
        ctx.doc.setTextColor(20, 20, 20);
        const tLines = ctx.doc.splitTextToSize(p.title, CONTENT_W);
        ctx.doc.text(tLines, MARGIN_X, ctx.y);
        ctx.y += tLines.length * 12;
        bodyText(ctx, p.body_md);
        ctx.y += 4;
      }
    }
  }

  // 9. Scenarios
  ctx.y += 12;
  sectionHeader(ctx, '8. Scenarios');
  if (bundle.scenarios.length === 0) {
    noData(ctx);
  } else {
    for (const s of bundle.scenarios) {
      ensureSpace(ctx, 30);
      ctx.doc.setFont('helvetica', 'bold');
      ctx.doc.setFontSize(11);
      ctx.doc.setTextColor(20, 20, 20);
      ctx.doc.text(s.title, MARGIN_X, ctx.y);
      ctx.y += 14;
      kv(ctx, 'Disposition', s.disposition ?? '—');
      kv(ctx, 'Routing', s.routing ?? '—');
      bodyText(ctx, `Trigger: ${s.trigger_md}`);
      bodyText(ctx, `Expected: ${s.expected_outcome_md}`);
      ctx.y += 6;
    }
  }

  // 10. Footer on every page
  const total = doc.getNumberOfPages();
  const footerText = `${brandName} · Build Packet for ${bundle.campaign.display_name}`;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(ctx, footerText, i, total);
  }

  return doc;
}
