import { useState } from 'react';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { ActiveSubscriptionsList } from '@/components/admin/ActiveSubscriptionsList';

export default function BillingSubscriptions() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <StaffLayout role="billing">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">View all active client subscriptions</p>
        </div>
        <ActiveSubscriptionsList searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </div>
    </StaffLayout>
  );
}
