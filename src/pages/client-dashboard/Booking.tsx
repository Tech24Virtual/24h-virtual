import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';

export default function Booking() {
  return (
    <DashboardLayout>
      <div className="space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Book an Appointment</h1>
          <p className="text-muted-foreground">Schedule a call or meeting</p>
        </div>
        <BookiiEmbed title="Client Booking" />
      </div>
    </DashboardLayout>
  );
}
