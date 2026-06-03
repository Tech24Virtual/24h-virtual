import { useMemo, useState } from 'react';
import { WhiteLabelLayout } from '@/components/white-label/WhiteLabelLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, UserPlus, Sparkles } from 'lucide-react';
import { useWLPartnerLeads, type WLPartnerLead, type WLPipelineStage, type WLTemperature } from '@/hooks/wl/useWLPartnerLeads';
import { useWLPartnerLeadMutations } from '@/hooks/wl/useWLPartnerLeadMutations';
import { WLLeadFormDialog } from '@/components/white-label/leads/WLLeadFormDialog';
import { WLConvertLeadDialog } from '@/components/white-label/leads/WLConvertLeadDialog';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/SEO';

const STAGES: Array<WLPipelineStage | 'all'> = ['all', 'new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const TEMPS: Array<WLTemperature | 'all'> = ['all', 'hot', 'warm', 'cold'];

const stageBadge: Record<WLPipelineStage, string> = {
  new: 'bg-muted text-muted-foreground',
  contacted: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  qualified: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  proposal: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  won: 'bg-green-500/10 text-green-700 dark:text-green-300',
  lost: 'bg-destructive/10 text-destructive',
};

const tempBadge: Record<WLTemperature, string> = {
  hot: 'bg-destructive/10 text-destructive border-destructive/30',
  warm: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30',
  cold: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
};

export default function WLPartnerLeads() {
  const { data: leads, isLoading } = useWLPartnerLeads();
  const { deleteLead } = useWLPartnerLeadMutations();

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<WLPipelineStage | 'all'>('all');
  const [tempFilter, setTempFilter] = useState<WLTemperature | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WLPartnerLead | null>(null);
  const [deleting, setDeleting] = useState<WLPartnerLead | null>(null);
  const [converting, setConverting] = useState<WLPartnerLead | null>(null);

  const filtered = useMemo(() => {
    if (!leads) return [];
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== 'all' && l.pipeline_stage !== stageFilter) return false;
      if (tempFilter !== 'all' && l.temperature !== tempFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.company?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [leads, search, stageFilter, tempFilter]);

  return (
    <WhiteLabelLayout>
      <SEO title="Leads — White Label Partner" description="Manage your partner leads" suppressBranding />
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track and manage your sales leads
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by name, email, or company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as WLPipelineStage | 'all')}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s === 'all' ? 'All stages' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tempFilter} onValueChange={(v) => setTempFilter(v as WLTemperature | 'all')}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPS.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t === 'all' ? 'All temps' : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No leads yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {leads && leads.length > 0
                  ? 'Try adjusting your filters.'
                  : 'Create your first lead to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Temp</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </TableCell>
                    <TableCell>{lead.company ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('capitalize', stageBadge[lead.pipeline_stage])}>
                        {lead.pipeline_stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.temperature ? (
                        <Badge variant="outline" className={cn('capitalize', tempBadge[lead.temperature])}>
                          {lead.temperature}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {lead.estimated_value != null
                        ? `${lead.currency ? `${lead.currency} ` : ''}${lead.estimated_value.toLocaleString()}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.source ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      {(['qualified', 'proposal'] as WLPipelineStage[]).includes(lead.pipeline_stage) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary"
                          onClick={() => setConverting(lead)}
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1" />
                          Convert
                        </Button>
                      )}
                      <Button variant="ghost" size="icon"
                        onClick={() => { setEditing(lead); setDialogOpen(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon"
                        onClick={() => setDeleting(lead)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <WLLeadFormDialog open={dialogOpen} onOpenChange={setDialogOpen} lead={editing} />

      <WLConvertLeadDialog
        lead={converting}
        open={!!converting}
        onOpenChange={(o) => !o && setConverting(null)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleting?.name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) {
                  await deleteLead.mutateAsync(deleting.id);
                  setDeleting(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WhiteLabelLayout>
  );
}
