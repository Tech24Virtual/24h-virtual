import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import {
  audienceLabel,
  phaseFromClientHandoff,
  type ClientHandoffStatus,
} from '@/lib/wl/fulfillmentLifecycle';

interface Props {
  status: ClientHandoffStatus;
  intakeId: string | null;
  audience?: 'admin' | 'supervisor';
}

export function ClientFulfillmentStatusCard({
  status,
  intakeId,
  audience = 'admin',
}: Props) {
  const phase = phaseFromClientHandoff(status);
  const label = audienceLabel(phase, audience);
  const intakeBase =
    audience === 'supervisor' ? '/staff/supervisor/fulfillment' : '/admin/fulfillment-intake';

  return (
    <Card className="p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Fulfillment phase</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Internal lifecycle projection for this onboarding.
        </p>
      </div>
      <Badge variant="secondary" className="text-sm">
        {label}
      </Badge>
      {intakeId ? (
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to={`${intakeBase}/${intakeId}`}>
            Open linked intake <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">No intake linked yet.</p>
      )}
    </Card>
  );
}
