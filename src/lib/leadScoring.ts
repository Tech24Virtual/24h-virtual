export interface ScoringRule {
  points: number;
  enabled: boolean;
}

export interface ScoringRules {
  rules: Record<string, ScoringRule>;
  labels: {
    hot: number;
    warm: number;
  };
}

export const DEFAULT_SCORING_RULES: ScoringRules = {
  rules: {
    phone_provided: { points: 10, enabled: true },
    detailed_message: { points: 15, enabled: true },
    calculator_lead: { points: 25, enabled: true },
    wizard_lead: { points: 15, enabled: true },
    professional_email: { points: 5, enabled: true },
    firm_name_provided: { points: 5, enabled: true },
    high_value_service: { points: 20, enabled: true },
  },
  labels: { hot: 70, warm: 40 },
};

export const RULE_LABELS: Record<string, string> = {
  phone_provided: 'Phone Number Provided',
  detailed_message: 'Detailed Message / Notes',
  calculator_lead: 'Calculator Lead Source',
  wizard_lead: 'Wizard Lead Source',
  professional_email: 'Professional Email Domain',
  firm_name_provided: 'Company / Firm Name Provided',
  high_value_service: 'High-Value Service Type',
};

const FREE_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com', 'protonmail.com'];
const HIGH_VALUE_SERVICES = ['virtual-receptionist', 'virtual-secretary'];

export function calculateLeadScore(
  lead: {
    phone?: string | null;
    notes?: string | null;
    source?: string | null;
    email: string;
    company?: string | null;
    service_type?: string | null;
  },
  rules: ScoringRules
): number {
  let score = 0;
  const r = rules.rules;

  if (r.phone_provided?.enabled && lead.phone) score += r.phone_provided.points;

  if (r.detailed_message?.enabled && lead.notes && lead.notes.length > 20) score += r.detailed_message.points;

  if (r.calculator_lead?.enabled && lead.source === 'calculator') score += r.calculator_lead.points;

  if (r.wizard_lead?.enabled && (lead.source === 'wizard' || lead.source === 'get_started')) score += r.wizard_lead.points;

  if (r.professional_email?.enabled) {
    const domain = lead.email.split('@')[1]?.toLowerCase();
    if (domain && !FREE_EMAIL_DOMAINS.includes(domain)) score += r.professional_email.points;
  }

  if (r.firm_name_provided?.enabled && lead.company) score += r.firm_name_provided.points;

  if (r.high_value_service?.enabled && lead.service_type && HIGH_VALUE_SERVICES.includes(lead.service_type)) score += r.high_value_service.points;

  return Math.min(score, 100);
}

export function getScoreLabel(score: number, labels: ScoringRules['labels']): 'hot' | 'warm' | 'cold' {
  if (score >= labels.hot) return 'hot';
  if (score >= labels.warm) return 'warm';
  return 'cold';
}

export function getScoreBadgeClasses(label: 'hot' | 'warm' | 'cold'): string {
  switch (label) {
    case 'hot': return 'bg-green-500/20 text-green-700 dark:text-green-400';
    case 'warm': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
    case 'cold': return 'bg-muted text-muted-foreground';
  }
}
