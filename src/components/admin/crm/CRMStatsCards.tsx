import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Calendar, CalendarCheck, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CRMStatsCardsProps {
  overdueTasks: number;
  todayTasks: number;
  weekTasks: number;
  totalActivities: number;
  isLoading?: boolean;
}

export function CRMStatsCards({
  overdueTasks,
  todayTasks,
  weekTasks,
  totalActivities,
  isLoading = false,
}: CRMStatsCardsProps) {
  const stats = [
    {
      label: 'Overdue',
      value: overdueTasks,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
    },
    {
      label: 'Due Today',
      value: todayTasks,
      icon: Calendar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    {
      label: 'This Week',
      value: weekTasks,
      icon: CalendarCheck,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      label: 'Activities (7d)',
      value: totalActivities,
      icon: Activity,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-border',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={cn(
            'border transition-all hover:shadow-md',
            stat.borderColor
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn('text-2xl font-bold', stat.color)}>
                  {isLoading ? '—' : stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
