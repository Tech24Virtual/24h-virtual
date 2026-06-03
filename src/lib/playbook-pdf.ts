import jsPDF from "jspdf";

export function generatePlaybookPDF(): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(24);
  doc.setTextColor(30, 64, 175);
  doc.text("7-Day Campaign Launch Playbook", pageWidth / 2, y, { align: "center" });
  y += 12;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("From Script to Live Calls in One Week", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.text("Powered by 24H Virtual", pageWidth / 2, y, { align: "center" });
  y += 16;

  const days = [
    { day: "Day 1", title: "Discovery & Script Prep", items: [
      "Identify all call types your business handles",
      "Document current scripts, greetings, and call handling rules",
      "List all tools and systems that need integration (CRM, FSM, etc.)",
      "Define success metrics: what does a perfectly handled call look like?",
    ]},
    { day: "Day 2", title: "Rule Definition", items: [
      "Define transfer rules: who gets calls, when, and how",
      "Set guardrails: what agents can and cannot promise",
      "Specify data capture requirements for each call type",
      "Document escalation paths for emergencies and VIP callers",
    ]},
    { day: "Day 3", title: "System Connection", items: [
      "Set up call forwarding from your existing numbers",
      "Connect CRM integration for automatic data sync",
      "Configure calendar integration for appointment booking",
      "Set up notification channels (email, SMS, Slack)",
    ]},
    { day: "Day 4", title: "Flow Encoding", items: [
      "Encode all scripts and decision trees into the platform",
      "Build routing logic for each call type",
      "Configure business hours and after-hours handling",
      "Set up brand-specific greetings and messaging",
    ]},
    { day: "Day 5", title: "Internal Testing", items: [
      "Run test calls for every call type scenario",
      "Verify data capture and CRM sync accuracy",
      "Test transfer and escalation paths",
      "Review notification delivery and formatting",
    ]},
    { day: "Day 6", title: "QA & Refinement", items: [
      "Review test call recordings and agent performance",
      "Fine-tune scripts based on test results",
      "Verify compliance requirements (HIPAA, etc.)",
      "Conduct final stakeholder review and sign-off",
    ]},
    { day: "Day 7", title: "Go Live", items: [
      "Activate live call forwarding",
      "Monitor first batch of real calls in real-time",
      "Make immediate adjustments as needed",
      "Set up ongoing QA schedule and reporting dashboard",
    ]},
  ];

  doc.setFontSize(11);
  days.forEach(({ day, title, items }) => {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.text(`${day}: ${title}`, 15, y);
    y += 8;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    items.forEach(item => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`• ${item}`, 20, y);
      y += 6;
    });
    y += 6;
  });

  // Footer CTA
  if (y > 250) { doc.addPage(); y = 20; }
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  doc.text("Ready to launch in 7 days?", pageWidth / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text("Visit 24hv.io/get-started to begin your setup.", pageWidth / 2, y, { align: "center" });

  return doc;
}
