import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { clientSafeStatusLabel } from '@/lib/feedback/clientSafeStatus';
import { WLFeedbackThread } from '@/components/feedback/WLFeedbackThread';

type Row = {
  id: string;
  partner_id: string;
  type: string;
  title: string | null;
  description: string;
  status: string;
  created_at: string;
};

export default function WLPortalFeedback() {
  const { partnerId, branding } = useWLPortal();
  const { user } = useAuth();
  const partnerName = branding?.company_name || 'Support team';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', type: 'feedback' });

  const load = async () => {
    if (!partnerId || !user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('wl_partner_feedback')
      .select('id, partner_id, type, title, description, status, created_at')
      .eq('partner_id', partnerId)
      .eq('submitted_by_user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, user?.id]);

  const submit = async () => {
    if (!partnerId || !user) return;
    if (!draft.description.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('wl_partner_feedback').insert({
        partner_id: partnerId,
        origin: 'end_client',
        submitted_by_type: 'wl_end_client',
        submitted_by_user_id: user.id,
        submitted_by_email: user.email ?? null,
        type: draft.type || 'feedback',
        title: draft.title.trim() || null,
        description: draft.description.trim(),
        priority: 'normal',
        status: 'new',
        source_dashboard: 'wl_end_client',
      });
      if (error) throw error;
      toast.success('Submitted');
      setCreating(false);
      setDraft({ title: '', description: '', type: 'feedback' });
      load();
    } catch (e: any) {
      toast.error(e.message ?? 'Could not submit');
    } finally {
      setSubmitting(false);
    }
  };

  const open = openId ? rows.find(r => r.id === openId) ?? null : null;

  return (
    <WLPortalLayout title="Feedback" description={`Send feedback or questions to ${partnerName}, and follow your conversation.`}>
      <div className="flex items-start justify-end mb-6 gap-3">
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New feedback</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New feedback</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Short summary (optional)" />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea rows={5} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Describe your feedback or question." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={submit} disabled={submitting || !draft.description.trim()}>
                {submitting ? 'Sending…' : 'Send'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No feedback yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{r.type}</Badge>
                  <Badge variant="secondary">{clientSafeStatusLabel(r.status)}</Badge>
                </div>
                <CardTitle className="text-base mt-1">{r.title || r.description.slice(0, 80)}</CardTitle>
                <CardDescription className="text-xs">
                  {format(new Date(r.created_at), 'PP')} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap line-clamp-3">{r.description}</p></CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Drawer-style dialog with conversation */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="capitalize">{open.type}</Badge>
                  <Badge variant="secondary">{clientSafeStatusLabel(open.status)}</Badge>
                </div>
                <DialogTitle className="text-left mt-1">{open.title || open.description.slice(0, 80)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{open.description}</p>
                <div className="border-t pt-4">
                  <WLFeedbackThread
                    feedbackId={open.id}
                    parentStatus={open.status}
                    mode="wl_end_client"
                    partnerDisplayName={partnerName}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </WLPortalLayout>
  );
}
