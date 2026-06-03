import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TraceEntry } from '@/lib/productTesting/traceLog';
import type { ProductTestingSegment } from '@/config/productTestingSegments';

interface TraceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: ProductTestingSegment | null;
  trace?: TraceEntry | null;
}

export function TraceDialog({ open, onOpenChange, segment, trace }: TraceDialogProps) {
  const { toast } = useToast();

  if (!segment) return null;

  const previewTrace: Partial<TraceEntry> = trace ?? {
    segmentId: segment.id,
    label: segment.label,
    category: segment.category,
    route: segment.route,
    expectedRole: segment.role,
    status: segment.status,
    missingContext: [],
  };

  const json = JSON.stringify(previewTrace, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    toast({ title: 'Trace copied', description: 'Trace JSON copied to clipboard.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Trace, {segment.label}
            <Badge variant="outline" className="font-mono text-xs">{segment.id}</Badge>
          </DialogTitle>
          <DialogDescription>
            {trace
              ? 'Live trace for the active test session.'
              : 'Preview of what will be recorded when this segment is launched.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Route</div>
              <div className="font-mono break-all">{segment.route}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Expected role</div>
              <div className="font-mono">{segment.role}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Status</div>
              <div className="font-mono">{segment.status}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Product area</div>
              <div className="font-mono">{segment.productArea}</div>
            </div>
          </div>

          {segment.requires.length > 0 && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">Requires</div>
              <div className="flex flex-wrap gap-1">
                {segment.requires.map((r) => (
                  <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                ))}
              </div>
            </div>
          )}

          {segment.notes && (
            <div className="text-xs text-muted-foreground italic">{segment.notes}</div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-muted-foreground">Trace JSON</div>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-64 font-mono">{json}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
