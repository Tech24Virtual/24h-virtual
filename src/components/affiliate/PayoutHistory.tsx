import { format } from 'date-fns';
import { DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Payout {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  requested_at: string;
  processed_at: string | null;
}

interface PayoutHistoryProps {
  payouts: Payout[];
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-primary/10 text-primary',
  completed: 'bg-cta/10 text-cta',
  failed: 'bg-destructive/10 text-destructive',
};

export function PayoutHistory({ payouts, isLoading }: PayoutHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading payouts...
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium mb-2">No payout requests yet</p>
        <p className="text-sm">Request a payout when your balance reaches $100</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Processed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payouts.map((payout) => (
          <TableRow key={payout.id}>
            <TableCell className="font-medium">
              ${payout.amount.toFixed(2)}
            </TableCell>
            <TableCell className="capitalize">
              {payout.payment_method?.replace('_', ' ') || '-'}
            </TableCell>
            <TableCell>
              <Badge
                variant="secondary"
                className={cn(statusColors[payout.status] || 'bg-muted')}
              >
                {payout.status}
              </Badge>
            </TableCell>
            <TableCell>
              {format(new Date(payout.requested_at), 'MMM d, yyyy')}
            </TableCell>
            <TableCell>
              {payout.processed_at
                ? format(new Date(payout.processed_at), 'MMM d, yyyy')
                : '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
