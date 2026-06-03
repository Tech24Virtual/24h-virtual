import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, FileText } from 'lucide-react';
import { SignedUrlViewer } from '@/components/shared/SignedUrlViewer';
import {
  useIntakeDocuments,
  type FulfillmentIntake,
  type IntakeDocument,
} from '@/hooks/admin/useFulfillmentIntakes';
import { useAuth } from '@/contexts/AuthContext';

interface SnapshotItem {
  item_key: string;
  label: string;
  item_type: string;
  is_required: boolean;
  value_json: { value?: unknown } | null;
  status: string;
  notes?: string | null;
}

interface SnapshotShape {
  partner?: { id?: string; display_name?: string | null };
  proposal?: {
    number?: string;
    title?: string;
    offering_name?: string | null;
    scope_summary?: string | null;
    amount?: number | null;
    currency?: string | null;
    accepted_at?: string | null;
    accepted_by_name?: string | null;
  };
  client?: { name?: string | null; email?: string | null; company?: string | null };
  items?: SnapshotItem[];
  checklist_template?: string;
}

interface Props {
  intake: FulfillmentIntake;
  mode?: 'admin' | 'supervisor';
}

function renderValue(item: SnapshotItem): string {
  const v = item.value_json?.value;
  if (v === undefined || v === null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

export function FulfillmentIntakeDetail({ intake, mode = 'admin' }: Props) {
  const snap = intake.snapshot_json as unknown as SnapshotShape;
  const { data: docs } = useIntakeDocuments(intake.id);
  const { isAdmin } = useAuth();
  const canViewDocs = isAdmin || mode === 'supervisor';
  const [previewing, setPreviewing] = useState<IntakeDocument | null>(null);

  const items = snap?.items ?? [];
  const required = items.filter((i) => i.is_required);
  const optional = items.filter((i) => !i.is_required);

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Proposal snapshot
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Number</p>
            <p className="font-mono">{snap?.proposal?.number ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Title</p>
            <p>{snap?.proposal?.title ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Offering</p>
            <p>{snap?.proposal?.offering_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p>
              {snap?.proposal?.amount != null
                ? `${snap.proposal.currency ? snap.proposal.currency + ' ' : ''}${snap.proposal.amount.toLocaleString()}`
                : '—'}
            </p>
          </div>
        </div>
        {snap?.proposal?.scope_summary && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Scope</p>
              <p className="text-sm whitespace-pre-wrap">{snap.proposal.scope_summary}</p>
            </div>
          </>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Client / company
        </h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p>{snap?.client?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p>{snap?.client?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Company</p>
            <p>{snap?.client?.company ?? '—'}</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Intake items
          </h2>
          <Badge variant="outline" className="text-xs">
            {snap?.checklist_template ?? 'standard'}
          </Badge>
        </div>
        {required.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Required</p>
            <div className="space-y-1.5">
              {required.map((it) => (
                <div key={it.item_key} className="grid grid-cols-3 gap-3 text-sm border-b pb-2">
                  <p className="text-muted-foreground">{it.label}</p>
                  <p className="col-span-2 whitespace-pre-wrap">{renderValue(it)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {optional.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-semibold text-muted-foreground">Optional</p>
            <div className="space-y-1.5">
              {optional.map((it) => (
                <div key={it.item_key} className="grid grid-cols-3 gap-3 text-sm border-b pb-2">
                  <p className="text-muted-foreground">{it.label}</p>
                  <p className="col-span-2 whitespace-pre-wrap">{renderValue(it)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">No intake items in this snapshot.</p>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Documents
        </h2>
        {!docs?.length ? (
          <p className="text-sm text-muted-foreground">No documents submitted.</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 border-b pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{d.document_type}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setPreviewing(d)}>
                  <Eye className="w-4 h-4 mr-1" /> Open
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewing?.file_name}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <SignedUrlViewer
              path={previewing.file_path}
              fileName={previewing.file_name}
              mimeType={previewing.mime_type}
              authorized={canViewDocs}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
