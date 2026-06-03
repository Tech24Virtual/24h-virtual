import { useState } from 'react';
import { useLatestFive9Drift, useDetectFive9Drift } from '@/hooks/campaign-os/useFive9Drift';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  departmentId: string;
  onAddToMappings?: (name: string) => void;
}

function parseCsv(text: string): Array<{ name: string; kind?: string; type?: string }> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase().split(',').map((s) => s.trim());
  const nameIdx = header.findIndex((h) => h === 'name' || h === 'variable' || h === 'variable_name');
  const kindIdx = header.findIndex((h) => h === 'kind' || h === 'variable_kind');
  const typeIdx = header.findIndex((h) => h === 'type' || h === 'data_type');
  return lines.slice(1).map((line) => {
    const parts = line.split(',').map((s) => s.trim());
    return {
      name: nameIdx >= 0 ? parts[nameIdx] : parts[0],
      kind: kindIdx >= 0 ? parts[kindIdx] : undefined,
      type: typeIdx >= 0 ? parts[typeIdx] : undefined,
    };
  }).filter((v) => v.name);
}

export function Five9DriftPanel({ departmentId, onAddToMappings }: Props) {
  const { data: latest, isLoading } = useLatestFive9Drift(departmentId);
  const detect = useDetectFive9Drift();
  const [input, setInput] = useState('');
  const [acknowledgedSnapshotId, setAcknowledgedSnapshotId] = useState<string | null>(null);

  const handleCheck = async () => {
    let variables: Array<{ name: string; kind?: string; type?: string }> = [];
    const trimmed = input.trim();
    if (!trimmed) {
      toast.error('Paste JSON or CSV first');
      return;
    }
    try {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        variables = Array.isArray(parsed) ? parsed : parsed.variables ?? [];
      } else {
        variables = parseCsv(trimmed);
      }
    } catch (e: any) {
      toast.error(`Parse failed: ${e.message}`);
      return;
    }
    if (variables.length === 0) {
      toast.error('No variables parsed');
      return;
    }
    try {
      await detect.mutateAsync({ client_department_id: departmentId, variables, source: 'manual_paste' });
      toast.success('Drift snapshot captured');
      setInput('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const drift = latest?.drift;
  const totalDrift = drift?.total_drift ?? 0;
  const isAcknowledged = !!latest && acknowledgedSnapshotId === latest.id;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Five9 Drift Check
          </CardTitle>
          <CardDescription>
            Paste your current Five9 variables (JSON array of `{'{name, kind, type}'}` or CSV with name,kind,type).
            We diff against the mappings stored in this system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Five9 variable snapshot</Label>
            <Textarea
              rows={6}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='[{"name":"Caller_First_Name","kind":"call","type":"string"}, ...]'
              className="font-mono text-xs"
            />
          </div>
          <Button onClick={handleCheck} disabled={detect.isPending}>
            {detect.isPending ? 'Checking…' : 'Check drift'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">Latest snapshot</CardTitle>
            {latest?.captured_at && (
              <CardDescription>Captured {new Date(latest.captured_at).toLocaleString()} · {latest.source}</CardDescription>
            )}
          </div>
          {latest ? (
            totalDrift > 0 ? (
              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {totalDrift} drift</Badge>
            ) : (
              <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> In sync</Badge>
            )
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !latest ? (
            <p className="text-sm text-muted-foreground">No snapshot yet. Paste above to capture one.</p>
          ) : (
            <>
              {isAcknowledged && (
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  Drift acknowledged for this snapshot
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Counter
                  label="Missing in Five9"
                  value={drift?.missing_in_five9?.length ?? 0}
                  items={drift?.missing_in_five9}
                />
                <Counter
                  label="Missing in OS"
                  value={drift?.missing_in_os?.length ?? 0}
                  items={drift?.missing_in_os}
                  onAdd={onAddToMappings}
                />
                <Counter
                  label="Type mismatches"
                  value={drift?.type_mismatches?.length ?? 0}
                  items={drift?.type_mismatches?.map((t) => t.name)}
                  mismatches={drift?.type_mismatches?.map((t) => ({ name: t.name, os: t.os_type, five9: t.five9_type }))}
                />
                <Counter
                  label="Kind mismatches"
                  value={drift?.kind_mismatches?.length ?? 0}
                  items={drift?.kind_mismatches?.map((t) => t.name)}
                  mismatches={drift?.kind_mismatches?.map((t) => ({ name: t.name, os: t.os_kind, five9: t.five9_kind }))}
                />
              </div>
              {totalDrift > 0 && !isAcknowledged && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAcknowledgedSnapshotId(latest.id);
                    toast.success('Drift acknowledged');
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Acknowledge all
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Counter({
  label, value, items, mismatches, onAdd,
}: {
  label: string;
  value: number;
  items?: string[];
  mismatches?: Array<{ name: string; os?: string; five9?: string }>;
  onAdd?: (name: string) => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${value > 0 ? 'text-destructive' : ''}`}>{value}</p>
      {items && items.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground max-h-32 overflow-auto">
          {items.slice(0, 8).map((name) => {
            const mm = mismatches?.find((m) => m.name === name);
            return (
              <li key={name} className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <span className="truncate font-mono block">{name}</span>
                  {mm && (
                    <span className="text-[10px] text-muted-foreground/70">
                      OS: {mm.os ?? '—'} → Five9: {mm.five9 ?? '—'}
                    </span>
                  )}
                </div>
                {onAdd && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 shrink-0 text-primary"
                    onClick={() => onAdd(name)}
                    title="Add to OS mappings"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </li>
            );
          })}
          {items.length > 8 && <li>+{items.length - 8} more</li>}
        </ul>
      )}
    </div>
  );
}
