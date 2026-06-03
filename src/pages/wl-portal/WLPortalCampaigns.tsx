import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Megaphone,
  Pause,
  Play,
  Send,
  Eye,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface WLCampaign {
  id: string;
  campaign_name: string;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

interface WLCampaignMetrics {
  campaign_id: string;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  replied_count: number;
  converted_count: number;
  failed_count: number;
  queued_count: number;
}

interface WLCampaignRecipient {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  converted_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Queued', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'outline' },
  opened: { label: 'Opened', variant: 'default' },
  replied: { label: 'Replied', variant: 'default' },
  converted: { label: 'Converted', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
  suppressed: { label: 'Suppressed', variant: 'secondary' },
};

export default function WLPortalCampaigns() {
  const { clientInfo, branding } = useWLPortal();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<WLCampaign[]>([]);
  const [metricsById, setMetricsById] = useState<Record<string, WLCampaignMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openCampaign, setOpenCampaign] = useState<WLCampaign | null>(null);
  const [recipients, setRecipients] = useState<WLCampaignRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  const loadCampaigns = async () => {
    if (!clientInfo?.id) return;
    setLoading(true);

    const [{ data: campaignRows }, { data: metricRows }] = await Promise.all([
      supabase
        .from('wl_client_campaigns')
        .select('id, campaign_name, department, is_active, created_at')
        .eq('wl_client_id', clientInfo.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('wl_campaign_metrics' as any)
        .select('*')
        .eq('wl_client_id', clientInfo.id),
    ]);

    setCampaigns((campaignRows as WLCampaign[]) || []);
    const map: Record<string, WLCampaignMetrics> = {};
    for (const m of (metricRows as unknown as WLCampaignMetrics[]) || []) {
      map[m.campaign_id] = m;
    }
    setMetricsById(map);
    setLoading(false);
  };

  useEffect(() => {
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientInfo?.id]);

  const togglePause = async (campaign: WLCampaign) => {
    setTogglingId(campaign.id);
    const next = !campaign.is_active;
    const { error } = await supabase
      .from('wl_client_campaigns')
      .update({ is_active: next })
      .eq('id', campaign.id);
    setTogglingId(null);

    if (error) {
      toast({
        title: 'Could not update campaign',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: next ? 'Campaign resumed' : 'Campaign paused',
      description: campaign.campaign_name,
    });
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaign.id ? { ...c, is_active: next } : c))
    );
  };

  const openRecipients = async (campaign: WLCampaign) => {
    setOpenCampaign(campaign);
    setRecipientsLoading(true);
    const { data } = await supabase
      .from('wl_campaign_recipients' as any)
      .select(
        'id, contact_name, contact_phone, contact_email, status, sent_at, opened_at, replied_at, converted_at, failed_at, failure_reason'
      )
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: false })
      .limit(200);
    setRecipients((data as unknown as WLCampaignRecipient[]) || []);
    setRecipientsLoading(false);
  };

  return (
    <WLPortalLayout title="Campaigns">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-heading">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Monitor campaign performance and pause delivery anytime.
            {branding?.support_email && (
              <>
                {' '}Need changes? Contact{' '}
                <a className="underline" href={`mailto:${branding.support_email}`}>
                  {branding.support_email}
                </a>
                .
              </>
            )}
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center">
              <Megaphone className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No campaigns yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((c) => {
              const m = metricsById[c.id] || {
                total_recipients: 0,
                sent_count: 0,
                opened_count: 0,
                replied_count: 0,
                converted_count: 0,
                failed_count: 0,
                queued_count: 0,
              } as WLCampaignMetrics;

              const openRate = m.sent_count > 0
                ? Math.round((m.opened_count / m.sent_count) * 100)
                : 0;
              const replyRate = m.sent_count > 0
                ? Math.round((m.replied_count / m.sent_count) * 100)
                : 0;

              return (
                <Card key={c.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{c.campaign_name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {c.department && <span>{c.department}</span>}
                        {c.department && <span>•</span>}
                        <span>Started {format(new Date(c.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={c.is_active ? 'default' : 'secondary'}>
                        {c.is_active ? 'Active' : 'Paused'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => togglePause(c)}
                        disabled={togglingId === c.id}
                      >
                        {togglingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : c.is_active ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" /> Resume
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <MetricTile
                        icon={<Send className="w-3.5 h-3.5" />}
                        label="Sent"
                        value={m.sent_count}
                        sub={`${m.total_recipients} total`}
                      />
                      <MetricTile
                        icon={<Eye className="w-3.5 h-3.5" />}
                        label="Opened"
                        value={m.opened_count}
                        sub={`${openRate}%`}
                      />
                      <MetricTile
                        icon={<MessageSquare className="w-3.5 h-3.5" />}
                        label="Replied"
                        value={m.replied_count}
                        sub={`${replyRate}%`}
                      />
                      <MetricTile
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        label="Converted"
                        value={m.converted_count}
                        sub={
                          m.failed_count > 0
                            ? `${m.failed_count} failed`
                            : `${m.queued_count} queued`
                        }
                        warn={m.failed_count > 0}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => openRecipients(c)}
                      disabled={m.total_recipients === 0}
                    >
                      View recipient activity
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!openCampaign} onOpenChange={(o) => !o && setOpenCampaign(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{openCampaign?.campaign_name}</DialogTitle>
            <DialogDescription>
              Per-recipient delivery and response activity.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {recipientsLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recipient activity yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r) => {
                    const lastTs =
                      r.converted_at ||
                      r.replied_at ||
                      r.opened_at ||
                      r.sent_at ||
                      r.failed_at;
                    const style = STATUS_STYLES[r.status] || {
                      label: r.status,
                      variant: 'secondary' as const,
                    };
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {r.contact_name || r.contact_email || r.contact_phone || '—'}
                          </div>
                          {(r.contact_phone || r.contact_email) && r.contact_name && (
                            <div className="text-xs text-muted-foreground">
                              {r.contact_phone || r.contact_email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={style.variant}>{style.label}</Badge>
                          {r.failure_reason && (
                            <div className="text-xs text-destructive mt-1 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>{r.failure_reason}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {lastTs ? format(new Date(lastTs), 'MMM d, h:mm a') : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </WLPortalLayout>
  );
}

function MetricTile({
  icon,
  label,
  value,
  sub,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-semibold mt-0.5">{value.toLocaleString()}</div>
      {sub && (
        <div className={`text-xs ${warn ? 'text-destructive' : 'text-muted-foreground'}`}>
          {sub}
        </div>
      )}
    </div>
  );
}
