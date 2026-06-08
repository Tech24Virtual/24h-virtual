import { useState } from 'react';
import { AlertTriangle, CheckCircle, ChevronRight, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  usePendingPolicyAcknowledgments,
  useAcknowledgePolicy,
} from '@/hooks/campaign-os/usePolicyAcknowledgments';

const POLICY_KIND_LABELS: Record<string, string> = {
  service_rule:          'Service Rule',
  restricted_disclosure: 'Restricted Disclosure',
  escalation_rule:       'Escalation Rule',
  general_policy:        'General Policy',
};

export function PolicyAcknowledgmentBanner() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: pending = [], isLoading } = usePendingPolicyAcknowledgments();
  const acknowledge = useAcknowledgePolicy();

  if (isLoading || pending.length === 0) return null;

  async function handleAcknowledge(id: string, title: string) {
    try {
      await acknowledge.mutateAsync(id);
      toast.success(`Policy acknowledged: ${title}`);
    } catch {
      toast.error('Failed to acknowledge policy. Please try again.');
    }
  }

  return (
    <>
      <Alert
        data-testid="policy-ack-banner"
        className="border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Policy update{pending.length > 1 ? 's' : ''} require acknowledgment
          <Badge
            data-testid="policy-ack-count"
            className="bg-amber-500 text-white hover:bg-amber-500 ml-1"
          >
            {pending.length}
          </Badge>
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4 mt-1">
          <span>
            You have {pending.length} policy update{pending.length > 1 ? 's' : ''} to review
            and acknowledge before your next shift.
          </span>
          <Button
            data-testid="policy-ack-review-btn"
            size="sm"
            variant="outline"
            className="border-amber-500 text-amber-800 hover:bg-amber-100 dark:border-amber-500 dark:text-amber-200 dark:hover:bg-amber-900 shrink-0"
            onClick={() => setSheetOpen(true)}
          >
            Review <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </AlertDescription>
      </Alert>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="policy-ack-sheet">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Pending Policy Acknowledgments
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {pending.map(ack => (
              <Card key={ack.id} data-testid="policy-ack-item">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" data-testid="policy-ack-title">
                        {ack.policy.title}
                      </p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {POLICY_KIND_LABELS[ack.policy.policy_kind] ?? ack.policy.policy_kind}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground prose prose-sm max-w-none line-clamp-4">
                    <ReactMarkdown>{ack.policy.body_md}</ReactMarkdown>
                  </div>

                  <Button
                    data-testid="policy-ack-acknowledge-btn"
                    size="sm"
                    className="w-full"
                    disabled={acknowledge.isPending}
                    onClick={() => handleAcknowledge(ack.id, ack.policy.title)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Acknowledge
                  </Button>
                </CardContent>
              </Card>
            ))}

            {pending.length === 0 && (
              <div
                data-testid="policy-ack-all-clear"
                className="py-12 text-center text-muted-foreground"
              >
                All policies acknowledged. You're up to date!
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
