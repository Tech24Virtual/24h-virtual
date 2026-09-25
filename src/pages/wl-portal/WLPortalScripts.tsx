import { useState, useEffect } from 'react';
import { FileText, MessageSquarePlus, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LegacyMigratedBanner } from '@/components/campaign-os/LegacyMigratedBanner';
import { WLScriptChangeRequestDialog, changeTypeLabel } from '@/components/wl-portal/ScriptChangeRequestDialog';
import { format } from 'date-fns';

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  in_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  needs_info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function requestStatusLabel(status: string): string {
  return status.replace('_', ' ');
}

export default function WLPortalScripts() {
  const { clientInfo, partnerId } = useWLPortal();
  const { user } = useAuth();
  const [scripts, setScripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestDialogScript, setRequestDialogScript] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!clientInfo) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('wl_client_scripts')
        .select('*')
        .eq('wl_client_id', clientInfo.id)
        .order('created_at', { ascending: false });
      if (data) setScripts(data);
      setIsLoading(false);
    };
    fetch();
  }, [clientInfo]);

  const fetchRequests = async () => {
    if (!clientInfo || !user) return;
    setRequestsLoading(true);
    const { data } = await supabase
      .from('script_change_requests')
      .select('*')
      .eq('wl_client_id', clientInfo.id)
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setRequestsLoading(false);
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientInfo, user]);

  const openCount = requests.filter(r => ['pending', 'in_review', 'needs_info'].includes(r.status)).length;

  return (
    <WLPortalLayout title="Call Scripts" description="Your configured call scripts">
      <div className="space-y-4">
        <LegacyMigratedBanner
          migratedCount={scripts.filter(s => !!s.migrated_to_campaign_id).length}
          totalCount={scripts.length}
          surfaceLabel="White Label Portal"
        />

        <Tabs defaultValue="scripts">
          <TabsList>
            <TabsTrigger value="scripts">Scripts</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              Pending Changes
              {openCount > 0 && (
                <Badge className="h-5 px-1.5 text-xs bg-amber-500 text-white hover:bg-amber-500">{openCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scripts" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Your Scripts</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading scripts...</div>
                ) : scripts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-medium text-heading mb-2">No scripts yet</h3>
                    <p className="text-sm">Your call scripts will appear here once configured.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scripts.map((script) => (
                      <div key={script.id} className="flex items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-heading">{script.title}</h4>
                            <Badge variant={script.is_active ? 'default' : 'secondary'}>
                              {script.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          {script.content && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{script.content}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">Category: {script.category}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setRequestDialogScript({ id: script.id, title: script.title })}
                        >
                          <MessageSquarePlus className="w-4 h-4 mr-2" />
                          Request Change
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Pending Changes</CardTitle></CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-medium text-heading mb-2">No change requests yet</h3>
                    <p className="text-sm">Use "Request Change" on a script to ask for an update.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((r) => (
                      <div key={r.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{changeTypeLabel(r.request_type)}</Badge>
                              <Badge className={REQUEST_STATUS_STYLES[r.status] ?? 'bg-muted text-muted-foreground'}>
                                {requestStatusLabel(r.status)}
                              </Badge>
                            </div>
                            <p className="font-medium text-heading">{r.title}</p>
                            {r.description && (
                              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{r.description}</p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground shrink-0">
                            {format(new Date(r.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        {r.reviewer_notes && (
                          <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                            Reviewer note: {r.reviewer_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <WLScriptChangeRequestDialog
        open={!!requestDialogScript}
        onClose={(submitted) => {
          setRequestDialogScript(null);
          if (submitted) fetchRequests();
        }}
        script={requestDialogScript}
        wlClientId={clientInfo?.id ?? ''}
        partnerId={partnerId}
        clientName={clientInfo?.contact_name || clientInfo?.client_name || 'A client'}
      />
    </WLPortalLayout>
  );
}
