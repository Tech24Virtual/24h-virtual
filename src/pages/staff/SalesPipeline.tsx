import { StaffLayout } from '@/components/staff/StaffLayout';
import { LeadPipelineBoard } from '@/components/crm/LeadPipelineBoard';

export default function SalesPipeline() {
  return (
    <StaffLayout role="sales">
      <LeadPipelineBoard />
    </StaffLayout>
  );
}
