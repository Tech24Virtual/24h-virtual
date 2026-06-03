import { jsPDF } from "jspdf";
import logoBlue from "@/assets/logos/logo-blue.png";
import logoWhite from "@/assets/logos/logo-white.png";

export interface CalculatorReportData {
  // User inputs
  callVolume: number;
  avgDuration: number;
  currentCost: number;
  serviceType: string;
  serviceName: string;
  isAnnual: boolean;
  // Calculated results
  monthlyMinutes: number;
  recommendedTierMinutes: number;
  tierPrice: number;
  overage: number;
  totalMonthlyCost: number;
  monthlySavings: number;
  annualSavings: number;
  roi: number;
  overageRate: number;
  // Lead info
  name: string;
  company: string;
}

const PDF_CONFIG = {
  pageWidth: 210,
  pageHeight: 297,
  margins: { top: 25, bottom: 25, left: 20, right: 20 },
  colors: {
    primary: "#005FB4",
    secondary: "#AD5E80",
    cta: "#E74A3E",
    text: "#1e293b",
    muted: "#64748b",
    lightBg: "#f8fafc",
    successBg: "#dcfce7",
    successText: "#166534",
  },
  lineHeight: 6,
};

const loadLogosAsBase64 = async (): Promise<{ blue: string; white: string }> => {
  const [blueResponse, whiteResponse] = await Promise.all([
    fetch(logoBlue),
    fetch(logoWhite),
  ]);

  const [blueBlob, whiteBlob] = await Promise.all([
    blueResponse.blob(),
    whiteResponse.blob(),
  ]);

  const toBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const [blue, white] = await Promise.all([
    toBase64(blueBlob),
    toBase64(whiteBlob),
  ]);

  return { blue, white };
};

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

const formatCurrency = (value: number): string =>
  value >= 1000 ? `$${value.toLocaleString()}` : `$${value}`;

const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
  const { pageWidth, pageHeight, margins, colors } = PDF_CONFIG;
  const footerY = pageHeight - 10;

  doc.setDrawColor(...hexToRgb(colors.muted));
  doc.setLineWidth(0.3);
  doc.line(margins.left, footerY - 5, pageWidth - margins.right, footerY - 5);

  doc.setFontSize(9);
  doc.setTextColor(...hexToRgb(colors.muted));
  doc.text(`Page ${pageNumber} of ${totalPages}`, margins.left, footerY);
  doc.text("24hv.io", pageWidth - margins.right, footerY, { align: "right" });
};

