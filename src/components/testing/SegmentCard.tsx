import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Link as LinkIcon, Activity, Play, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { ProductTestingSegment } from '@/config/productTestingSegments';
import { TraceDialog } from './TraceDialog';

interface SegmentCardProps {
  segment: ProductTestingSegment;
}

const STATUS_VARIANTS: Record<ProductTestingSegment['status'], string> = {
  production: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  sandbox: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  partial: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  placeholder: 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30',
  'requires-context': 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
};

const CATEGORY_LABELS: Record<ProductTestingSegment['category'], string> = {
  dashboard: 'Dashboard',
  onboarding: 'Onboarding',
  product: 'Product',
  diagnostic: 'Diagnostic',
};

function buildLaunchUrl(segment: ProductTestingSegment): string {
  // Don't substitute placeholder params; missing-context handler will surface them.
  const sep = segment.route.includes('?') ? '&' : '?';
  return `${segment.route}${sep}testSegment=${segment.id}`;
}

export function SegmentCard({ segment }: SegmentCardProps) {
  const { toast } = useToast();
  const [traceOpen, setTraceOpen] = useState(false);
  const launchUrl = buildLaunchUrl(segment);
  const hasPlaceholder = segment.route.includes('/:');
  const isBlocked = hasPlaceholder; // can't safely launch a route with unresolved :params

  const handleCopy = async () => {
    const fullUrl = `${window.location.origin}${launchUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    toast({ title: 'Link copied', description: 'Deep link copied to clipboard.' });
  };

  const handleNewTab = () => {
    window.open(launchUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Card className="flex flex-col h-full hover:shadow-elevated transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">{segment.label}</CardTitle>
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${STATUS_VARIANTS[segment.status]}`}
            >
              {segment.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="secondary" className="text-[10px]">
              {CATEGORY_LABELS[segment.category]}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              {segment.role}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 pt-0">
          <p className="text-sm text-muted-foreground">{segment.description}</p>

          <div className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded break-all">
            {segment.route}
          </div>

          {segment.requires.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {segment.requires.map((r) => (
                <Badge key={r} variant="secondary" className="text-[10px] py-0 h-4">
                  {r}
                </Badge>
              ))}
            </div>
          )}

          {segment.notes && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground italic">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{segment.notes}</span>
            </div>
          )}

          <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {isBlocked ? (
              <Button size="sm" variant="secondary" disabled className="flex-1">
                <Play className="h-3 w-3 mr-1" />
                Open Segment
              </Button>
            ) : (
              <Button asChild size="sm" className="flex-1">
                <Link to={launchUrl}>
                  <Play className="h-3 w-3 mr-1" />
                  Open Segment
                </Link>
              </Button>
            )}

            {segment.supportsNewTab && !isBlocked && (
              <Button size="sm" variant="outline" onClick={handleNewTab} title="Open in new tab">
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}

            <Button size="sm" variant="outline" onClick={handleCopy} title="Copy deep link">
              <LinkIcon className="h-3 w-3" />
            </Button>

            {segment.supportsTrace && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTraceOpen(true)}
                title="Preview trace"
              >
                <Activity className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TraceDialog
        open={traceOpen}
        onOpenChange={setTraceOpen}
        segment={segment}
      />
    </>
  );
}
