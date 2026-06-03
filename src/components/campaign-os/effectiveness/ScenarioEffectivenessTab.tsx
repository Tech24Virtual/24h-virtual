import { useScenarioEffectiveness } from '@/hooks/campaign-os/useScenarioEffectiveness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';

interface Props {
  campaignId: string;
  publishedVersionId: string | null;
}

export function ScenarioEffectivenessTab({ campaignId, publishedVersionId }: Props) {
  const { data = [], isLoading } = useScenarioEffectiveness(campaignId);

  if (!publishedVersionId) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-2">
          <AlertTriangle className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm font-medium">No published version</p>
          <p className="text-xs text-muted-foreground">Publish a version to start attribution.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scenario effectiveness, last 30 days</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No scenarios authored yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scenario</TableHead>
                <TableHead className="text-right">Resolved</TableHead>
                <TableHead className="text-right">Escalated</TableHead>
                <TableHead className="text-right">No Contact</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Resolved %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.scenario_id}>
                  <TableCell className="font-medium">{r.scenario_title}</TableCell>
                  <TableCell className="text-right">{r.resolved_count}</TableCell>
                  <TableCell className="text-right">{r.escalated_count}</TableCell>
                  <TableCell className="text-right">{r.no_contact_count}</TableCell>
                  <TableCell className="text-right">{r.other_count}</TableCell>
                  <TableCell className="text-right">{r.total_count}</TableCell>
                  <TableCell className="text-right">{r.resolved_pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
