import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HelpCircle, Sparkles, ChevronDown, ChevronUp,
  Send, CheckCircle, AlertTriangle, Clock, MessageCircle, Plus,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { PiPAssistant } from '@/components/pip/PiPAssistant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface StaffSupportProps {
  role: 'sales' | 'agent' | 'supervisor' | 'billing' | 'tech';
}

interface SupportRequestRow {
  id: string;
  description: string;
  issue_type: string | null;
  status: string | null;
  created_at: string;
  ai_response: string | null;
  resolution_notes: string | null;
}

function parseDescription(raw: string): { subject: string; body: string } {
  const idx = raw.indexOf('\n\n');
  if (idx === -1) return { subject: raw, body: '' };
  return { subject: raw.slice(0, idx), body: raw.slice(idx + 2) };
}

function categoryLabel(type: string | null): string {
  switch (type) {
    case 'how_to': return 'How-To';
    case 'bug': return 'Bug / Error';
    case 'feature_question': return 'Feature Question';
    case 'calculation_error': return 'Calculation Error';
    default: return 'Other';
  }
}

function RequestStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'resolved':
      return (
        <Badge className="bg-green-500/10 text-green-700 border border-green-300 dark:text-green-400 dark:border-green-700">
          <CheckCircle className="w-3 h-3 mr-1" />Resolved
        </Badge>
      );
    case 'escalated':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />Escalated
        </Badge>
      );
    case 'analyzing':
    case 'analyzed':
      return (
        <Badge className="bg-blue-500/10 text-blue-700 border border-blue-300 dark:text-blue-400 dark:border-blue-700 gap-1">
          <Clock className="w-3 h-3" />In Review
        </Badge>
      );
    default:
      return <Badge variant="secondary">Open</Badge>;
  }
}

// ── Agent-specific redesign ────────────────────────────────────────────────────

function AgentSupportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('how_to');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pipOpen, setPipOpen] = useState(false);

  const { data: requests = [], isLoading } = useQuery<SupportRequestRow[]>({
    queryKey: ['my-support-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_requests')
        .select('id, description, issue_type, status, created_at, ai_response, resolution_notes')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SupportRequestRow[];
    },
    enabled: !!user?.id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const description = body.trim()
        ? `${subject.trim()}\n\n${body.trim()}`
        : subject.trim();
      const { error } = await supabase.from('support_requests').insert({
        user_id: user!.id,
        issue_type: category,
        description,
        dashboard_context: 'agent',
        page_url: window.location.href,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-support-requests'] });
      setSubmitted(true);
    },
    onError: () => toast.error('Failed to submit request — please try again.'),
  });

  const handleSubmit = () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    submitMutation.mutate();
  };

  const resetForm = () => {
    setSubject('');
    setCategory('how_to');
    setBody('');
    setSubmitted(false);
  };

  return (
    <StaffLayout role="agent">
      <div className="-m-6 lg:-m-8 min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-background dark:via-background dark:to-slate-900/50">
        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-5">

          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Help &amp; Support
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Submit a request or ask PiP AI for instant guidance
            </p>
          </div>

          {/* Section 1 — Submit a Support Request */}
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                Submit a Support Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="flex flex-col items-center py-8 text-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="font-semibold text-foreground">Request submitted!</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Your request has been logged. We'll review it and follow up if needed.
                  </p>
                  <Button variant="outline" size="sm" className="mt-1 gap-1" onClick={resetForm}>
                    <Plus className="h-3.5 w-3.5" />
                    Submit another
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="support-subject">Subject <span className="text-destructive">*</span></Label>
                      <Input
                        id="support-subject"
                        placeholder="Brief description of your issue"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        disabled={submitMutation.isPending}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="support-category">Category</Label>
                      <Select value={category} onValueChange={setCategory} disabled={submitMutation.isPending}>
                        <SelectTrigger id="support-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="how_to">How-To / Usage</SelectItem>
                          <SelectItem value="bug">Bug / Error</SelectItem>
                          <SelectItem value="feature_question">Feature Question</SelectItem>
                          <SelectItem value="calculation_error">Calculation Error</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="support-description">
                      Additional details <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="support-description"
                      placeholder="Describe what happened, what you expected, and any steps to reproduce..."
                      rows={4}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      disabled={submitMutation.isPending}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending || !subject.trim()}
                      className="gap-2"
                    >
                      {submitMutation.isPending ? (
                        <>Submitting…</>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2 — My Support Requests */}
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                My Requests
              </CardTitle>
              {!isLoading && (
                <Badge variant="secondary" className="font-mono tabular-nums">
                  {requests.length}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-5 w-16 ml-auto" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-foreground">No support requests yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use the form above to get help with anything
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {requests.map((req) => {
                    const { subject: reqSubject, body: reqBody } = parseDescription(req.description);
                    const isExpanded = expandedId === req.id;

                    return (
                      <div key={req.id}>
                        <button
                          className="w-full flex items-center gap-3 px-2 py-3 hover:bg-muted/50 rounded-lg transition-colors text-left"
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{reqSubject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {categoryLabel(req.issue_type)} ·{' '}
                              {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <RequestStatusBadge status={req.status} />
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          }
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-4 space-y-3">
                            <div className="text-xs text-muted-foreground">
                              Submitted {format(new Date(req.created_at), 'MMM d, yyyy h:mm a')}
                            </div>

                            {reqBody && (
                              <div className="rounded-lg bg-muted/40 border p-3 text-sm text-foreground whitespace-pre-wrap">
                                {reqBody}
                              </div>
                            )}

                            {req.ai_response && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-primary flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" /> PiP Response
                                </p>
                                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm text-foreground whitespace-pre-wrap">
                                  {req.ai_response}
                                </div>
                              </div>
                            )}

                            {req.resolution_notes && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Resolution Notes</p>
                                <div className="rounded-lg bg-muted/40 border p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                                  {req.resolution_notes}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3 — PiP AI Assistant (collapsible) */}
          <Card className="shadow-sm rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors"
              onClick={() => setPipOpen((o) => !o)}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Ask PiP AI</p>
                  <p className="text-xs text-muted-foreground">Get instant AI-powered guidance</p>
                </div>
              </div>
              {pipOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              }
            </button>

            {pipOpen && (
              <div className="px-6 pb-6 pt-1 border-t">
                <PiPAssistant dashboardContext="agent" />
              </div>
            )}
          </Card>

        </div>
      </div>
    </StaffLayout>
  );
}

// ── Export (branches on role) ──────────────────────────────────────────────────

export default function StaffSupport({ role }: StaffSupportProps) {
  if (role === 'agent') {
    return <AgentSupportPage />;
  }

  return (
    <StaffLayout role={role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">PiP Assistant</h1>
          <p className="text-muted-foreground mt-1">Your AI-powered guide to your dashboard</p>
        </div>
        <PiPAssistant dashboardContext={role} />
      </div>
    </StaffLayout>
  );
}
