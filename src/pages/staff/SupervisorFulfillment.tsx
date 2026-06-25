import { Package } from 'lucide-react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { SEO } from '@/components/SEO';
import { FulfillmentIntakeQueue } from '@/components/admin/fulfillment/FulfillmentIntakeQueue';

export default function SupervisorFulfillment() {
  return (
    <StaffLayout role="supervisor">
      <SEO title="Fulfillment — Supervisor" description="Operational fulfillment queue" />
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Fulfillment</h1>
              <p className="text-muted-foreground mt-0.5">
                Operational queue — review submissions, request more info, and advance status. Closing intakes is admin-only.
              </p>
            </div>
          </div>
        </div>
        <FulfillmentIntakeQueue mode="supervisor" />
      </div>
    </StaffLayout>
  );
}
