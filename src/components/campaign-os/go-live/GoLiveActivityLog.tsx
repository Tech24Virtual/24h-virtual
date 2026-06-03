import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, HelpCircle, Shield, GraduationCap, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useGoLiveActivity, type GoLiveActivityRow } from '@/hooks/campaign-os/useGoLiveActivity';

interface Props {
  campaignId: string;
}

const ICON_BY_KEY: Record<string, typeof FileText> = {
  script: FileText,
  faqs: HelpCircle,
  policies: Shield,
  training: GraduationCap,
};

function fmtWhen(at: string | null): string {
  if (!at) return 'No activity yet';
  try {
    return formatDistanceToNow(new Date(at), { addSuffix: true });
  } catch {
    return at;
  }
}

export function GoLiveActivityLog({ campaignId }: Props) {
  const { data, isLoading, isFetching } = useGoLiveActivity(campaignId);

  const rows: GoLiveActivityRow[] = (data ?? []).slice().sort((a, b) => {
    const at = a.last_updated_at ? new Date(a.last_updated_at).getTime() : 0;
    const bt = b.last_updated_at ? new Date(b.last_updated_at).getTime() : 0;
    return bt - at;
  });

  const hasAny = rows.some((r) => r.last_updated_at);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Readiness activity
          </CardTitle>
          <CardDescription>
            Most recent change to each go-live check, with who made it.
          </CardDescription>
        </div>
        {isFetching && !isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Refreshing" />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
          </div>
        ) : !hasAny ? (
          <div className="py-6 text-sm text-muted-foreground text-center">
            No activity yet. Updates will appear here as checks change.
          </div>
        ) : (
          <ol className="space-y-3">
            {rows.map((row) => {
              const Icon = ICON_BY_KEY[row.check_key] ?? FileText;
              const actor = row.actor_name?.trim() || (row.actor_id ? 'Unknown' : 'System');
              return (
                <li
                  key={row.check_key}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="mt-0.5 rounded-md bg-muted p-1.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-medium text-sm">{row.check_label}</div>
                      <div className="text-xs text-muted-foreground">{fmtWhen(row.last_updated_at)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.detail || 'No details available.'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      by <span className="font-medium text-foreground">{actor}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
