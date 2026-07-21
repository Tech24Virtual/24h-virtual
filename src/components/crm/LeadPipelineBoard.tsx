import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Mail, Calendar, GripVertical, Users, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PIPELINE_STAGES as ALL_STAGES, SALES_BOARD_STAGES, canTransition, type PipelineStage } from '@/lib/revenue/pipeline';

const PIPELINE_STAGES = SALES_BOARD_STAGES.map((key) => {
  const meta = ALL_STAGES.find((s) => s.key === key)!;
  return { key: meta.key, label: meta.label, color: meta.color };
});

const temperatureBorder: Record<string, string> = {
  hot: 'border-l-green-500 border-l-4',
  warm: 'border-l-yellow-500 border-l-4',
  cold: 'border-l-muted border-l-4',
};

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  pipeline_stage: PipelineStage | null;
  source: string | null;
  service_type: string | null;
  created_at: string | null;
  assigned_sales_rep: string | null;
  lead_temperature: string | null;
  plan_minutes: number | null;
}

interface LeadPipelineBoardProps {
  adminMode?: boolean;
}

export function LeadPipelineBoard({ adminMode = false }: LeadPipelineBoardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'my' | 'team'>(adminMode ? 'team' : 'my');

  const { data: leads, isLoading } = useQuery({
    queryKey: ['pipeline-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, company, pipeline_stage, source, service_type, created_at, assigned_sales_rep, lead_temperature, plan_minutes')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const filteredLeads = (adminMode || viewMode === 'team')
    ? leads || []
    : leads?.filter(l => l.assigned_sales_rep === user?.id) || [];

  const updateLeadStage = useMutation({
    mutationFn: async ({ leadId, newStage }: { leadId: string; newStage: PipelineStage }) => {
      const { error } = await supabase
        .from('leads')
        .update({ pipeline_stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      toast({ title: 'Lead updated', description: 'Pipeline stage updated.' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update pipeline stage.', variant: 'destructive' }),
  });

  const getLeadsByStage = (stage: string) => filteredLeads.filter((lead) => (lead.pipeline_stage || 'new') === stage);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedLead && draggedLead.pipeline_stage !== stage) {
      if (!canTransition(draggedLead.pipeline_stage as PipelineStage, stage as PipelineStage)) {
        toast({
          title: 'Invalid stage transition',
          description: `Cannot move from ${draggedLead.pipeline_stage} to ${stage}`,
          variant: 'destructive',
        });
        setDraggedLead(null);
        return;
      }
      updateLeadStage.mutate({ leadId: draggedLead.id, newStage: stage as PipelineStage });
    }
    setDraggedLead(null);
  };
  const handleDragEnd = () => setDraggedLead(null);

  const totalLeads = filteredLeads.length;
  const wonLeads = getLeadsByStage('won').length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';

  const stageValue = (stage: string) =>
    getLeadsByStage(stage).reduce((sum, l) => sum + (l.plan_minutes || 0) * 2, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales Pipeline</h1>
          <p className="text-muted-foreground">Drag and drop leads between stages</p>
        </div>
        <div className="flex items-center gap-4">
          {!adminMode && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button variant={viewMode === 'my' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('my')}>
                <UserIcon className="h-4 w-4 mr-1" />My Pipeline
              </Button>
              <Button variant={viewMode === 'team' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('team')}>
                <Users className="h-4 w-4 mr-1" />Team
              </Button>
            </div>
          )}
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">{totalLeads} leads</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Conversion: </span>
            <span className="font-semibold text-green-600">{conversionRate}%</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4 w-full">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[500px] flex-shrink-0 w-[220px]" />)}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 w-full">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = getLeadsByStage(stage.key);
            const value = stageValue(stage.key);
            return (
              <div key={stage.key} className="flex-shrink-0 w-[220px]" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, stage.key)}>
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                        <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                    </div>
                    {value > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">${value.toLocaleString()} est. value</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-[500px] overflow-y-auto overflow-x-hidden">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">No leads</div>
                    ) : (
                      stageLeads.map((lead) => (
                        <Link key={lead.id} to={adminMode ? `/admin/leads/${lead.id}` : `/staff/sales/pipeline/leads/${lead.id}`} className="block" draggable onDragStart={(e) => handleDragStart(e, lead)} onDragEnd={handleDragEnd}>
                          <div className={`p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all overflow-hidden w-full ${
                            draggedLead?.id === lead.id ? 'opacity-50 scale-95' : ''
                          } ${temperatureBorder[lead.lead_temperature || ''] || ''}`}>
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{lead.name}</div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 overflow-hidden">
                                  <Mail className="h-3 w-3" /><span className="truncate min-w-0">{lead.email}</span>
                                </div>
                                {lead.company && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 overflow-hidden">
                                    <Building2 className="h-3 w-3" /><span className="truncate min-w-0">{lead.company}</span>
                                  </div>
                                )}
                                {lead.created_at && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Calendar className="h-3 w-3" /><span>{format(new Date(lead.created_at), 'MMM d')}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 mt-2 flex-wrap">
                                  {lead.source && <Badge variant="outline" className="text-xs">{lead.source}</Badge>}
                                  {lead.lead_temperature && (
                                    <Badge variant="secondary" className="text-xs capitalize">{lead.lead_temperature}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
