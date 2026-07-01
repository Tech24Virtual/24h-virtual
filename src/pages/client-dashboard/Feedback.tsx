import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Inbox, MessageSquare, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { directStatusLabel } from '@/lib/feedback/directStatus';
import { FeedbackHistoryList } from '@/components/feedback/FeedbackHistoryList';
import { FeedbackReplyComposer } from '@/components/feedback/FeedbackReplyComposer';

type Row = {
  id: string;
  title: string | null;
  description: string | null;
  type: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export default function ClientFeedback() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('feedback')
      .select('id, title, description, type, status, created_at, resolved_at')
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
      .channel('client-feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user?.id]);

  const active = useMemo(() => rows.find(r => r.id === activeId) ?? null, [rows, activeId]);

  return (
    <DashboardLayout>
      {/* Gradient header */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">My Feedback</h1>
        <p className="text-muted-foreground mt-0.5">Your feedback and support conversations with 24H</p>
      </div>

      {!active ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" />My Feedback</CardTitle>
            <CardDescription>Anything you have submitted to 24H, plus replies from our team.</CardDescription>
          </CardHeader>
          <CardContent>
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
                      <Badge variant={r.status === 'resolved' || r.status === 'closed' ? 'outline' : 'default'}>
                        {directStatusLabel(r.status)}
                      </Badge>
                    </div>
                    <div className="font-medium truncate">{r.title || (r.description ?? '').slice(0, 100)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setActiveId(null)} className="-ml-2">
            <ChevronLeft className="h-4 w-4 mr-1" />Back to all feedback
          </Button>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">{active.type ?? 'feedback'}</Badge>
                <Badge>{directStatusLabel(active.status)}</Badge>
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
                <FeedbackHistoryList feedbackId={active.id} mode="direct_client" />
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
    </DashboardLayout>
  );
}
