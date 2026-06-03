import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { applyClientActivationEffects } from '@/lib/client-onboarding/applyClientActivationEffects';

interface Props {
  leadId: string;
  leadUserId?: string | null;
  leadSnapshot?: Record<string, unknown>;
  legacyChecklist?: Record<string, boolean> | null;
  onSuccess?: (handoffId: string) => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default';
}

export function RetryOnboardingInitButton({
  leadId,
  leadUserId,
  leadSnapshot,
  legacyChecklist,
  onSuccess,
  variant = 'default',
  size = 'sm',
}: Props) {
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    try {
      const result = await applyClientActivationEffects({
        leadId,
        leadUserId: leadUserId ?? null,
        leadSnapshot,
        legacyChecklist: legacyChecklist ?? null,
      });
      if (result.alreadyExisted) {
        toast.message('Onboarding already initialized');
      } else {
        toast.success('Onboarding initialized');
      }
      onSuccess?.(result.handoffId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to initialize onboarding');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button onClick={run} disabled={pending} variant={variant} size={size}>
      {pending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <RefreshCcw className="w-4 h-4 mr-2" />
      )}
      Retry onboarding init
    </Button>
  );
}
