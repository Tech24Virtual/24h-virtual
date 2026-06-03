import { StaffLayout } from '@/components/staff/StaffLayout';
import { SEO } from '@/components/SEO';
import { FulfillmentIntakeQueue } from '@/components/admin/fulfillment/FulfillmentIntakeQueue';

export default function SupervisorFulfillment() {
  return (
    <StaffLayout role="supervisor">
      <SEO title="Fulfillment — Supervisor" description="Operational fulfillment queue" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fulfillment</h1>
          <p className="text-sm text-muted-foreground">
            Operational queue. You can review submissions, request more info, and
            advance status. Closing intakes and urgent escalations are admin-only.
          </p>
        </div>
        <FulfillmentIntakeQueue mode="supervisor" />
      </div>
    </StaffLayout>
  );
}
