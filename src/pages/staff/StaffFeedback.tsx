import { useEffect, useMemo, useState } from 'react';
import { StaffLayout } from '@/components/staff';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Inbox, MessageSquare, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { FeedbackHistoryList } from '@/components/feedback/FeedbackHistoryList';
import { FeedbackReplyComposer } from '@/components/feedback/FeedbackReplyComposer';
import type { StaffRole } from '@/config/staffNav';

interface Row {
  id: string;
  title: string | null;
  description: string | null;
  type: string | null;
  status: string;
  created_at: string;
  assigned_to: string | null;
}

interface StaffFeedbackProps {
  role: StaffRole;
}

/**
 * Internal-staff submitter history surface (24H queue).
 * Lists feedback the current staff user has submitted, with the same
 * append-only conversation thread as the direct-client view. Raw status
 * labels per spec — staff are operators and tolerate the real enums.
 */
export default function StaffFeedback({ role }: StaffFeedbackProps) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('feedback')
      .select('id, title, description, type, status, created_at, assigned_to')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('staff-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user?.id]);

  const active = useMemo(() => rows.find(r => r.id === activeId) ?? null, [rows, activeId]);

  return (
    <StaffLayout role={role}>
      <div className="space-y-6">
        {!active ? (
          <>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
                <Inbox className="h-6 w-6" />My Feedback
              </h1>
              <p className="text-muted-foreground mt-1">
                Feedback you have submitted to 24H admins, plus their replies.
              </p>
            </div>
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="py-8 text-sm text-muted-foreground">Loading…</div>
                ) : rows.length === 0 ? (
                  <div className="py-12 text-sm text-muted-foreground text-center">
                    You haven't submitted any feedback yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rows.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setActiveId(r.id)}
                        className="w-full text-left rounded-md border p-3 hover:bg-muted/50 transition"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="capitalize">{r.type ?? 'feedback'}</Badge>
                          <Badge variant={['resolved','closed'].includes(r.status) ? 'outline' : 'default'}>
                            {r.status}
                          </Badge>
                        </div>
                        <div className="font-medium truncate">
                          {r.title || (r.description ?? '').slice(0, 100)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                          {r.assigned_to ? ' · assigned' : ' · unassigned'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveId(null)} className="-ml-2">
              <ChevronLeft className="h-4 w-4 mr-1" />Back to all feedback
            </Button>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{active.type ?? 'feedback'}</Badge>
                  <Badge>{active.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Submitted {formatDistanceToNow(new Date(active.created_at), { addSuffix: true })}
                  </span>
                </div>
                <CardTitle className="mt-2">{active.title || 'Your feedback'}</CardTitle>
                {active.description && (
                  <CardDescription className="whitespace-pre-wrap pt-2">{active.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />Conversation
                  </div>
                  <FeedbackHistoryList feedbackId={active.id} mode="internal_staff" />
                </div>
                <FeedbackReplyComposer
                  feedbackId={active.id}
                  parentStatus={active.status}
                  mode="submitter"
                  resolvedFollowUp
                  onPosted={load}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
