import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Pencil, Trash2, MoreVertical, GitPullRequest, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ScriptDialog } from '@/components/client-dashboard/ScriptDialog';
import { ScriptChangeRequestDialog } from '@/components/client-dashboard/ScriptChangeRequestDialog';
import { ChangeRequestThread } from '@/components/client-dashboard/ChangeRequestThread';
import { LegacyMigratedBanner } from '@/components/campaign-os/LegacyMigratedBanner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

export interface Script {
  id: string;
  name: string;
  greeting: string | null;
  faqs: Array<{ question: string; answer: string }>;
  call_handling_rules: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  migrated_to_campaign_id?: string | null;
  migrated_at?: string | null;
}

interface ChangeRequest {
  id: string;
  title: string;
  description: string | null;
  request_type: string;
  status: string;
  proposed_changes: Record<string, unknown>;
  reviewer_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  script_id: string | null;
}

interface ApprovedFaq {
  id: string;
  question: string;
  answer_md: string;
  published_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_review:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  needs_info: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  approved:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function Scripts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [changeTargetScript, setChangeTargetScript] = useState<Script | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingScript, setDeletingScript] = useState<Script | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  // 1. Lead ID (needed for FAQ scoping)
  const { data: lead } = useQuery({
    queryKey: ['client-lead', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, pipeline_stage')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // 2. Scripts (client_scripts.client_id is FK to auth.users.id — use user.id directly)
  const { data: scripts = [], isLoading: scriptsLoading } = useQuery({
    queryKey: ['client-scripts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_scripts')
        .select('*')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []).map(row => ({
        ...row,
        faqs: Array.isArray(row.faqs) ? row.faqs as Array<{ question: string; answer: string }> : [],
        call_handling_rules: (row.call_handling_rules as Record<string, unknown>) || {},
      }))) as Script[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // 3. Change requests
  const { data: changeRequests = [] } = useQuery({
    queryKey: ['client-change-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('script_change_requests')
        .select('*')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data || []).map(r => ({
        ...r,
        proposed_changes: (r.proposed_changes as Record<string, unknown>) || {},
      }))) as ChangeRequest[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // 4. Approved FAQs (campaign_faq_entries.client_lead_id is FK to leads.id)
  const { data: approvedFaqs = [] } = useQuery({
    queryKey: ['client-approved-faqs', lead?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_faq_entries')
        .select('id, question, answer_md, published_at')
        .eq('status', 'approved')
        .eq('client_lead_id', lead!.id)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ApprovedFaq[];
    },
    enabled: !!lead?.id,
    staleTime: 60_000,
  });

  const handleCreate = () => { setEditingScript(null); setDialogOpen(true); };
  const handleEdit = (s: Script) => { setEditingScript(s); setDialogOpen(true); };
  const handleRequestChange = (s: Script) => { setChangeTargetScript(s); setChangeDialogOpen(true); };
  const handleDelete = (s: Script) => { setDeletingScript(s); setDeleteDialogOpen(true); };

  const confirmDelete = async () => {
    if (!deletingScript) return;
    try {
      const { error } = await supabase.from('client_scripts').delete().eq('id', deletingScript.id);
      if (error) throw error;
      toast.success('Script deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['client-scripts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['client-scripts-count', user?.id] });
    } catch {
      toast.error('Failed to delete script');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingScript(null);
    }
  };

  const toggleActive = async (script: Script) => {
    try {
      const { error } = await supabase
        .from('client_scripts')
        .update({ is_active: !script.is_active })
        .eq('id', script.id);
      if (error) throw error;
      toast.success(script.is_active ? 'Script deactivated' : 'Script activated');
      queryClient.invalidateQueries({ queryKey: ['client-scripts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['client-scripts-count', user?.id] });
    } catch {
      toast.error('Failed to update script');
    }
  };

  const handleDialogClose = (saved: boolean) => {
    setDialogOpen(false);
    setEditingScript(null);
    if (saved) {
      queryClient.invalidateQueries({ queryKey: ['client-scripts', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['client-scripts-count', user?.id] });
    }
  };

  const handleChangeDialogClose = (saved: boolean) => {
    setChangeDialogOpen(false);
    setChangeTargetScript(null);
    if (saved) queryClient.invalidateQueries({ queryKey: ['client-change-requests', user?.id] });
  };

  const pendingCount = changeRequests.filter(r => !['approved', 'rejected'].includes(r.status)).length;

  return (
    <DashboardLayout>
      {/* Gradient header */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Call Scripts</h1>
        <p className="text-muted-foreground mt-0.5">Manage your greeting scripts and request changes</p>
      </div>

      <Tabs defaultValue="scripts">
        <TabsList className="mb-6">
          <TabsTrigger value="scripts">
            <FileText className="w-4 h-4 mr-1" />
            My Scripts
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-1">
            <GitPullRequest className="w-4 h-4 mr-1" />
            My Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved-faqs">
            <BookOpen className="w-4 h-4 mr-1" />
            Approved FAQs
            {approvedFaqs.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{approvedFaqs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Scripts Tab */}
        <TabsContent value="scripts">
          <div className="mb-4">
            <LegacyMigratedBanner
              migratedCount={scripts.filter(s => !!s.migrated_to_campaign_id).length}
              totalCount={scripts.length}
              surfaceLabel="Client Dashboard"
            />
          </div>
          <div className="flex justify-end mb-4">
            <Button variant="cta" onClick={handleCreate}>
              <Plus className="mr-2 w-4 h-4" />
              New Script
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Scripts</CardTitle>
            </CardHeader>
            <CardContent>
              {scriptsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : scripts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium text-heading mb-2">No scripts yet</h3>
                  <p className="text-sm max-w-md mx-auto mb-6">
                    Create custom scripts to define how our receptionists greet your callers,
                    answer FAQs, and handle different call types.
                  </p>
                  <Button variant="cta" onClick={handleCreate}>
                    <Plus className="mr-2 w-4 h-4" />
                    Create Your First Script
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {scripts.map((script) => (
                    <div
                      key={script.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-heading">{script.name}</h4>
                          <Badge variant={script.is_active ? 'default' : 'secondary'}>
                            {script.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        {script.greeting && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{script.greeting}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {Array.isArray(script.faqs) ? script.faqs.length : 0} FAQs configured
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleRequestChange(script)}>
                          <GitPullRequest className="w-4 h-4 mr-1" />
                          Request Change
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(script)}>
                              <Pencil className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(script)}>
                              {script.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(script)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Change Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {changeRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <GitPullRequest className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No change requests yet. Use the "Request Change" button on any script to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {changeRequests.map((req) => (
                    <div key={req.id} className="border rounded-lg">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedRequest(expandedRequest === req.id ? null : req.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-medium">{req.title}</h4>
                            <Badge className={STATUS_COLORS[req.status]}>
                              {req.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(req.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                      {expandedRequest === req.id && (
                        <div className="px-4 pb-4 border-t pt-4">
                          <ChangeRequestThread request={req} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approved FAQs Tab */}
        <TabsContent value="approved-faqs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Approved FAQs</CardTitle>
            </CardHeader>
            <CardContent>
              {approvedFaqs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Your approved FAQs will appear here once your account team reviews your requests.</p>
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2" data-testid="approved-faqs-list">
                  {approvedFaqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="text-left font-medium hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="prose prose-sm max-w-none dark:prose-invert pb-2">
                          <ReactMarkdown>{faq.answer_md}</ReactMarkdown>
                        </div>
                        {faq.published_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Approved {format(new Date(faq.published_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ScriptDialog open={dialogOpen} onClose={handleDialogClose} script={editingScript} />
      <ScriptChangeRequestDialog open={changeDialogOpen} onClose={handleChangeDialogClose} script={changeTargetScript} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Script</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingScript?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
