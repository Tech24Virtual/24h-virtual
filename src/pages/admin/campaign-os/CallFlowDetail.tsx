import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCallFlow, useUpdateCallFlow } from '@/hooks/campaign-os/useCallFlows';
import { useCampaigns } from '@/hooks/campaign-os/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, ArrowRight, Loader2, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { RoutingEntryType } from '@/lib/campaign-os/types';
import { ReceptionistConfigCard } from '@/components/admin/campaign-os/ReceptionistConfigCard';

export default function CallFlowDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: flow, isLoading, isError } = useCallFlow(id);
  const { data: campaigns = [] } = useCampaigns();
  const update = useUpdateCallFlow();

  const [name, setName] = useState('');
  const [routing, setRouting] = useState<RoutingEntryType>('direct');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (flow) {
      setName(flow.display_name ?? flow.department_name ?? '');
      setRouting(flow.routing_entry_type);
      setNotes(flow.notes ?? '');
    }
  }, [flow]);

  const linkedCampaign = campaigns.find((c) => c.client_department_id === id);

  async function handleSave() {
    try {
      await update.mutateAsync({ id, patch: { display_name: name, routing_entry_type: routing, notes } });
      toast.success('Call flow saved.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Save failed');
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…</div>;
  }
  if (isError) {
    return (
      <div className="text-sm space-y-4">
        <Link to="/admin/campaign-os/call-flows" className="text-primary hover:underline">← Back to call flows</Link>
        <div className="flex items-center gap-2 text-destructive mt-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Failed to load call flow. Check your permissions or try refreshing.</span>
        </div>
      </div>
    );
  }
  if (!flow) {
    return (
      <div className="text-sm text-muted-foreground">
        <Link to="/admin/campaign-os/call-flows" className="text-primary hover:underline">← Back to call flows</Link>
        <p className="mt-4">Call flow not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link to="/admin/campaign-os/call-flows" className="text-xs text-muted-foreground hover:text-foreground">← Call flows</Link>
        <h2 className="text-xl font-semibold mt-1 flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-muted-foreground" />
          {flow.display_name ?? flow.department_name}
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">Owner: {flow.owner_kind}</Badge>
          <Badge variant="outline" className="text-xs">Routing: {flow.routing_entry_type}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Routing entry</Label>
            <Select value={routing} onValueChange={(v) => setRouting(v as RoutingEntryType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct number</SelectItem>
                <SelectItem value="ivr">IVR-routed (no direct number required)</SelectItem>
                <SelectItem value="both">Both (direct + IVR)</SelectItem>
                <SelectItem value="logical">Logical (no number)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              A call flow can be reached via a direct number, IVR routing from another flow, both, or it can exist as a logical flow with no number.
            </p>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Internal notes about routing, hours, etc." />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Campaign</CardTitle></CardHeader>
        <CardContent>
          {linkedCampaign ? (
            <Link to={`/admin/campaign-os/campaigns/${linkedCampaign.id}`}>
              <div className="flex items-center justify-between border rounded-md px-3 py-2 hover:border-primary/40 transition-colors">
                <div className="text-sm">
                  <span className="font-medium">{linkedCampaign.display_name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">{linkedCampaign.status}</Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ) : (
            <div className="text-sm text-muted-foreground">No campaign yet for this call flow.</div>
          )}
        </CardContent>
      </Card>

      <ReceptionistConfigCard callFlowId={id} />
    </div>
  );
}
