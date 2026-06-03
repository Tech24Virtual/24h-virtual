import { useMemo, useState } from 'react';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { useWLPartnerLeads, type WLPartnerLead, type WLPipelineStage } from '@/hooks/wl/useWLPartnerLeads';
import { useWLPartnerLeadMutations } from '@/hooks/wl/useWLPartnerLeadMutations';
import { WLLeadCard } from '@/components/white-label/leads/WLLeadCard';
import { WLLeadFormDialog } from '@/components/white-label/leads/WLLeadFormDialog';
import { WLConvertLeadDialog } from '@/components/white-label/leads/WLConvertLeadDialog';
import { SEO } from '@/components/SEO';

const PIPELINE_STAGES: { id: WLPipelineStage; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
];

export default function WLPartnerPipeline() {
  const { data: leads, isLoading } = useWLPartnerLeads();
  const { updateStage } = useWLPartnerLeadMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WLPartnerLead | null>(null);
  const [converting, setConverting] = useState<WLPartnerLead | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m: Record<WLPipelineStage, WLPartnerLead[]> = {
      new: [], contacted: [], qualified: [], proposal: [], won: [], lost: [],
    };
    leads?.forEach((l) => m[l.pipeline_stage].push(l));
    return m;
  }, [leads]);

  const handleDrop = async (stage: WLPipelineStage) => {
    if (!draggedId) return;
    const lead = leads?.find((l) => l.id === draggedId);
    if (lead && lead.pipeline_stage !== stage) {
      await updateStage.mutateAsync({ id: draggedId, stage });
    }
    setDraggedId(null);
  };

  const totalValue = (stageLeads: WLPartnerLead[]) =>
    stageLeads.reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);

  return (
    <WhiteLabelLayout>
      <SEO title="Pipeline — White Label Partner" description="Visual pipeline of your sales leads" suppressBranding />
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Pipeline</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Drag and drop leads between stages
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PIPELINE_STAGES.map((s) => (
              <Skeleton key={s.id} className="h-64" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PIPELINE_STAGES.map((stage) => {
              const stageLeads = grouped[stage.id];
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(stage.id)}
                  className="flex flex-col"
                >
                  <Card className="p-3 mb-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{stage.label}</span>
                      <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
                    </div>
                    {totalValue(stageLeads) > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Value: {totalValue(stageLeads).toLocaleString()}
                      </div>
                    )}
                  </Card>
                  <div className="space-y-2 min-h-[200px]">
                    {stageLeads.map((lead) => (
                      <WLLeadCard
                        key={lead.id}
                        lead={lead}
                        draggable
                        onDragStart={() => setDraggedId(lead.id)}
                        onClick={() => { setEditing(lead); setDialogOpen(true); }}
                        onConvert={() => setConverting(lead)}
                      />
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-md">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <WLLeadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editing} />

      <WLConvertLeadDialog
        lead={converting}
        open={!!converting}
        onOpenChange={(o) => !o && setConverting(null)}
      />
    </WhiteLabelLayout>
  );
}
