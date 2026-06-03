import { Link } from 'react-router-dom';
import { useCallFlows } from '@/hooks/campaign-os/useCallFlows';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhoneCall, ArrowRight } from 'lucide-react';

export default function CallFlows() {
  const { data: flows = [], isLoading } = useCallFlows();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Call flows</h2>
        <p className="text-sm text-muted-foreground mt-1">
          A call flow is a distinct phone-handling setup, such as a main line, sales line, or switchboard. Each call flow has one campaign.
        </p>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : flows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No call flows yet. Add one from a client or location detail page.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {flows.map((f) => (
            <Link key={f.id} to={`/admin/campaign-os/call-flows/${f.id}`}>
              <div className="flex items-center justify-between border rounded-md px-3 py-2 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2 text-sm">
                  <PhoneCall className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{f.display_name ?? f.department_name}</span>
                  <Badge variant="outline" className="text-xs">{f.owner_kind}</Badge>
                  <Badge variant="outline" className="text-xs">{f.routing_entry_type}</Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
