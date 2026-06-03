import { useNavigate, useSearchParams } from 'react-router-dom';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { WLProposalForm } from '@/components/white-label/proposals/WLProposalForm';
import { useWLPartnerProposalMutations } from '@/hooks/wl/useWLPartnerProposalMutations';
import { SEO } from '@/components/SEO';

export default function WLProposalNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const defaultLeadId = params.get('lead_id');
  const { createProposal } = useWLPartnerProposalMutations();

  return (
    <WhiteLabelLayout>
      <SEO title="New Proposal — White Label Partner" description="Create a new proposal" suppressBranding />
      <div className="space-y-6 max-w-3xl">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-2"
            onClick={() => navigate('/white-label-dashboard/clients/proposals')}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to proposals
          </Button>
          <h1 className="text-2xl font-bold">New Proposal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Saved as a draft. You can edit freely before sending.
          </p>
        </div>

        <Card className="p-6">
          <WLProposalForm
            defaultLeadId={defaultLeadId}
            submitting={createProposal.isPending}
            submitLabel="Create proposal"
            onCancel={() => navigate('/white-label-dashboard/clients/proposals')}
            onSubmit={async (values) => {
              const created = await createProposal.mutateAsync(values);
              navigate(`/white-label-dashboard/clients/proposals/${created.id}`);
            }}
          />
        </Card>
      </div>
    </WhiteLabelLayout>
  );
}
