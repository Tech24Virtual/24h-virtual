import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { FileText, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';

interface CallImport {
  id: string;
  created_at: string | null;
  import_source: string;
  import_status: string;
  records_imported: number | null;
  records_failed: number | null;
  original_filename: string | null;
  email_subject: string | null;
  pabbly_execution_id: string | null;
  lead_id: string | null;
  leads?: {
    name: string;
    company: string | null;
  } | null;
}

const statusConfig: Record<string, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  completed: { icon: <CheckCircle className="h-3 w-3" />, variant: 'default' },
  processing: { icon: <Clock className="h-3 w-3" />, variant: 'secondary' },
  failed: { icon: <AlertCircle className="h-3 w-3" />, variant: 'destructive' },
  pending: { icon: <Clock className="h-3 w-3" />, variant: 'outline' },
};

export function CallImportsTab() {
  const { data: imports, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['call-report-imports'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_report_imports')
        .select(`
          id,
          created_at,
          import_source,
          import_status,
          records_imported,
          records_failed,
          original_filename,
          email_subject,
          pabbly_execution_id,
          lead_id,
          leads:lead_id (name, company)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as CallImport[];
    },
  });

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Call Report Import History
            </CardTitle>
            <CardDescription>
              Imported call reports from Pabbly Connect and other sources
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive/80">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-60" />
            <p className="font-medium">Failed to load import history</p>
            <p className="text-xs text-muted-foreground mt-1">
              Verify <code className="font-mono">GRANT SELECT ON public.call_report_imports</code> is applied.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : !imports?.length ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No imports yet</p>
            <p className="text-sm">
              Call reports will appear here when imported via Pabbly Connect
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="whitespace-nowrap">
                      {imp.created_at 
                        ? format(new Date(imp.created_at), 'MMM d, h:mm a')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {imp.leads ? (
                        <div>
                          <p className="font-medium">{imp.leads.name}</p>
                          {imp.leads.company && (
                            <p className="text-xs text-muted-foreground">{imp.leads.company}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No client linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{imp.import_source}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {imp.records_imported ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {imp.records_failed ? (
                        <span className="text-destructive font-medium">{imp.records_failed}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(imp.import_status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
