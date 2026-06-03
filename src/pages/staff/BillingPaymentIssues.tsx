import { StaffLayout } from '@/components/staff/StaffLayout';
import { PaymentFailures } from '@/components/admin/PaymentFailures';

export default function BillingPaymentIssues() {
  return (
    <StaffLayout role="billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payment Issues</h1>
          <p className="text-muted-foreground">Manage failed payments and card update requests</p>
        </div>
        <PaymentFailures />
      </div>
    </StaffLayout>
  );
}
