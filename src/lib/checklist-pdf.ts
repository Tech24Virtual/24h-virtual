import jsPDF from "jspdf";

export function generateChecklistPDF(): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(30, 64, 175);
  doc.text("Call Handling Perfection", pageWidth / 2, y, { align: "center" });
  y += 10;
  doc.setFontSize(16);
  doc.text("Checklist", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("By 24H Virtual", pageWidth / 2, y, { align: "center" });
  y += 16;

  const sections = [
    { title: "Must-Have Intake Fields", items: [
      "Caller's full name",
      "Phone number (with best time to call back)",
      "Email address",
      "Reason for calling (categorized)",
      "Urgency level (routine / urgent / emergency)",
      "Service address or location (if applicable)",
      "Existing account or reference number",
      "How they heard about you",
    ]},
    { title: "Rules to Avoid Bad Promises", items: [
      "Never quote pricing without authorization",
      "Never confirm appointment availability without checking the calendar",
      "Never promise a specific callback time you can't guarantee",
      "Never share internal company policies or procedures",
      "Never diagnose or give professional advice (legal, medical, etc.)",
      "Always clarify what the next step will be",
      "Always set realistic expectations for response times",
    ]},
    { title: "QA Metrics to Track", items: [
      "Average answer speed (target: under 3 rings)",
      "First-call resolution rate",
      "Data capture completeness (% of required fields filled)",
      "Script adherence score",
      "Caller satisfaction (post-call survey or sentiment)",
      "Transfer accuracy (right person, right department)",
      "Compliance violations per period",
      "Abandoned call rate",
    ]},
    { title: "Encoded Rules Checklist", items: [
      "All call types have defined flows",
      "Transfer rules are documented and tested",
      "Guardrails are enforced in every flow",
      "After-hours handling is configured",
      "Emergency escalation paths are active",
      "Data capture fields match intake requirements",
      "QA monitoring schedule is established",
      "Reporting dashboard is configured",
    ]},
  ];

  doc.setFontSize(11);
  sections.forEach(({ title, items }) => {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.text(title, 15, y);
    y += 8;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    items.forEach(item => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`☐  ${item}`, 20, y);
      y += 6;
    });
    y += 8;
  });

  // Footer
  y += 5;
  doc.setFontSize(12);
  doc.setTextColor(30, 64, 175);
  doc.text("Need help implementing this?", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("24H Virtual encodes these rules into your call flows automatically.", pageWidth / 2, y, { align: "center" });
  y += 6;
  doc.text("Visit 24hv.io/get-started", pageWidth / 2, y, { align: "center" });

  return doc;
}
