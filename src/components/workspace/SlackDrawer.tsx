import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SlackMessenger } from '@/components/admin/crm/SlackMessenger';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SlackDrawer({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="text-base">Team Messages</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <SlackMessenger />
        </div>
      </SheetContent>
    </Sheet>
  );
}
