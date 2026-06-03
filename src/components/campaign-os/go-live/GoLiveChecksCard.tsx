import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useGoLiveChecks } from '@/hooks/campaign-os/useGoLiveChecks';

interface Props {
  campaignId: string;
}

export function GoLiveChecksCard({ campaignId }: Props) {
  const { data, isLoading } = useGoLiveChecks(campaignId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking readiness…
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  const checks = [
    { label: 'Script published', ok: data.script_published, detail: data.script_published ? 'A version is live' : 'No published version' },
    { label: 'FAQ approved', ok: data.faqs_ok, detail: `${data.faqs_approved_count} approved` },
    { label: 'Policy approved', ok: data.policies_ok, detail: `${data.policies_approved_count} approved` },
    {
      label: 'Training signed off',
      ok: data.training_ok,
      detail: data.required_modules === 0
        ? 'No required modules'
        : `${data.required_signoffs}/${data.required_modules} signed off`,
    },
  ];

  return (
    <Card className={data.all_ok ? 'border-status-success' : 'border-status-warning'}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Go-live readiness</CardTitle>
          <CardDescription>
            {data.all_ok ? 'All required artifacts are in place.' : 'Some required artifacts are missing.'}
          </CardDescription>
        </div>
        <Badge variant={data.all_ok ? 'default' : 'outline'}>
          {data.all_ok ? 'Ready' : 'Not ready'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {checks.map((c) => (
            <div
              key={c.label}
              className={`flex items-start gap-2 rounded-md border p-3 ${c.ok ? 'bg-status-success-bg/50' : 'bg-status-warning-bg/50'}`}
            >
              {c.ok
                ? <CheckCircle2 className="h-4 w-4 text-status-success mt-0.5 shrink-0" />
                : <XCircle className="h-4 w-4 text-status-warning mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
