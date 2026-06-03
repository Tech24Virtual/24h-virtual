/**
 * Wave 2 Batch B+ — Quick-start script templates.
 *
 * Pure data: each template returns a fresh ScriptTree (with newly-minted
 * node IDs at apply time) plus a default document title. The picker calls
 * `instantiateTemplate(id)` to get a ready-to-save tree.
 */
import type { LucideIcon } from "lucide-react";
import {
  PhoneIncoming,
  ClipboardList,
  CalendarClock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import type { ScriptTree, ScriptNode } from "@/types/scriptDocument";

export interface ScriptTemplate {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Default document title applied when this template is chosen. */
  defaultTitle: string;
  /** Bullet preview shown in the picker tile. */
  highlights: string[];
  /** Builder for the tree (IDs are filled in at apply time). */
  build: () => ScriptTree;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Helper: build a node with a fresh ID. */
function n(
  type: ScriptNode["type"] | string,
  title: string,
  body: string,
): ScriptNode {
  return { id: makeId(), type, title, body };
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: "blank",
    label: "Blank script",
    description: "Start from an empty canvas and build it your way.",
    icon: FileText,
    defaultTitle: "Untitled Script",
    highlights: ["No nodes", "Full creative control"],
    build: () => ({ nodes: [], edges: [], intents: [] }),
  },
  {
    id: "greeting",
    label: "Standard Greeting",
    description: "Warm answer, identify the caller, and ask how to help.",
    icon: PhoneIncoming,
    defaultTitle: "Standard Greeting",
    highlights: [
      "Branded opening line",
      "Caller identification",
      "Open-ended help prompt",
    ],
    build: () => ({
      nodes: [
        n(
          "greeting",
          "Answer & brand",
          "Thank you for calling [Client Name], this is [Agent]. How can I help you today?",
        ),
        n(
          "question",
          "Confirm caller",
          "May I have your name and the best number to reach you at?",
        ),
        n(
          "say",
          "Acknowledge",
          "Thanks {{caller_name}} — let me get you to the right place.",
        ),
        n(
          "end",
          "Wrap-up",
          "Thanks for calling [Client Name]. Have a great day.",
        ),
      ],
      edges: [],
      intents: [],
    }),
  },
  {
    id: "intake",
    label: "New Lead Intake",
    description: "Qualify a prospect, capture contact + project details, hand off.",
    icon: ClipboardList,
    defaultTitle: "New Lead Intake",
    highlights: [
      "Qualifying questions",
      "Required-info checklist",
      "Hand-off close",
    ],
    build: () => ({
      nodes: [
        n(
          "greeting",
          "Greeting",
          "Thank you for calling [Client Name]. I'd love to help — are you reaching out about a new project?",
        ),
        n(
          "question",
          "Caller name",
          "Great — could I start with your full name?",
        ),
        n(
          "question",
          "Best contact",
          "What's the best phone number and email to follow up with you?",
        ),
        n(
          "question",
          "Service interest",
          "What service or area are you most interested in?",
        ),
        n(
          "question",
          "Timeframe & budget",
          "Do you have a target timeline, and a rough budget range you're working with?",
        ),
        n(
          "checklist",
          "Required intake fields",
          "• Full name\n• Phone\n• Email\n• Service interest\n• Timeframe\n• Budget range\n• Source / how they heard about us",
        ),
        n(
          "say",
          "Confirm hand-off",
          "Perfect — I'll get this over to our team and someone will reach out within one business day.",
        ),
        n(
          "end",
          "Close",
          "Thanks again for reaching out to [Client Name]. Have a great rest of your day.",
        ),
      ],
      edges: [],
      intents: [],
    }),
  },
  {
    id: "scheduling",
    label: "Appointment Scheduling",
    description: "Confirm the caller, capture preferences, and book the slot.",
    icon: CalendarClock,
    defaultTitle: "Appointment Scheduling",
    highlights: [
      "Existing-vs-new caller branch",
      "Preferred-time capture",
      "Confirmation script",
    ],
    build: () => ({
      nodes: [
        n(
          "greeting",
          "Greeting",
          "Thank you for calling [Client Name], this is [Agent]. Are you looking to schedule an appointment?",
        ),
        n(
          "branch",
          "Existing or new client?",
          "Ask: 'Have you been in to see us before, or is this your first visit?'",
        ),
        n(
          "question",
          "Service & provider",
          "What type of appointment are you looking for, and is there a specific provider you'd like to see?",
        ),
        n(
          "question",
          "Preferred timing",
          "What days and times generally work best for you over the next two weeks?",
        ),
        n(
          "checklist",
          "Booking requirements",
          "• Caller name\n• Phone + email\n• Service / reason for visit\n• Provider preference\n• Preferred date/time\n• Confirmation method (call/text/email)",
        ),
        n(
          "say",
          "Confirm appointment",
          "I have you down for {{appointment_date}} at {{appointment_time}}. We'll send a confirmation to {{contact_method}}.",
        ),
        n(
          "end",
          "Close",
          "Thanks {{caller_name}} — we'll see you then. Have a great day.",
        ),
      ],
      edges: [],
      intents: [],
    }),
  },
  {
    id: "escalation",
    label: "Escalation / Urgent",
    description: "Triage urgency, gather facts, and route to on-call staff fast.",
    icon: AlertTriangle,
    defaultTitle: "Escalation Handling",
    highlights: [
      "Urgency triage branch",
      "Incident detail capture",
      "On-call hand-off path",
    ],
    build: () => ({
      nodes: [
        n(
          "greeting",
          "Greeting",
          "Thank you for calling [Client Name], this is [Agent]. How can I help you?",
        ),
        n(
          "question",
          "Reason for call",
          "Could you tell me briefly what's going on so I can route this correctly?",
        ),
        n(
          "branch",
          "Urgency triage",
          "Decide path: emergency / urgent / standard. Examples of urgent: safety, downtime, missed deadline.",
        ),
        n(
          "checklist",
          "Incident details",
          "• Caller name + callback number\n• Account / property / project ID\n• What happened and when\n• Current impact\n• What they've already tried",
        ),
        n(
          "say",
          "Reassure",
          "Understood — I'm flagging this as urgent and notifying the on-call team right now.",
        ),
        n(
          "say",
          "On-call hand-off",
          "Notify on-call per escalation matrix (text + call). Stay on the line until acknowledgement is received.",
        ),
        n(
          "end",
          "Close",
          "Someone from the team will call you back at {{callback_number}} within {{eta}}. Thank you for your patience.",
        ),
      ],
      edges: [],
      intents: [],
    }),
  },
];

export function getTemplate(id: string): ScriptTemplate | undefined {
  return SCRIPT_TEMPLATES.find((t) => t.id === id);
}

/** Returns a freshly-instantiated tree with new node IDs. */
export function instantiateTemplate(id: string): {
  tree: ScriptTree;
  title: string;
} | null {
  const tpl = getTemplate(id);
  if (!tpl) return null;
  return { tree: tpl.build(), title: tpl.defaultTitle };
}
