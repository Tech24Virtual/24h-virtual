import { BookiiEmbed } from '@/components/shared/BookiiEmbed';

export default function AdminCalendar() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-heading">Appointments</h1>
        <p className="text-muted-foreground mt-1">Manage appointments and calendars via Bookii</p>
      </div>
      <BookiiEmbed title="Admin Appointments" />
    </div>
  );
}
