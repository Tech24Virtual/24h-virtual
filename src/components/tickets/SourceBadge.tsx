import { Building2, TrendingUp, Share2, Tag, Shield, ArrowLeftRight, Headphones, Wrench, CreditCard, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TicketSource = 'sales' | 'client_portal' | 'affiliate_portal' | 'white_label_portal' | 'admin' | 'agent' | 'tech' | 'billing' | 'supervisor';

interface SourceBadgeProps {
  source: TicketSource | string;
  className?: string;
}

const sourceConfig: Record<string, { icon: typeof Building2; label: string; variant: string }> = {
  sales: {
    icon: TrendingUp,
    label: 'Sales',
    variant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  client_portal: {
    icon: Building2,
    label: 'Client',
    variant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  affiliate_portal: {
    icon: Share2,
    label: 'Affiliate',
    variant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  white_label_portal: {
    icon: Tag,
    label: 'Partner',
    variant: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  admin: {
    icon: Shield,
    label: 'Internal',
    variant: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
  agent: {
    icon: Headphones,
    label: 'Agent',
    variant: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  },
  tech: {
    icon: Wrench,
    label: 'Tech',
    variant: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  billing: {
    icon: CreditCard,
    label: 'Billing',
    variant: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  supervisor: {
    icon: Eye,
    label: 'Supervisor',
    variant: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
};

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const config = sourceConfig[source] || sourceConfig.admin;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1 font-medium border-0',
        config.variant,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface OriginBadgeProps {
  originatingSource: string | null;
  currentSource: string;
  className?: string;
}

export function OriginBadge({ originatingSource, currentSource, className }: OriginBadgeProps) {
  // Only show when originating source differs from current source
  if (!originatingSource || originatingSource === currentSource) return null;

  const config = sourceConfig[originatingSource] || sourceConfig.admin;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'flex items-center gap-1 text-xs font-medium border border-dashed',
        config.variant,
        'bg-transparent',
        className
      )}
    >
      <ArrowLeftRight className="h-3 w-3" />
      From: {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const priorityConfig: Record<string, { label: string; variant: string }> = {
    low: { label: 'Low', variant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    medium: { label: 'Medium', variant: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    high: { label: 'High', variant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    urgent: { label: 'Urgent', variant: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  };

  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <Badge 
      variant="outline" 
      className={cn('font-medium border-0', config.variant, className)}
    >
      {config.label}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const statusConfig: Record<string, { label: string; variant: string }> = {
    open: { label: 'Open', variant: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    in_progress: { label: 'In Progress', variant: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    waiting: { label: 'Waiting', variant: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    resolved: { label: 'Resolved', variant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    closed: { label: 'Closed', variant: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  };

  const config = statusConfig[status] || statusConfig.open;

  return (
    <Badge 
      variant="outline" 
      className={cn('font-medium border-0', config.variant, className)}
    >
      {config.label}
    </Badge>
  );
}
