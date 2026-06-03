import { useState, useEffect } from 'react';
import { Plus, FileText, Pencil, Trash2, MoreVertical, GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function Scripts() {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [changeTargetScript, setChangeTargetScript] = useState<Script | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingScript, setDeletingScript] = useState<Script | null>(null);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchScripts();
      fetchChangeRequests();
    }
  }, [user]);

  const fetchScripts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_scripts')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const scripts: Script[] = (data || []).map(row => ({
        ...row,
        faqs: Array.isArray(row.faqs) ? row.faqs as Array<{ question: string; answer: string }> : [],
        call_handling_rules: (row.call_handling_rules as Record<string, unknown>) || {},
      }));
      setScripts(scripts);
    } catch (error) {
      console.error('Error fetching scripts:', error);
      toast.error('Failed to load scripts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChangeRequests = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('script_change_requests')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChangeRequests((data || []).map(r => ({
        ...r,
        proposed_changes: (r.proposed_changes as Record<string, unknown>) || {},
      })));
    } catch (error) {
      console.error('Error fetching change requests:', error);
    }
  };

  const handleCreate = () => {
    setEditingScript(null);
    setDialogOpen(true);
  };

  const handleRequestChange = (script: Script) => {
    setChangeTargetScript(script);
    setChangeDialogOpen(true);
  };

  const handleEdit = (script: Script) => {
    setEditingScript(script);
    setDialogOpen(true);
  };

  const handleDelete = (script: Script) => {
    setDeletingScript(script);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingScript) return;
    try {
      const { error } = await supabase
        .from('client_scripts')
        .delete()
        .eq('id', deletingScript.id);
      if (error) throw error;
      toast.success('Script deleted successfully');
      fetchScripts();
    } catch (error) {
      console.error('Error deleting script:', error);
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
      fetchScripts();
    } catch (error) {
      console.error('Error toggling script:', error);
      toast.error('Failed to update script');
    }
  };

  const handleDialogClose = (saved: boolean) => {
    setDialogOpen(false);
    setEditingScript(null);
    if (saved) fetchScripts();
  };

  const handleChangeDialogClose = (saved: boolean) => {
    setChangeDialogOpen(false);
    setChangeTargetScript(null);
    if (saved) fetchChangeRequests();
  };

  const pendingCount = changeRequests.filter(r => !['approved', 'rejected'].includes(r.status)).length;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    needs_info: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <DashboardLayout
      title="Call Scripts"
      description="Manage your greeting scripts and request changes"
    >
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
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                {pendingCount}
              </Badge>
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
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading scripts...</div>
              ) : scripts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium text-heading mb-2">No scripts yet</h3>
                  <p className="text-sm max-w-md mx-auto mb-6">
                    Create custom scripts to define how our receptionists greet your callers, answer FAQs, and handle different call types.
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestChange(script)}
                        >
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
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(script)}>
                              {script.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(script)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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
                            <Badge className={statusColors[req.status]}>
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
