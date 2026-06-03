import { type LucideIcon } from "lucide-react";

export type ScenarioType = "medical" | "legal" | "home-services" | "real-estate";
export type IntegrationMode = "integrated" | "non-integrated";

export interface ConversationMessage {
  id?: string;
  speaker: "ai" | "caller";
  text: string;
  timestamp: number; // ms from start
}

export interface ActionItem {
  id?: string;
  icon: string;
  title: string;
  description: string;
  timestamp: number;
}

export interface Scenario {
  id: ScenarioType;
  name: string;
  icon: LucideIcon;
  callerName: string;
  callerPhone: string;
  messages: ConversationMessage[];
  integratedActions: ActionItem[];
  nonIntegratedActions: ActionItem[];
}

export interface SimulatorState {
  isPlaying: boolean;
  currentPhase: number;
  messages: ConversationMessage[];
  actions: ActionItem[];
  selectedScenario: ScenarioType;
  callDuration: number;
}
