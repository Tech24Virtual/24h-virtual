import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ChangeRequestThread } from '@/components/client-dashboard/ChangeRequestThread';
import type { Json } from '@/integrations/supabase/types';

interface ChangeRequestWithClient {
  id: string;
  client_id: string;
  script_id: string | null;
  request_type: string;
  title: string;
  description: string | null;
  proposed_changes: Record<string, unknown>;
  status: string;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  resolved_at: string | null;
  source: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  script_name: string | null;
}

interface ScriptReviewDetailProps {
  request: ChangeRequestWithClient;
  onBack: () => void;
}

interface ScriptData {
  id: string;
  name: string;
  greeting: string | null;
  faqs: Json | null;
}

export function ScriptReviewDetail({ request, onBack }: ScriptReviewDetailProps) {
  const { user } = useAuth();
  const [reviewerNotes, setReviewerNotes] = useState(request.reviewer_notes || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentScript, setCurrentScript] = useState<ScriptData | null>(null);
  const [currentRequest, setCurrentRequest] = useState(request);

  useEffect(() => {
    if (request.script_id) {
      supabase
        .from('client_scripts')
        .select('id, name, greeting, faqs')
        .eq('id', request.script_id)
        .single()
        .then(({ data }) => { if (data) setCurrentScript(data); });
    }
  }, [request.script_id]);

  const handleAction = async (action: 'approved' | 'rejected' | 'needs_info') => {
    if (!user) return;
    setIsProcessing(true);

    try {
      const updates: Record<string, unknown> = {
        status: action,
        reviewed_by: user.id,
        reviewer_notes: reviewerNotes || null,
      };

      if (action === 'approved' || action === 'rejected') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('script_change_requests')
        .update(updates)
        .eq('id', request.id);

      if (error) throw error;

      // If approved, apply changes to the script and bridge to Campaign OS
      if (action === 'approved') {
        if (request.script_id) await applyChanges();
        await applyFaqBridge();
      }

      // Add a system comment
      const actionLabel = action === 'approved' ? 'approved' : action === 'rejected' ? 'rejected' : 'requested more information on';
      await supabase.from('script_change_comments').insert({
        request_id: request.id,
        author_id: user.id,
        author_name: 'Supervisor',
        message: `Request ${actionLabel}.${reviewerNotes ? ` Notes: ${reviewerNotes}` : ''}`,
      });

      setCurrentRequest({ ...currentRequest, status: action, reviewer_notes: reviewerNotes });
      toast.success(`Request ${action.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error processing request:', error);
      toast.error('Failed to process request');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyChanges = async () => {
    if (!request.script_id) return;

    const changes = request.proposed_changes;
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (changes.greeting !== undefined) {
      updateData.greeting = changes.greeting;
    }

    if (changes.faq && typeof changes.faq === 'object') {
      // Add new FAQ to existing list
      const currentFaqs = Array.isArray(currentScript?.faqs) ? currentScript.faqs : [];
      const newFaq = changes.faq as { question: string; answer: string };
      if (request.request_type === 'new_faq') {
        updateData.faqs = [...currentFaqs, newFaq];
      }
    }

    if (Object.keys(updateData).length > 1) {
      await supabase
        .from('client_scripts')
        .update(updateData as Record<string, Json>)
        .eq('id', request.script_id);
    }
  };

  const applyFaqBridge = async () => {
    const faqTypes = ['new_faq', 'faq_update', 'remove_faq'];
    if (!faqTypes.includes(request.request_type)) return;

    // Resolve the client's lead_id from their user_id
    const { data: lead, error: leadErr } = await (supabase as any)
      .from('leads')
      .select('id')
      .eq('user_id', request.client_id)
      .maybeSingle();
    if (leadErr || !lead) return;

    const clientLeadId = lead.id as string;
    const faq = request.proposed_changes.faq as { question?: string; answer?: string } | undefined;

    if (request.request_type === 'new_faq' && faq?.question) {
      await (supabase as any).from('campaign_faq_entries').insert({
        tenant_kind: 'direct_24h',
        wl_partner_id: null,
        client_lead_id: clientLeadId,
        wl_client_id: null,
        scope: 'client',
        question: faq.question,
        answer_md: faq.answer ?? '',
        tags: [],
        status: 'approved',
        published_at: new Date().toISOString(),
      });
      return;
    }

    if (request.request_type === 'faq_update' && faq?.question) {
      // Try to update an existing row matched by question; insert if none found.
      const { data: existing } = await (supabase as any)
        .from('campaign_faq_entries')
        .select('id, version')
        .eq('client_lead_id', clientLeadId)
        .ilike('question', faq.question)
        .neq('status', 'archived')
        .maybeSingle();

      if (existing) {
        await (supabase as any)
          .from('campaign_faq_entries')
          .update({
            answer_md: faq.answer ?? '',
            status: 'approved',
            published_at: new Date().toISOString(),
            version: (existing.version ?? 1) + 1,
          })
          .eq('id', existing.id);
      } else {
        await (supabase as any).from('campaign_faq_entries').insert({
          tenant_kind: 'direct_24h',
          wl_partner_id: null,
          client_lead_id: clientLeadId,
          wl_client_id: null,
          scope: 'client',
          question: faq.question,
          answer_md: faq.answer ?? '',
          tags: [],
          status: 'approved',
          published_at: new Date().toISOString(),
        });
      }
      return;
    }

    if (request.request_type === 'remove_faq' && faq?.question) {
      const { data: existing } = await (supabase as any)
        .from('campaign_faq_entries')
        .select('id')
        .eq('client_lead_id', clientLeadId)
        .ilike('question', faq.question)
        .neq('status', 'archived')
        .maybeSingle();

      if (existing) {
        await (supabase as any)
          .from('campaign_faq_entries')
          .update({ status: 'archived' })
          .eq('id', existing.id);
      }
    }
  };

  const isResolved = currentRequest.status === 'approved' || currentRequest.status === 'rejected';

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Reviews
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Request details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{request.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
              <span>{request.client_name}</span>
              {request.script_name && <span>• {request.script_name}</span>}
              <span>• {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.description && (
              <div>
                <Label className="text-xs">Description</Label>
                <p className="text-sm mt-1">{request.description}</p>
              </div>
            )}

            {/* Proposed changes diff */}
            <div>
              <Label className="text-xs">Proposed Changes</Label>
              <div className="mt-2 space-y-3">
                {request.proposed_changes.greeting !== undefined && (
                  <div className="space-y-2">
                    {request.proposed_changes.current_greeting && (
                      <div className="p-3 rounded bg-red-50 dark:bg-red-950/20 border-l-4 border-red-400 text-sm">
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Current</p>
                        <p>{String(request.proposed_changes.current_greeting)}</p>
                      </div>
                    )}
                    <div className="p-3 rounded bg-green-50 dark:bg-green-950/20 border-l-4 border-green-400 text-sm">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Proposed</p>
                      <p>{String(request.proposed_changes.greeting)}</p>
                    </div>
                  </div>
                )}

                {request.proposed_changes.faq && typeof request.proposed_changes.faq === 'object' && (
                  <div className="p-3 rounded bg-green-50 dark:bg-green-950/20 border-l-4 border-green-400 text-sm">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                      {request.request_type === 'new_faq' ? 'New FAQ' : 'Updated FAQ'}
                    </p>
                    <p className="font-medium">{(request.proposed_changes.faq as Record<string, string>).question}</p>
                    <p className="text-muted-foreground mt-1">{(request.proposed_changes.faq as Record<string, string>).answer}</p>
                  </div>
                )}

                {Object.keys(request.proposed_changes).length === 0 && (
                  <p className="text-sm text-muted-foreground">See description for details.</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {!isResolved && (
              <div className="space-y-3 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="reviewer-notes">Supervisor Notes</Label>
                  <Textarea
                    id="reviewer-notes"
                    placeholder="Add notes (optional)..."
                    rows={2}
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleAction('approved')}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve & Apply
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAction('needs_info')}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Need More Info
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction('rejected')}
                    disabled={isProcessing}
                    className="gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              </div>
            )}

            {isResolved && (
              <div className="pt-4 border-t">
                <Badge className={currentRequest.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {currentRequest.status === 'approved' ? '✅ Approved & Applied' : '❌ Rejected'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Conversation thread */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChangeRequestThread request={currentRequest} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
