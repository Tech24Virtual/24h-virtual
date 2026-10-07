import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

const TECH_ITEMS = [
  { field: 'google_deprovisioned', label: 'Deactivate Google Workspace' },
  { field: 'five9_deprovisioned', label: 'Remove Five9 access' },
  { field: 'slack_removed', label: 'Remove from Slack' },
] as const;

type TechField = (typeof TECH_ITEMS)[number]['field'];

export default function TechOffboarding() {
  const queryClient = useQueryClient();
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const { data: offboardings = [], isLoading } = useQuery({
    queryKey: ['tech-offboarding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offboarding')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Record<TechField, boolean>> & { tech_notes?: string | null } }) => {
      const { error } = await supabase.from('offboarding').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tech-offboarding'] }),
    onError: (err: Error) => toast.error('Failed to update', { description: err.message }),
  });

  const pending = offboardings.filter((o) => !o.tech_completed_at);
  const done = offboardings.filter((o) => !!o.tech_completed_at);

  const renderCard = (ob: (typeof offboardings)[number], readOnly: boolean) => (
    <Card key={ob.id}>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="font-medium">{ob.agent_name || 'Unknown employee'}</p>
            <p className="text-sm text-muted-foreground">
              Reason: {ob.reason?.replace('_', ' ')} • Requested {format(new Date(ob.created_at), 'MMM d, yyyy')}
              {ob.last_working_day && ` • Last day ${format(new Date(ob.last_working_day), 'MMM d, yyyy')}`}
            </p>
          </div>
          {ob.tech_completed_at ? (
            <Badge className="bg-green-100 text-green-800">Deprovisioned {format(new Date(ob.tech_completed_at), 'MMM d')}</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-800">Awaiting Tech</Badge>
          )}
        </div>

        <div className="space-y-2">
          {TECH_ITEMS.map((item) => (
            <label key={item.field} className="flex items-center gap-2">
              <Checkbox
                checked={!!ob[item.field]}
                disabled={readOnly || updateMutation.isPending}
                onCheckedChange={(v) => updateMutation.mutate({ id: ob.id, patch: { [item.field]: !!v } })}
              />
              <span className={`text-sm ${ob[item.field] ? 'line-through text-muted-foreground' : ''}`}>{item.label}</span>
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
            rows={2}
            placeholder="Notes for HR (e.g. mailbox forwarded, Five9 seat released)…"
            disabled={readOnly}
            value={notesDraft[ob.id] ?? ob.tech_notes ?? ''}
            onChange={(e) => setNotesDraft((p) => ({ ...p, [ob.id]: e.target.value }))}
          />
          {!readOnly && notesDraft[ob.id] !== undefined && notesDraft[ob.id] !== (ob.tech_notes ?? '') && (
            <Button
              size="sm"
              variant="outline"
              disabled={updateMutation.isPending}
              onClick={() =>
                updateMutation.mutate(
                  { id: ob.id, patch: { tech_notes: notesDraft[ob.id] || null } },
                  { onSuccess: () => setNotesDraft((p) => { const { [ob.id]: _omit, ...rest } = p; return rest; }) },
                )
              }
            >
              Save notes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <StaffLayout role="tech">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><UserMinus className="h-7 w-7" /> Offboarding</h1>
          <p className="text-muted-foreground">Deprovision departing staff. HR is notified automatically once all three items are done.</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="done">Completed ({done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">Loading...</div>
            ) : pending.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No pending offboarding requests.</CardContent></Card>
            ) : (
              pending.map((ob) => renderCard(ob, false))
            )}
          </TabsContent>
          <TabsContent value="done" className="space-y-4 mt-4">
            {done.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">Nothing completed yet.</CardContent></Card>
            ) : (
              done.map((ob) => renderCard(ob, false))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
