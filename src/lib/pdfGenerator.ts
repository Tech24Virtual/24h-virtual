 import { jsPDF } from "jspdf";
 import type { Guide } from "@/data/guides";
import logoBlue from "@/assets/logos/logo-blue.png";
import logoWhite from "@/assets/logos/logo-white.png";
 
 const PDF_CONFIG = {
   pageWidth: 210, // A4 mm
   pageHeight: 297,
   margins: { top: 25, bottom: 25, left: 20, right: 20 },
   colors: {
     primary: "#005FB4",
     secondary: "#AD5E80",
     text: "#1e293b",
     muted: "#64748b",
     lightBg: "#f8fafc",
   },
   lineHeight: 6,
   sectionGap: 12,
 };
 
// Load both logos as base64 for PDF embedding
const loadLogosAsBase64 = async (): Promise<{ blue: string; white: string }> => {
  const [blueResponse, whiteResponse] = await Promise.all([
    fetch(logoBlue),
    fetch(logoWhite)
  ]);
  
  const [blueBlob, whiteBlob] = await Promise.all([
    blueResponse.blob(),
    whiteResponse.blob()
  ]);
  
  const toBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  
  const [blue, white] = await Promise.all([
    toBase64(blueBlob),
    toBase64(whiteBlob)
  ]);
  
  return { blue, white };
};

 const hexToRgb = (hex: string): [number, number, number] => {
   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
   return result
     ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
     : [0, 0, 0];
 };
 
 const addFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
   const { pageWidth, pageHeight, margins } = PDF_CONFIG;
   const footerY = pageHeight - 10;
   
   doc.setDrawColor(...hexToRgb(PDF_CONFIG.colors.muted));
   doc.setLineWidth(0.3);
   doc.line(margins.left, footerY - 5, pageWidth - margins.right, footerY - 5);
   
   doc.setFontSize(9);
   doc.setTextColor(...hexToRgb(PDF_CONFIG.colors.muted));
   doc.text(`Page ${pageNumber} of ${totalPages}`, margins.left, footerY);
   doc.text("24hv.io", pageWidth - margins.right, footerY, { align: "right" });
 };
 
