import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Video, ExternalLink, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface CalendarMeeting {
  id: string;
  event_type: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  status: string;
  attendee_name: string | null;
  attendee_email: string | null;
  meeting_link: string | null;
  calendly_event_url: string | null;
  location: string | null;
  lead_id: string | null;
  lead?: { name: string; company: string | null } | null;
}

interface MeetingsCalendarViewProps {
  meetings: CalendarMeeting[];
  onMarkCompleted?: (id: string) => void;
  onMarkNoShow?: (id: string) => void;
}

const statusDotColors: Record<string, string> = {
  scheduled: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
  no_show: 'bg-orange-500',
};

const statusBadgeStyles: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  no_show: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

export function MeetingsCalendarView({ meetings, onMarkCompleted, onMarkNoShow }: MeetingsCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, CalendarMeeting[]>();
    meetings.forEach((m) => {
      const key = format(new Date(m.scheduled_at), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return map;
  }, [meetings]);

  const selectedDayMeetings = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return (meetingsByDate.get(key) || []).sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );
  }, [selectedDate, meetingsByDate]);

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {/* Calendar grid */}
        {calendarDays.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayMeetings = meetingsByDate.get(key) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(day)}
              className={cn(
                'relative flex flex-col items-center p-2 min-h-[60px] rounded-lg text-sm transition-colors border',
                !inMonth && 'text-muted-foreground/40 border-transparent',
                inMonth && !isSelected && 'border-transparent hover:bg-muted/50',
                isSelected && 'bg-primary/10 border-primary/30',
                today && !isSelected && 'bg-accent/50'
              )}
            >
              <span className={cn('font-medium', today && 'text-primary')}>{format(day, 'd')}</span>
              {dayMeetings.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {dayMeetings.slice(0, 4).map((m) => (
                    <span
                      key={m.id}
                      className={cn('w-1.5 h-1.5 rounded-full', statusDotColors[m.status] || 'bg-muted-foreground')}
                    />
                  ))}
                  {dayMeetings.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">+{dayMeetings.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail panel */}
      {selectedDate && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-semibold text-sm">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')} · {selectedDayMeetings.length} meeting{selectedDayMeetings.length !== 1 ? 's' : ''}
            </h4>
            {selectedDayMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings on this day.</p>
            ) : (
              selectedDayMeetings.map((meeting) => (
                <div key={meeting.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{meeting.event_type || 'Meeting'}</span>
                      <Badge className={statusBadgeStyles[meeting.status] || ''}>
                        {meeting.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(meeting.scheduled_at), 'h:mm a')}
                      {meeting.duration_minutes && ` · ${meeting.duration_minutes} min`}
                      {meeting.location && ` · ${meeting.location}`}
                    </p>
                    {meeting.attendee_name && (
                      <p className="text-xs flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {meeting.attendee_name}
                        {meeting.attendee_email && (
                          <span className="text-muted-foreground">({meeting.attendee_email})</span>
                        )}
                      </p>
                    )}
                    {meeting.lead && (
                      <p className="text-xs text-primary">
                        {meeting.lead.name}
                        {meeting.lead.company && ` (${meeting.lead.company})`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {meeting.meeting_link && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                          <Video className="h-3.5 w-3.5 mr-1" />
                          Join
                        </a>
                      </Button>
                    )}
                    {meeting.calendly_event_url && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={meeting.calendly_event_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {meeting.status === 'scheduled' && onMarkCompleted && (
                      <Button variant="ghost" size="sm" onClick={() => onMarkCompleted(meeting.id)} title="Mark completed">
                        <span className="text-green-600 text-xs">✓</span>
                      </Button>
                    )}
                    {meeting.status === 'scheduled' && onMarkNoShow && (
                      <Button variant="ghost" size="sm" onClick={() => onMarkNoShow(meeting.id)} title="Mark no-show">
                        <span className="text-orange-600 text-xs">✗</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
