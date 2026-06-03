import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Clock, Send, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, isToday } from 'date-fns';
import { LogEmailDialog } from './LogEmailDialog';

interface EmailFollowupListProps {
  leadId: string;
  leadEmail?: string;
}

export function EmailFollowupList({ leadId, leadEmail }: EmailFollowupListProps) {
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ['email-followups', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_followups' as any)
        .select('*')
        .eq('lead_id', leadId)
        .order('follow_up_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const pending = followups.filter((f: any) => f.status === 'pending');
  const completed = followups.filter((f: any) => f.status === 'completed');

  const handleMarkComplete = async (id: string) => {
    const { error } = await supabase
      .from('email_followups' as any)
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Follow-up completed' });
      queryClient.invalidateQueries({ queryKey: ['email-followups', leadId] });
      queryClient.invalidateQueries({ queryKey: ['overdue-followups-count'] });
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['email-followups', leadId] });
    queryClient.invalidateQueries({ queryKey: ['crm-activities', leadId] });
    queryClient.invalidateQueries({ queryKey: ['overdue-followups-count'] });
  };

  const getItemStyle = (followUpAt: string) => {
    const date = new Date(followUpAt);
    if (isPast(date) && !isToday(date)) {
      return 'border-destructive/50 bg-destructive/5';
    }
    if (isToday(date)) {
      return 'border-orange-400/50 bg-orange-50 dark:bg-orange-950/20';
    }
    return '';
  };

  const getTextStyle = (followUpAt: string) => {
    const date = new Date(followUpAt);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-orange-600 dark:text-orange-400';
    return 'text-muted-foreground';
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Follow-ups
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setLogDialogOpen(true)}>
            Log Email
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : pending.length === 0 && completed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No email follow-ups logged yet
            </p>
          ) : (
            <>
              {pending.map((f: any) => (
                <div
                  key={f.id}
                  className={`rounded-lg border p-3 space-y-1 ${getItemStyle(f.follow_up_at)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isPast(new Date(f.follow_up_at)) && !isToday(new Date(f.follow_up_at)) && (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                        )}
                        <p className="text-sm font-medium truncate">{f.subject}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {f.direction === 'sent' ? (
                          <Send className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Inbox className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground truncate">{f.contact_email}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        <span className={`text-xs font-medium ${getTextStyle(f.follow_up_at)}`}>
                          {isPast(new Date(f.follow_up_at)) && !isToday(new Date(f.follow_up_at))
                            ? 'Overdue — '
                            : isToday(new Date(f.follow_up_at))
                            ? 'Due today — '
                            : 'Due '}
                          {format(new Date(f.follow_up_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-shrink-0 h-8"
                      onClick={() => handleMarkComplete(f.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Done
                    </Button>
                  </div>
                </div>
              ))}

              {completed.length > 0 && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowCompleted(!showCompleted)}
                  >
                    {showCompleted ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                    {completed.length} completed
                  </Button>
                  {showCompleted && (
                    <div className="space-y-1 mt-1">
                      {completed.map((f: any) => (
                        <div key={f.id} className="rounded-lg border p-2 opacity-60">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            <span className="text-xs line-through">{f.subject}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <LogEmailDialog
        leadId={leadId}
        leadEmail={leadEmail}
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
