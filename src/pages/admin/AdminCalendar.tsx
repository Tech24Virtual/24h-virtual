import { BookiiEmbed } from '@/components/shared/BookiiEmbed';

export default function AdminCalendar() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Scheduling & Calendar</h1>
        <p className="text-muted-foreground">Manage appointments and calendars via Bookii</p>
      </div>
      <BookiiEmbed title="Admin Calendar" />
    </div>
  );
}
