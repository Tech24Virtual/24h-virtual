import { useEffect, useState } from 'react';
import { Star, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  reviewer_name: string | null;
  reviewer_email: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  source: string;
  is_public: boolean;
  created_at: string;
}

function StarRow({ value, onChange, size = 'md' }: { value: number; onChange?: (n: number) => void; size?: 'sm' | 'md' }) {
  const px = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(onChange ? 'cursor-pointer' : 'cursor-default')}
        >
          <Star className={cn(px, n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
        </button>
      ))}
    </div>
  );
}

export default function WLPortalReviews() {
  const { clientInfo, partnerId } = useWLPortal();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ reviewer_name: '', reviewer_email: '', rating: 5, title: '', content: '' });

  const load = async () => {
    if (!clientInfo) return;
    setLoading(true);
    const { data } = await supabase
      .from('wl_client_reviews')
      .select('*')
      .eq('wl_client_id', clientInfo.id)
      .order('created_at', { ascending: false });
    setReviews((data || []) as Review[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientInfo]);

  const submit = async () => {
    if (!clientInfo || !partnerId) return;
    setSubmitting(true);
    const { error } = await supabase.from('wl_client_reviews').insert({
      partner_id: partnerId,
      wl_client_id: clientInfo.id,
      reviewer_name: form.reviewer_name || null,
      reviewer_email: form.reviewer_email || null,
      rating: form.rating,
      title: form.title || null,
      content: form.content || null,
      source: 'portal',
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not save review', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Review submitted', description: 'Thanks for the feedback.' });
    setForm({ reviewer_name: '', reviewer_email: '', rating: 5, title: '', content: '' });
    setOpen(false);
    load();
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <WLPortalLayout title="Reviews" description="Customer feedback collected for your business">
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Reviews</p>
            <p className="text-2xl font-bold text-heading mt-1">{reviews.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Average Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-heading">{avg.toFixed(1)}</p>
              <StarRow value={Math.round(avg)} size="sm" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Add Feedback</p>
              <p className="text-xs text-muted-foreground mt-1">Submit on behalf of a customer</p>
            </div>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">All Reviews</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-heading mb-2">No reviews yet</h3>
              <p className="text-sm">Click "New" to capture customer feedback.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="py-4 border-b last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <StarRow value={r.rating} size="sm" />
                        {r.is_public && <Badge variant="secondary" className="text-xs">Public</Badge>}
                      </div>
                      {r.title && <p className="font-medium text-heading mt-1">{r.title}</p>}
                      <p className="text-sm text-muted-foreground mt-1">
                        {r.reviewer_name || 'Anonymous'} {r.reviewer_email ? `· ${r.reviewer_email}` : ''}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {r.content && <p className="text-sm mt-2 whitespace-pre-wrap">{r.content}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Review</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="mt-1"><StarRow value={form.rating} onChange={(n) => setForm({ ...form, rating: n })} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rn">Reviewer Name</Label>
                <Input id="rn" value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="re">Reviewer Email</Label>
                <Input id="re" type="email" value={form.reviewer_email} onChange={(e) => setForm({ ...form, reviewer_email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="rt">Title</Label>
              <Input id="rt" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="rc">Feedback</Label>
              <Textarea id="rc" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? 'Saving...' : 'Save Review'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WLPortalLayout>
  );
}
