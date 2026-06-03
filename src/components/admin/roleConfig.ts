import type { Database } from '@/integrations/supabase/types';

export type AppRole = Database['public']['Enums']['app_role'];

export interface RoleInfo {
  role: AppRole;
  label: string;
  description: string;
  portalUrl: string | null;
  color: string;
}

export const ROLE_CONFIG: RoleInfo[] = [
  { role: 'admin', label: 'Admin Portal', description: 'Full system access and management', portalUrl: '/admin', color: 'bg-red-100 text-red-800' },
  { role: 'client', label: 'Client Dashboard', description: 'View call logs, scripts, billing', portalUrl: '/client-dashboard', color: 'bg-blue-100 text-blue-800' },
  { role: 'sales', label: 'Sales Portal', description: 'Lead pipeline and conversion tracking', portalUrl: '/staff/sales', color: 'bg-green-100 text-green-800' },
  { role: 'agent', label: 'Agent Portal', description: 'Call handling and client management', portalUrl: '/staff/agent', color: 'bg-purple-100 text-purple-800' },
  { role: 'supervisor', label: 'Supervisor Portal', description: 'Team oversight and SLA monitoring', portalUrl: '/staff/supervisor', color: 'bg-orange-100 text-orange-800' },
  { role: 'billing', label: 'Billing Portal', description: 'Invoice and payment management', portalUrl: '/staff/billing', color: 'bg-yellow-100 text-yellow-800' },
  { role: 'tech', label: 'Tech Support Portal', description: 'Technical issue resolution', portalUrl: '/staff/tech', color: 'bg-cyan-100 text-cyan-800' },
  { role: 'white_label', label: 'White Label Portal', description: 'Partner branding and client management', portalUrl: '/white-label-dashboard', color: 'bg-pink-100 text-pink-800' },
  { role: 'affiliate', label: 'Affiliate Portal', description: 'Referral tracking and commissions', portalUrl: '/affiliate', color: 'bg-indigo-100 text-indigo-800' },
  { role: 'referrer', label: 'Referrer', description: 'Referral program participation', portalUrl: null, color: 'bg-gray-100 text-gray-800' },
];

export function getRoleInfo(role: AppRole): RoleInfo {
  return ROLE_CONFIG.find(r => r.role === role) || ROLE_CONFIG[ROLE_CONFIG.length - 1];
}
