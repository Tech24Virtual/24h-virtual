import { FulfillmentIntakeQueue } from '@/components/admin/fulfillment/FulfillmentIntakeQueue';
import { SEO } from '@/components/SEO';

export default function AdminFulfillmentIntake() {
  return (
    <>
      <SEO title="Fulfillment Intake — Admin" description="Internal fulfillment intake queue" />
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-2xl font-bold">Fulfillment Intake</h1>
          <p className="text-sm text-muted-foreground">
            Review and process partner submissions for service activation.
          </p>
        </div>
        <FulfillmentIntakeQueue />
      </div>
    </>
  );
}
