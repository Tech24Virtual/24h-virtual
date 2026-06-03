/**
 * Wave 2 Batch B — Script Builder node type registry.
 * Keep flat + serializable: this list drives the "Add node" menu and the
 * type-specific properties panel rendering.
 */
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  HelpCircle,
  GitBranch,
  PhoneOff,
  ListChecks,
  Sparkles,
} from "lucide-react";

export interface NodeTypeDef {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Default body text seeded into the node when added. */
  defaultBody?: string;
}

export const NODE_TYPES: NodeTypeDef[] = [
  {
    type: "greeting",
    label: "Greeting",
    description: "Opening line the agent reads when answering.",
    icon: Sparkles,
    defaultBody: "Thank you for calling. How can I help you today?",
  },
  {
    type: "say",
    label: "Say",
    description: "A line the agent reads aloud.",
    icon: MessageSquare,
    defaultBody: "",
  },
  {
    type: "question",
    label: "Question",
    description: "Prompt the caller for information.",
    icon: HelpCircle,
    defaultBody: "May I have your name and best callback number?",
  },
  {
    type: "branch",
    label: "Branch",
    description: "Route the call based on a condition.",
    icon: GitBranch,
    defaultBody: "",
  },
  {
    type: "checklist",
    label: "Checklist",
    description: "Required information or actions before proceeding.",
    icon: ListChecks,
    defaultBody: "",
  },
  {
    type: "end",
    label: "End",
    description: "Wrap-up and disposition.",
    icon: PhoneOff,
    defaultBody: "Thank you for calling. Have a great day.",
  },
];

export function getNodeTypeDef(type: string): NodeTypeDef {
  return NODE_TYPES.find((t) => t.type === type) ?? {
    type,
    label: type,
    description: "Custom node",
    icon: MessageSquare,
  };
}
