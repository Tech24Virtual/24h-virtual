import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { BookiiEmbed } from '@/components/shared/BookiiEmbed';

export default function Booking() {
  return (
    <DashboardLayout>
      {/* Gradient header */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Book an Appointment</h1>
        <p className="text-muted-foreground mt-0.5">Schedule a call or meeting with our team</p>
      </div>

      <BookiiEmbed title="Client Booking" />
    </DashboardLayout>
  );
}
