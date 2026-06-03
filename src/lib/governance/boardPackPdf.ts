/**
 * Phase 26 — Board Pack PDF Rendering
 *
 * Renders the canonical Phase 22 BoardPack bundle into a downloadable PDF.
 * Pure presentation: no re-aggregation, no narrative synthesis. Each
 * section maps 1:1 to the upstream governed source already attached to the
 * BoardPack. Caveats are preserved verbatim.
 */
import jsPDF from "jspdf";
import type { BoardPack, BoardPackSection } from "./boardPack";
import { formatUsd } from "./boardPack";

const MARGIN = 14;
const LINE = 5;

function ensureSpace(doc: jsPDF, y: number, needed = 20): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + needed > ph - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawWrapped(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = ensureSpace(doc, y, LINE);
    doc.text(line, x, y);
    y += LINE;
  }
  return y;
}

function fmtVal(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "—";
    if (Math.abs(v) >= 1000) return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
  }
  if (typeof v === "string") return v.length > 40 ? v.slice(0, 37) + "…" : v;
  if (typeof v === "boolean") return v ? "yes" : "no";
  return JSON.stringify(v).slice(0, 40);
}

function renderTable(doc: jsPDF, rows: any[], y: number, maxWidth: number): number {
  if (!rows.length) {
    y = ensureSpace(doc, y);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("No rows.", MARGIN, y);
    return y + LINE;
  }
  // pick at most 6 representative columns
  const sample = rows[0] && typeof rows[0] === "object" ? rows[0] : { value: rows[0] };
  const allCols = Object.keys(sample);
  const cols = allCols.slice(0, 6);
  const colW = maxWidth / cols.length;

  doc.setFontSize(8);
  doc.setTextColor(60);
  y = ensureSpace(doc, y, LINE * 2);
  cols.forEach((c, i) => doc.text(String(c), MARGIN + i * colW, y));
  y += LINE * 0.6;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, MARGIN + maxWidth, y);
  y += LINE * 0.8;

  doc.setTextColor(30);
  const limit = Math.min(rows.length, 18);
  for (let r = 0; r < limit; r++) {
    y = ensureSpace(doc, y, LINE);
    const row = rows[r] && typeof rows[r] === "object" ? rows[r] : { value: rows[r] };
    cols.forEach((c, i) => doc.text(fmtVal(row[c]), MARGIN + i * colW, y));
    y += LINE;
  }
  if (rows.length > limit) {
    y = ensureSpace(doc, y, LINE);
    doc.setTextColor(120);
    doc.text(`… ${rows.length - limit} more row${rows.length - limit === 1 ? "" : "s"} not shown`, MARGIN, y);
    doc.setTextColor(30);
    y += LINE;
  }
  return y;
}

function renderObject(doc: jsPDF, obj: Record<string, any>, y: number, maxWidth: number): number {
  doc.setFontSize(9);
  const entries = Object.entries(obj).slice(0, 20);
  for (const [k, v] of entries) {
    y = ensureSpace(doc, y, LINE);
    const label = `${k}:`;
    doc.setTextColor(110);
    doc.text(label, MARGIN, y);
    doc.setTextColor(20);
    doc.text(fmtVal(v), MARGIN + 60, y);
    y += LINE;
  }
  return y;
}

function renderSection(doc: jsPDF, s: BoardPackSection, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  const maxWidth = pw - MARGIN * 2;

  y = ensureSpace(doc, y, 30);
  doc.setFontSize(13);
  doc.setTextColor(20, 40, 90);
  doc.text(s.title, MARGIN, y);
  y += LINE * 1.4;

  doc.setFontSize(8);
  doc.setTextColor(120);
  y = drawWrapped(doc, `Source: ${s.source}`, MARGIN, y, maxWidth);
  if (s.caveats.length) {
    y = drawWrapped(doc, `Caveats: ${s.caveats.join(" · ")}`, MARGIN, y, maxWidth);
  }
  y += LINE * 0.4;

  doc.setTextColor(30);
  if (s.data === null || s.data === undefined) {
    doc.setFontSize(9);
    doc.text("No data.", MARGIN, y);
    return y + LINE * 1.5;
  }

  if (s.key === "unit_economics" && s.data && typeof s.data === "object" && "channels" in s.data) {
    doc.setFontSize(10);
    doc.setTextColor(40);
    y = ensureSpace(doc, y, LINE);
    doc.text("Channels", MARGIN, y); y += LINE;
    y = renderTable(doc, s.data.channels ?? [], y, maxWidth);
    y += LINE * 0.6;
    y = ensureSpace(doc, y, LINE);
    doc.text("Direct vs WL", MARGIN, y); y += LINE;
    y = renderTable(doc, s.data.directVsWl ?? [], y, maxWidth);
    return y + LINE;
  }

  if (Array.isArray(s.data)) {
    y = renderTable(doc, s.data, y, maxWidth);
  } else if (typeof s.data === "object") {
    y = renderObject(doc, s.data, y, maxWidth);
  } else {
    doc.setFontSize(9);
    y = drawWrapped(doc, String(s.data), MARGIN, y, maxWidth);
  }
  return y + LINE;
}

export function renderBoardPackPdf(pack: BoardPack): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const maxWidth = pw - MARGIN * 2;

  // Cover
  doc.setFontSize(22);
  doc.setTextColor(0, 95, 180);
  doc.text("Executive Board Pack", MARGIN, 30);

  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text(`Period: ${pack.period_label}`, MARGIN, 40);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date(pack.generated_at).toLocaleString()}`, MARGIN, 47);
  doc.text(`${pack.sections.length} sections · canonical Phase 17–21 sources`, MARGIN, 53);

  let y = 65;
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text("Global Caveats", MARGIN, y);
  y += LINE * 1.2;
  doc.setFontSize(9);
  doc.setTextColor(60);
  for (const c of pack.global_caveats) {
    y = drawWrapped(doc, `• ${c}`, MARGIN, y, maxWidth);
  }

  y += LINE;
  doc.setFontSize(11);
  doc.setTextColor(20);
  y = ensureSpace(doc, y, 10);
  doc.text("Contents", MARGIN, y);
  y += LINE * 1.2;
  doc.setFontSize(9);
  doc.setTextColor(60);
  pack.sections.forEach((s, i) => {
    y = ensureSpace(doc, y, LINE);
    doc.text(`${i + 1}. ${s.title}`, MARGIN, y);
    y += LINE;
  });

  // Sections
  for (const s of pack.sections) {
    doc.addPage();
    renderSection(doc, s, MARGIN + 6);
  }

  // Footer page numbers
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Board Pack · ${pack.period_label} · Page ${p} of ${total}`,
      pw / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: "center" },
    );
  }

  return doc;
}

export function downloadBoardPackPdf(pack: BoardPack, filename: string) {
  const doc = renderBoardPackPdf(pack);
  doc.save(filename);
}

// re-export for convenience
export { formatUsd };
