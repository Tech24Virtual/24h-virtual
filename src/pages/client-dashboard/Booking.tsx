import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';

export default function Booking() {
  return (
    <DashboardLayout title="Book an Appointment" description="Schedule a call or meeting">
      <BookiiEmbed title="Client Booking" />
    </DashboardLayout>
  );
}
