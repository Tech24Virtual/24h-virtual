import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTrainingCoverage } from '@/hooks/campaign-os/useTrainingCoverage';
import { GraduationCap } from 'lucide-react';

interface Props {
  campaignId: string;
}

export function TrainingCoverageCard({ campaignId }: Props) {
  const { data, isLoading } = useTrainingCoverage(campaignId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          Training coverage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading…</div>
        ) : !data ? (
          <div className="text-xs text-muted-foreground">No coverage data.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <Stat label="Published" value={data.published_modules} />
            <Stat label="Required" value={data.required_modules} />
            <Stat label="Completions" value={data.total_completions} />
            <Stat label="Signoffs" value={data.total_signoffs} />
            <Stat label="Agents started" value={data.agents_started} />
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {data && data.required_modules > 0 && data.total_signoffs >= data.required_modules ? (
            <Badge variant="default">Required modules signed off</Badge>
          ) : data && data.required_modules > 0 ? (
            <Badge variant="outline">Pending: {data.required_modules - data.total_signoffs} signoffs</Badge>
          ) : (
            <Badge variant="secondary">No required modules</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
