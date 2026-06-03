import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Building2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WLPartnerLead } from '@/hooks/wl/useWLPartnerLeads';

interface Props {
  lead: WLPartnerLead;
  onClick?: () => void;
  onConvert?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  draggable?: boolean;
}

const temperatureBorder: Record<string, string> = {
  hot: 'border-l-4 border-l-destructive',
  warm: 'border-l-4 border-l-orange-500',
  cold: 'border-l-4 border-l-sky-500',
};

const temperatureBadge: Record<string, string> = {
  hot: 'bg-destructive/10 text-destructive border-destructive/30',
  warm: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
  cold: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
};

export function WLLeadCard({ lead, onClick, onConvert, onDragStart, draggable }: Props) {
  const showConvert =
    !!onConvert && (lead.pipeline_stage === 'qualified' || lead.pipeline_stage === 'proposal');
  return (
    <Card
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        'p-3 cursor-pointer hover:shadow-md transition-shadow space-y-2',
        lead.temperature && temperatureBorder[lead.temperature]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{lead.name}</p>
          {lead.company && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {lead.company}
            </p>
          )}
        </div>
        {lead.temperature && (
          <Badge variant="outline" className={cn('text-xs capitalize shrink-0', temperatureBadge[lead.temperature])}>
            {lead.temperature}
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 truncate">
          <Mail className="w-3 h-3 shrink-0" />
          <span className="truncate">{lead.email}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1 truncate">
            <Phone className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}
      </div>

      {lead.estimated_value != null && (
        <div className="text-xs font-medium text-foreground">
          {lead.currency ? `${lead.currency} ` : ''}{lead.estimated_value.toLocaleString()}
        </div>
      )}

      {showConvert && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs text-primary border-primary/30 hover:bg-primary/5"
          onClick={(e) => {
            e.stopPropagation();
            onConvert?.();
          }}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          Convert to Active
        </Button>
      )}
    </Card>
  );
}