export const generateCalculatorReport = async (data: CalculatorReportData): Promise<void> => {
  const { pageWidth, margins, colors } = PDF_CONFIG;
  const contentWidth = pageWidth - margins.left - margins.right;

  const logos = await loadLogosAsBase64();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // ==================== PAGE 1: COVER ====================

  // Top accent bar
  doc.setFillColor(...hexToRgb(colors.primary));
  doc.rect(0, 0, pageWidth, 8, "F");

  // Logo
  doc.addImage(logos.blue, "PNG", (pageWidth - 60) / 2, 40, 60, 16);

  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(colors.muted));
  doc.setFont("helvetica", "normal");
  doc.text("Professional Virtual Receptionist Services", pageWidth / 2, 62, { align: "center" });

  // Decorative line
  doc.setDrawColor(...hexToRgb(colors.primary));
  doc.setLineWidth(1);
  doc.line(60, 74, pageWidth - 60, 74);

  // Badge
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(colors.secondary));
  doc.setFont("helvetica", "bold");
  doc.text("PERSONALIZED SAVINGS REPORT", pageWidth / 2, 94, { align: "center" });

  // Title
  doc.setFontSize(28);
  doc.setTextColor(...hexToRgb(colors.text));
  doc.setFont("helvetica", "bold");
  doc.text("Your Cost Savings", pageWidth / 2, 118, { align: "center" });
  doc.text("Analysis", pageWidth / 2, 130, { align: "center" });

  // Subtitle
  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb(colors.muted));
  doc.setFont("helvetica", "normal");
  doc.text(`Prepared for ${data.name}`, pageWidth / 2, 150, { align: "center" });
  if (data.company) {
    doc.text(data.company, pageWidth / 2, 158, { align: "center" });
  }

  // Date
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageWidth / 2, 172, { align: "center" });

  // Bottom section
  doc.setFillColor(...hexToRgb(colors.lightBg));
  doc.rect(0, 250, pageWidth, 47, "F");

  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(colors.text));
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOM ROI ANALYSIS", pageWidth / 2, 265, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(colors.primary));
  doc.setFont("helvetica", "normal");
  doc.text("24hv.io", pageWidth / 2, 275, { align: "center" });

  // Bottom accent bar
  doc.setFillColor(...hexToRgb(colors.secondary));
  doc.rect(0, 289, pageWidth, 8, "F");

  // ==================== PAGE 2: YOUR INPUTS & RESULTS ====================

  doc.addPage();
  let y = margins.top;

  // Header
  doc.addImage(logos.blue, "PNG", margins.left, 8, 30, 8);
  doc.setDrawColor(...hexToRgb(colors.primary));
  doc.setLineWidth(0.5);
  doc.line(margins.left, 18, pageWidth - margins.right, 18);
  y = 28;

  // Section: Your Business Profile
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(colors.primary));
  doc.setFont("helvetica", "bold");
  doc.text("Your Business Profile", margins.left, y);
  y += 3;
  doc.setLineWidth(0.5);
  doc.line(margins.left, y, margins.left + 60, y);
  y += 10;

  const inputRows = [
    ["Monthly Call Volume", `${data.callVolume} calls`],
    ["Average Call Duration", `${data.avgDuration} minutes`],
    ["Estimated Monthly Minutes", `${data.monthlyMinutes} minutes`],
    ["Current Monthly Cost", formatCurrency(data.currentCost)],
    ["Selected Service", data.serviceName],
    ["Billing Cycle", data.isAnnual ? "Annual (10% discount)" : "Monthly"],
  ];

  doc.setFontSize(11);
  inputRows.forEach(([label, value]) => {
    doc.setTextColor(...hexToRgb(colors.muted));
    doc.setFont("helvetica", "normal");
    doc.text(label, margins.left + 5, y);
    doc.setTextColor(...hexToRgb(colors.text));
    doc.setFont("helvetica", "bold");
    doc.text(value, pageWidth - margins.right - 5, y, { align: "right" });
    y += 8;
  });

  y += 10;

  // Section: Recommended Plan
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(colors.primary));
  doc.setFont("helvetica", "bold");
  doc.text("Recommended Plan", margins.left, y);
  y += 3;
  doc.line(margins.left, y, margins.left + 60, y);
  y += 10;

  // Plan box
  doc.setFillColor(...hexToRgb(colors.lightBg));
  doc.roundedRect(margins.left, y, contentWidth, 40, 3, 3, "F");

  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(colors.text));
  doc.setFont("helvetica", "bold");
  doc.text(`${data.serviceName} — ${data.recommendedTierMinutes} Minutes`, margins.left + 8, y + 12);

  doc.setFontSize(22);
  doc.setTextColor(...hexToRgb(colors.primary));
  doc.text(`${formatCurrency(data.tierPrice)}/mo`, margins.left + 8, y + 28);

  if (data.overage > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb(colors.muted));
    doc.setFont("helvetica", "normal");
    doc.text(`+ ${formatCurrency(data.overage)} estimated overage (${formatCurrency(data.overageRate)}/min)`, margins.left + 8, y + 36);
  }

  y += 50;

  // Section: Savings Summary
  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(colors.primary));
  doc.setFont("helvetica", "bold");
  doc.text("Your Savings Summary", margins.left, y);
  y += 3;
  doc.line(margins.left, y, margins.left + 60, y);
  y += 10;

  // Savings highlight box
  doc.setFillColor(...hexToRgb(colors.successBg));
  doc.setDrawColor(...hexToRgb(colors.successText));
  doc.setLineWidth(0.5);
  doc.roundedRect(margins.left, y, contentWidth, 50, 3, 3, "FD");

  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb(colors.successText));
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATED SAVINGS", margins.left + 8, y + 10);

  const savingsCol1X = margins.left + 8;
  const savingsCol2X = margins.left + contentWidth / 3 + 8;
  const savingsCol3X = margins.left + (contentWidth * 2) / 3 + 8;

  doc.setFontSize(22);
  doc.text(formatCurrency(data.monthlySavings), savingsCol1X, y + 28);
  doc.text(formatCurrency(data.annualSavings), savingsCol2X, y + 28);
  doc.text(`${data.roi}%`, savingsCol3X, y + 28);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Monthly Savings", savingsCol1X, y + 36);
  doc.text("Annual Savings", savingsCol2X, y + 36);
  doc.text("Cost Reduction", savingsCol3X, y + 36);

  y += 60;

  // Total cost comparison
  const comparisonRows = [
    ["Your current monthly cost", formatCurrency(data.currentCost)],
    ["24H Virtual monthly cost", formatCurrency(data.totalMonthlyCost)],
    ["You save every month", formatCurrency(data.monthlySavings)],
    ["You save every year", formatCurrency(data.annualSavings)],
  ];

  doc.setFontSize(11);
  comparisonRows.forEach(([label, value], index) => {
    const isLast = index >= 2;
    doc.setTextColor(...hexToRgb(isLast ? colors.successText : colors.text));
    doc.setFont("helvetica", isLast ? "bold" : "normal");
    doc.text(label, margins.left + 5, y);
    doc.text(value, pageWidth - margins.right - 5, y, { align: "right" });
    y += 8;
  });

  // ==================== PAGE 3: HIDDEN COST BREAKDOWN ====================

  doc.addPage();
  y = margins.top;

  doc.addImage(logos.blue, "PNG", margins.left, 8, 30, 8);
  doc.setDrawColor(...hexToRgb(colors.primary));
  doc.setLineWidth(0.5);
  doc.line(margins.left, 18, pageWidth - margins.right, 18);
  y = 28;

  doc.setFontSize(16);
  doc.setTextColor(...hexToRgb(colors.primary));
  doc.setFont("helvetica", "bold");
  doc.text("The Hidden Cost of In-House Reception", margins.left, y);
  y += 3;
  doc.line(margins.left, y, margins.left + 80, y);
  y += 10;

  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(colors.text));
  doc.setFont("helvetica", "normal");
  const introLines = doc.splitTextToSize(
    "When you hire an in-house receptionist, the actual cost goes far beyond their salary. Here's what most businesses overlook:",
    contentWidth
  );
  introLines.forEach((line: string) => {
    doc.text(line, margins.left, y);
    y += 6;
  });
  y += 6;

  const hiddenCosts = [
    { item: "Base Salary (Receptionist)", cost: "$35,000 – $45,000/yr", note: "National average" },
    { item: "Benefits (Health, Dental, Vision)", cost: "$8,000 – $15,000/yr", note: "20-30% of salary" },
    { item: "Payroll Taxes (FICA, UI)", cost: "$3,500 – $5,000/yr", note: "~10% of salary" },
    { item: "Paid Time Off / Sick Days", cost: "$2,500 – $4,000/yr", note: "15-20 days average" },
    { item: "Training & Onboarding", cost: "$2,000 – $5,000/yr", note: "Initial + ongoing" },
    { item: "Equipment & Software", cost: "$1,000 – $3,000/yr", note: "Phone system, desk, etc." },
    { item: "Coverage Gaps (Breaks, Lunch, After Hours)", cost: "Missed Calls", note: "Lost revenue" },
    { item: "Turnover Cost (Avg 18 months)", cost: "$5,000 – $10,000", note: "Recruiting + rehiring" },
  ];

  // Table header
  doc.setFillColor(...hexToRgb(colors.primary));
  doc.rect(margins.left, y, contentWidth, 8, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Cost Item", margins.left + 4, y + 5.5);
  doc.text("Estimated Cost", margins.left + 100, y + 5.5);
  doc.text("Notes", margins.left + 145, y + 5.5);
  y += 10;

  hiddenCosts.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(...hexToRgb(colors.lightBg));
      doc.rect(margins.left, y - 4, contentWidth, 8, "F");
    }
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(colors.text));
    doc.setFont("helvetica", "normal");
    doc.text(row.item, margins.left + 4, y);
    doc.setFont("helvetica", "bold");
    doc.text(row.cost, margins.left + 100, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hexToRgb(colors.muted));
    doc.text(row.note, margins.left + 145, y);
    y += 8;
  });

  y += 8;

  // Total line
  doc.setFillColor(...hexToRgb(colors.secondary));
  doc.rect(margins.left, y, contentWidth, 10, "F");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Estimated Total In-House Cost", margins.left + 4, y + 7);
  doc.text("$57,000 – $87,000/yr", margins.left + 100, y + 7);
  y += 18;

  // Comparison callout
  doc.setFillColor(...hexToRgb(colors.successBg));
  doc.setDrawColor(...hexToRgb(colors.successText));
  doc.roundedRect(margins.left, y, contentWidth, 24, 3, 3, "FD");
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(colors.successText));
  doc.setFont("helvetica", "bold");
  doc.text(
    `Your 24H Virtual plan: ${formatCurrency(data.totalMonthlyCost)}/mo (${formatCurrency(data.totalMonthlyCost * 12)}/yr)`,
    margins.left + 8,
    y + 10
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "Professional coverage with zero hidden costs, no benefits to manage, and no coverage gaps.",
    margins.left + 8,
    y + 18
  );

  // ==================== PAGE 4: CTA PAGE ====================

  doc.addPage();

  doc.setFillColor(...hexToRgb(colors.primary));
  doc.rect(0, 0, pageWidth, PDF_CONFIG.pageHeight, "F");

  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Ready to Start Saving?", pageWidth / 2, 100, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  const ctaLines = doc.splitTextToSize(
    `Based on your numbers, you could save ${formatCurrency(data.annualSavings)} per year by switching to 24H Virtual. Book a free 15-minute consultation and go live in 24-48 hours.`,
    contentWidth - 40
  );
  let ctaY = 120;
  ctaLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, ctaY, { align: "center" });
    ctaY += 8;
  });

  // CTA button
  const buttonX = pageWidth / 2 - 50;
  const buttonY = 160;
  doc.setFillColor(...hexToRgb(colors.cta));
  doc.roundedRect(buttonX, buttonY, 100, 14, 3, 3, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Book FREE Consultation", pageWidth / 2, 169, { align: "center" });
  doc.link(buttonX, buttonY, 100, 14, { url: "https://24hv.io/get-started" });

  // Contact info
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Visit: 24hv.io", pageWidth / 2, 200, { align: "center" });
  doc.text("Email: hello@24hvirtual.com", pageWidth / 2, 210, { align: "center" });
  doc.text("Call: 1.800.825.2587", pageWidth / 2, 220, { align: "center" });

  // Logo
  doc.addImage(logos.white, "PNG", (pageWidth - 50) / 2, 250, 50, 13);

  doc.setFontSize(10);
  doc.text("Professional Virtual Receptionist Services", pageWidth / 2, 270, { align: "center" });

  // ==================== FOOTERS ====================

  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i < totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i - 1, totalPages - 2);
  }

  const filename = `24H-Virtual-Savings-Report-${data.name.replace(/\s+/g, "-")}.pdf`;
  doc.save(filename);
};