const addHeader = (doc: jsPDF, guideTitle: string, logoBlueBase64: string) => {
   const { margins, colors } = PDF_CONFIG;
   
  // Add logo to header
  doc.addImage(logoBlueBase64, "PNG", margins.left, 8, 30, 8);
   
   // Guide title on right
   doc.setFontSize(9);
   doc.setTextColor(...hexToRgb(colors.muted));
   doc.setFont("helvetica", "normal");
   const titleWidth = PDF_CONFIG.pageWidth - margins.left - margins.right - 40;
   const truncatedTitle = guideTitle.length > 50 ? guideTitle.substring(0, 47) + "..." : guideTitle;
   doc.text(truncatedTitle, PDF_CONFIG.pageWidth - margins.right, 15, { align: "right" });
   
   // Header line
   doc.setDrawColor(...hexToRgb(colors.primary));
   doc.setLineWidth(0.5);
   doc.line(margins.left, 18, PDF_CONFIG.pageWidth - margins.right, 18);
 };
 
 const checkPageBreak = (doc: jsPDF, currentY: number, neededSpace: number): number => {
   const { pageHeight, margins } = PDF_CONFIG;
   const maxY = pageHeight - margins.bottom;
   
   if (currentY + neededSpace > maxY) {
     doc.addPage();
     return margins.top;
   }
   return currentY;
 };
 
 const wrapText = (doc: jsPDF, text: string, maxWidth: number): string[] => {
   return doc.splitTextToSize(text, maxWidth);
 };
 
 export const generateGuidePDF = async (guide: Guide): Promise<void> => {
   const { pageWidth, margins, colors, lineHeight, sectionGap } = PDF_CONFIG;
   const contentWidth = pageWidth - margins.left - margins.right;
  
  // Load both logos at start
  const logos = await loadLogosAsBase64();
   
   const doc = new jsPDF({
     orientation: "portrait",
     unit: "mm",
     format: "a4",
   });
   
   // ==================== COVER PAGE ====================
   
   // Top accent bar
   doc.setFillColor(...hexToRgb(colors.primary));
   doc.rect(0, 0, pageWidth, 8, "F");
   
  // Company logo (centered)
  const coverLogoWidth = 60;
  const coverLogoHeight = 16;
  doc.addImage(logos.blue, "PNG", (pageWidth - coverLogoWidth) / 2, 40, coverLogoWidth, coverLogoHeight);
   
   doc.setFontSize(11);
   doc.setTextColor(...hexToRgb(colors.muted));
   doc.setFont("helvetica", "normal");
  doc.text("Professional Virtual Receptionist Services", pageWidth / 2, 62, { align: "center" });
   
   // Decorative line
   doc.setDrawColor(...hexToRgb(colors.primary));
   doc.setLineWidth(1);
  doc.line(60, 74, pageWidth - 60, 74);
   
   // Category badge
   const categoryText = guide.category === "core" ? "GETTING STARTED GUIDE" : "INDUSTRY GUIDE";
   doc.setFontSize(10);
   doc.setTextColor(...hexToRgb(colors.secondary));
   doc.setFont("helvetica", "bold");
  doc.text(categoryText, pageWidth / 2, 94, { align: "center" });
   
   // Guide title
   doc.setFontSize(28);
   doc.setTextColor(...hexToRgb(colors.text));
   doc.setFont("helvetica", "bold");
   const titleLines = wrapText(doc, guide.title, contentWidth - 20);
  let titleY = 114;
   titleLines.forEach((line) => {
     doc.text(line, pageWidth / 2, titleY, { align: "center" });
     titleY += 12;
   });
   
   // Description
   doc.setFontSize(12);
   doc.setTextColor(...hexToRgb(colors.muted));
   doc.setFont("helvetica", "normal");
   const descLines = wrapText(doc, guide.description, contentWidth - 40);
   let descY = titleY + 15;
   descLines.forEach((line) => {
     doc.text(line, pageWidth / 2, descY, { align: "center" });
     descY += 7;
   });
   
   // Reading time
   doc.setFontSize(10);
   doc.text(guide.readingTime, pageWidth / 2, descY + 15, { align: "center" });
   
   // Bottom section
   doc.setFillColor(...hexToRgb(colors.lightBg));
   doc.rect(0, 250, pageWidth, 47, "F");
   
   doc.setFontSize(11);
   doc.setTextColor(...hexToRgb(colors.text));
   doc.setFont("helvetica", "bold");
   doc.text("FREE BUSINESS GUIDE", pageWidth / 2, 265, { align: "center" });
   
   doc.setFontSize(10);
   doc.setTextColor(...hexToRgb(colors.primary));
   doc.setFont("helvetica", "normal");
   doc.text("24hv.io", pageWidth / 2, 275, { align: "center" });
   
   // Bottom accent bar
   doc.setFillColor(...hexToRgb(colors.secondary));
   doc.rect(0, 289, pageWidth, 8, "F");
   
   // ==================== CONTENT PAGES ====================
   
   doc.addPage();
   let currentY = margins.top;
   let currentPage = 2;
   
   // Add header to first content page
  addHeader(doc, guide.title, logos.blue);
   currentY = 28;
   
   // Table of Contents
   doc.setFontSize(16);
   doc.setTextColor(...hexToRgb(colors.primary));
   doc.setFont("helvetica", "bold");
   doc.text("Table of Contents", margins.left, currentY);
   currentY += 10;
   
   doc.setFontSize(11);
   doc.setTextColor(...hexToRgb(colors.text));
   doc.setFont("helvetica", "normal");
   
   guide.sections.forEach((section, index) => {
     currentY = checkPageBreak(doc, currentY, 8);
     doc.text(`${index + 1}. ${section.title}`, margins.left + 5, currentY);
     currentY += 7;
   });
   
   currentY += sectionGap;
   
   // Render each section
   guide.sections.forEach((section, sectionIndex) => {
     // Estimate space needed for section header
     const neededSpace = 30;
     if (currentY + neededSpace > PDF_CONFIG.pageHeight - margins.bottom) {
       doc.addPage();
       currentPage++;
      addHeader(doc, guide.title, logos.blue);
       currentY = 28;
     }
     
     // Section title
     doc.setFontSize(14);
     doc.setTextColor(...hexToRgb(colors.primary));
     doc.setFont("helvetica", "bold");
     doc.text(`${sectionIndex + 1}. ${section.title}`, margins.left, currentY);
     currentY += 3;
     
     // Underline
     doc.setDrawColor(...hexToRgb(colors.primary));
     doc.setLineWidth(0.5);
     doc.line(margins.left, currentY, margins.left + 60, currentY);
     currentY += 8;
     
     // Section content
     doc.setFontSize(11);
     doc.setTextColor(...hexToRgb(colors.text));
     doc.setFont("helvetica", "normal");
     
     const contentLines = wrapText(doc, section.content, contentWidth);
     contentLines.forEach((line) => {
       currentY = checkPageBreak(doc, currentY, lineHeight);
       if (currentY === margins.top) {
         addHeader(doc, guide.title, logos.blue);
         currentY = 28;
         currentPage++;
       }
       doc.text(line, margins.left, currentY);
       currentY += lineHeight;
     });
     
     currentY += 4;
     
     // Bullets
     if (section.bullets && section.bullets.length > 0) {
       section.bullets.forEach((bullet) => {
         const bulletLines = wrapText(doc, bullet, contentWidth - 10);
         const bulletHeight = bulletLines.length * lineHeight;
         
         currentY = checkPageBreak(doc, currentY, bulletHeight);
         if (currentY === margins.top) {
          addHeader(doc, guide.title, logos.blue);
           currentY = 28;
           currentPage++;
         }
         
         // Bullet point
         doc.setFillColor(...hexToRgb(colors.primary));
         doc.circle(margins.left + 2, currentY - 1.5, 1.2, "F");
         
         bulletLines.forEach((line, lineIndex) => {
           doc.text(line, margins.left + 8, currentY);
           if (lineIndex < bulletLines.length - 1) {
             currentY += lineHeight;
           }
         });
         currentY += lineHeight;
       });
       currentY += 2;
     }
     
     // Callout box
     if (section.callout) {
       const calloutLines = wrapText(doc, section.callout.text, contentWidth - 16);
       const boxHeight = calloutLines.length * lineHeight + 10;
       
       currentY = checkPageBreak(doc, currentY, boxHeight + 5);
       if (currentY === margins.top) {
           addHeader(doc, guide.title, logos.blue);
         currentY = 28;
         currentPage++;
       }
       
       // Box colors based on type
       const boxColors = {
         tip: { bg: "#dcfce7", border: "#16a34a", text: "#166534" },
         warning: { bg: "#fef3c7", border: "#d97706", text: "#92400e" },
         info: { bg: "#dbeafe", border: "#2563eb", text: "#1e40af" },
       };
       const calloutStyle = boxColors[section.callout.type];
       
       // Draw box
       doc.setFillColor(...hexToRgb(calloutStyle.bg));
       doc.setDrawColor(...hexToRgb(calloutStyle.border));
       doc.setLineWidth(0.5);
       doc.roundedRect(margins.left, currentY, contentWidth, boxHeight, 2, 2, "FD");
       
       // Callout label
       doc.setFontSize(9);
       doc.setTextColor(...hexToRgb(calloutStyle.border));
       doc.setFont("helvetica", "bold");
       const labelText = section.callout.type.toUpperCase();
       doc.text(labelText, margins.left + 5, currentY + 6);
       
       // Callout text
       doc.setFontSize(10);
       doc.setTextColor(...hexToRgb(calloutStyle.text));
       doc.setFont("helvetica", "normal");
       let calloutY = currentY + 12;
       calloutLines.forEach((line) => {
         doc.text(line, margins.left + 5, calloutY);
         calloutY += lineHeight - 1;
       });
       
       currentY += boxHeight + 5;
     }
     
     currentY += sectionGap;
   });
   
   // ==================== CTA PAGE ====================
   
   doc.addPage();
   currentPage++;
   
   // Full page CTA
   doc.setFillColor(...hexToRgb(colors.primary));
   doc.rect(0, 0, pageWidth, PDF_CONFIG.pageHeight, "F");
   
   doc.setFontSize(28);
   doc.setTextColor(255, 255, 255);
   doc.setFont("helvetica", "bold");
   doc.text("Ready to Get Started?", pageWidth / 2, 100, { align: "center" });
   
   doc.setFontSize(14);
   doc.setFont("helvetica", "normal");
  const ctaLines = wrapText(doc, "Experience the difference professional virtual receptionist services can make for your business. Book your FREE consultation today.", contentWidth - 40);
   let ctaY = 120;
   ctaLines.forEach((line) => {
     doc.text(line, pageWidth / 2, ctaY, { align: "center" });
     ctaY += 8;
   });
   
   // CTA button (simulated)
  const buttonX = pageWidth / 2 - 50;
  const buttonY = 155;
  const buttonWidth = 100;
  const buttonHeight = 14;
  
   doc.setFillColor(...hexToRgb("#E74A3E"));
  doc.roundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 3, 3, "F");
   doc.setFontSize(12);
   doc.setFont("helvetica", "bold");
  doc.text("Book FREE Consultation", pageWidth / 2, 164, { align: "center" });
  
  // Add clickable link to the button area
  doc.link(buttonX, buttonY, buttonWidth, buttonHeight, { url: "https://24hv.io/get-started" });
   
   // Contact info
   doc.setFontSize(11);
   doc.setFont("helvetica", "normal");
   doc.text("Visit: 24hv.io", pageWidth / 2, 200, { align: "center" });
  doc.text("Email: hello@24hvirtual.com", pageWidth / 2, 210, { align: "center" });
   
  // Company logo at bottom (centered) - use WHITE logo on dark background
  const ctaLogoWidth = 50;
  const ctaLogoHeight = 13;
  doc.addImage(logos.white, "PNG", (pageWidth - ctaLogoWidth) / 2, 250, ctaLogoWidth, ctaLogoHeight);
  
   doc.setFontSize(10);
   doc.setFont("helvetica", "normal");
  doc.text("Professional Virtual Receptionist Services", pageWidth / 2, 270, { align: "center" });
   
   // ==================== ADD FOOTERS ====================
   
   const totalPages = doc.getNumberOfPages();
   
   // Skip cover page (page 1) and CTA page (last page) for footers
   for (let i = 2; i < totalPages; i++) {
     doc.setPage(i);
     addFooter(doc, i - 1, totalPages - 2);
   }
   
   // Save the PDF
    const filename = `24H-Virtual-${guide.slug}.pdf`;
   doc.save(filename);
 };