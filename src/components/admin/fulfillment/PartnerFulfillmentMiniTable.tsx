import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { audienceLabel, phaseFromIntake } from '@/lib/wl/fulfillmentLifecycle';
import type { IntakeStatus } from '@/lib/wl/fulfillmentStatus';

interface Props {
  partnerId: string;
}

const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  low: 'outline',
  normal: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

export function PartnerFulfillmentMiniTable({ partnerId }: Props) {
  const { data: intakes, isLoading } = useQuery({
    queryKey: ['admin-partner-fulfillment-intakes', partnerId],
    enabled: !!partnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_fulfillment_intakes')
        .select('id, intake_number, status, priority, created_at, snapshot_json')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Fulfillment intakes</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/admin/fulfillment-intake?partner=${partnerId}`}>
            View all
            <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !intakes?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No fulfillment intakes yet for this partner.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intake</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intakes.map((intake) => {
                const snapshot = (intake.snapshot_json ?? {}) as Record<string, unknown>;
                const clientName =
                  (snapshot.client_name_snapshot as string) ||
                  (snapshot.client_name as string) ||
                  'Unnamed client';
                const phase = phaseFromIntake(intake.status as IntakeStatus);
                const statusLabel = audienceLabel(phase, 'admin');
                return (
                  <TableRow key={intake.id} className="cursor-pointer">
                    <TableCell className="font-mono text-xs">
                      <Link
                        to={`/admin/fulfillment-intake/${intake.id}`}
                        className="hover:underline"
                      >
                        {intake.intake_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{clientName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {statusLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_VARIANT[intake.priority] ?? 'outline'} className="text-xs capitalize">
                        {intake.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(intake.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
