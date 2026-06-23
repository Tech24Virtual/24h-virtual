import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackDialog } from './FeedbackDialog';

export function FeedbackWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="sm"
          variant="default"
          aria-label="Send feedback"
          onClick={() => setOpen(true)}
          className="group rounded-full shadow-lg overflow-hidden h-10 w-10 hover:w-32 transition-[width] duration-200 ease-out px-0 hover:px-3 flex items-center justify-center hover:justify-start bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span className="ml-2 whitespace-nowrap hidden group-hover:inline">Feedback</span>
        </Button>
      </div>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
