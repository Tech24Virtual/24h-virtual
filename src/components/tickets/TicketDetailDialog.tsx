import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TicketDetailView } from './TicketDetailView';

interface TicketDetailDialogProps {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
  viewContext?: string;
}

export function TicketDetailDialog({
  ticketId,
  open,
  onOpenChange,
  canManage = true,
  viewContext = 'default',
}: TicketDetailDialogProps) {
  if (!ticketId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Ticket Details</DialogTitle>
        </DialogHeader>
        <TicketDetailView
          ticketId={ticketId}
          canManage={canManage}
          backLink=""
          viewContext={viewContext}
        />
      </DialogContent>
    </Dialog>
  );
}
