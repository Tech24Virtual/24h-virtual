import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  FileText, 
  Phone, 
  Mail, 
  Calendar, 
  GitBranch, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  lead_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
  lead?: {
    name: string;
    company: string | null;
  };
}

const activityConfig: Record<string, { icon: typeof Activity; color: string; bgColor: string }> = {
  note: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  call: { icon: Phone, color: 'text-green-600', bgColor: 'bg-green-100' },
  email: { icon: Mail, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  meeting: { icon: Calendar, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  status_change: { icon: GitBranch, color: 'text-primary', bgColor: 'bg-primary/10' },
  task: { icon: Activity, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

interface GlobalActivityFeedProps {
  limit?: number;
  showTitle?: boolean;
}

export function GlobalActivityFeed({ limit = 20, showTitle = true }: GlobalActivityFeedProps) {
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['global-crm-activities', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('*, lead:leads(name, company)')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as ActivityItem[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getActivityIcon = (type: string) => {
    return activityConfig[type] || activityConfig.note;
  };

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading activities…</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-destructive/80">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Failed to load activities</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verify <code className="font-mono">GRANT SELECT ON public.crm_activities</code> is applied.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activities yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="max-h-[500px] overflow-y-auto">
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const config = getActivityIcon(activity.activity_type);
            const Icon = config.icon;
            
            return (
              <div key={activity.id} className="flex gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className={cn('p-2 rounded-full', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  {index < activities.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{activity.title}</p>
                      {activity.lead && (
                        <Link
                          to={`/admin/leads/${activity.lead_id}`}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {activity.lead.name}
                          {activity.lead.company && ` • ${activity.lead.company}`}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  {activity.activity_type === 'call' && activity.metadata?.duration && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Duration: {activity.metadata.duration as string} min
                    </Badge>
                  )}
                  {activity.activity_type === 'email' && activity.metadata?.email_type && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {(activity.metadata.email_type as string).replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
