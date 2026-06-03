import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Phone, Mail, FileText, Users, RefreshCw, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddActivityDialog } from './AddActivityDialog';

interface Activity {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface ActivityTimelineProps {
  leadId: string;
}

const activityIcons: Record<string, React.ElementType> = {
  note: FileText,
  call: Phone,
  email: Mail,
  meeting: Users,
  status_change: RefreshCw,
};

const activityColors: Record<string, string> = {
  note: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  call: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  email: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  meeting: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  status_change: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

export function ActivityTimeline({ leadId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<string>('note');
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, [leadId]);

  const fetchActivities = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading activities',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Cast the data to our Activity type
      const typedData = (data || []).map(item => ({
        ...item,
        metadata: item.metadata as Record<string, unknown> | null,
      }));
      setActivities(typedData);
    }
    setIsLoading(false);
  };

  const handleAddActivity = (type: string) => {
    setDefaultType(type);
    setDialogOpen(true);
  };

  const handleActivityAdded = () => {
    fetchActivities();
    setDialogOpen(false);
  };

  const formatActivityDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return `Today ${format(date, 'h:mm a')}`;
    if (diffDays === 1) return `Yesterday ${format(date, 'h:mm a')}`;
    if (diffDays < 7) return format(date, 'EEEE h:mm a');
    return format(date, 'MMM d, yyyy h:mm a');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => handleAddActivity('note')}>
            <FileText className="h-3 w-3 mr-1" />
            Note
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAddActivity('call')}>
            <Phone className="h-3 w-3 mr-1" />
            Call
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAddActivity('email')}>
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleAddActivity('meeting')}>
            <Users className="h-3 w-3 mr-1" />
            Meeting
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Loading activities...
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No activities yet</p>
              <p className="text-xs">Add a note, log a call, or record a meeting</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

              {activities.map((activity) => {
                const Icon = activityIcons[activity.activity_type] || FileText;
                const colorClass = activityColors[activity.activity_type] || activityColors.note;

                return (
                  <div key={activity.id} className="relative flex gap-4 pl-0">
                    {/* Icon */}
                    <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatActivityDate(activity.created_at)}
                        </span>
                      </div>
                      {activity.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                          {activity.description}
                        </p>
                      )}
                      {activity.activity_type === 'call' && activity.metadata?.duration && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Duration: {String(activity.metadata.duration)} min
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <AddActivityDialog
        leadId={leadId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={defaultType}
        onSuccess={handleActivityAdded}
      />
    </Card>
  );
}
