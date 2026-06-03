import { Link } from 'react-router-dom';
import { useClientLocations } from '@/hooks/campaign-os/useClientLocations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight } from 'lucide-react';

export default function Locations() {
  const { data: locations = [], isLoading } = useClientLocations();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Locations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Branches, offices, and franchise sites across all clients. Open a client to add or manage their locations.
        </p>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : locations.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No locations yet.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {locations.map((l) => {
            const kind = l.tenant_kind === 'wl_partner' ? 'wl_client' : 'direct_24h';
            const clientId = l.wl_client_id ?? l.client_lead_id ?? '';
            return (
              <Link key={l.id} to={`/admin/campaign-os/clients/${clientId}/locations/${l.id}?kind=${kind}`}>
                <div className="flex items-center justify-between border rounded-md px-3 py-2 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{l.name}</span>
                    <Badge variant="outline" className="text-xs">{l.status}</Badge>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
