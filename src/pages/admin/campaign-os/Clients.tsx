import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClientsList } from '@/hooks/campaign-os/useClientsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import { ConvertibleLeadPickerDialog } from '@/components/admin/ConvertibleLeadPickerDialog';
import { ActiveAccountsAuditPanel } from '@/components/admin/ActiveAccountsAuditPanel';
import { ConversionsSummaryWidget } from '@/components/admin/ConversionsSummaryWidget';

export default function Clients() {
  const { data: clients = [], isLoading, isError } = useClientsList();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Active Accounts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          An active account is the business you service. Pick an account to manage its locations
          and call flows.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="py-12 text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm font-medium text-destructive">Failed to load active accounts</p>
            <p className="text-xs text-muted-foreground">Check your connection or contact support if this persists.</p>
          </CardContent>
        </Card>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto" />
            <div>
              <p className="text-sm font-medium">No active accounts yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Convert a qualified lead to seed your first active account with a starter template.
              </p>
            </div>
            <Button onClick={() => setPickerOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Convert a Qualified Lead
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={`${c.kind}-${c.id}`} to={`/admin/campaign-os/clients/${c.id}?kind=${c.kind}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <CardTitle className="text-base truncate">{c.name}</CardTitle>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex items-center gap-2">
                  <Badge variant={c.kind === 'wl_client' ? 'secondary' : 'outline'} className="text-xs">
                    {c.kind === 'wl_client' ? 'White-label' : 'Direct'}
                  </Badge>
                  {c.partner_name && (
                    <span className="text-xs text-muted-foreground truncate">{c.partner_name}</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ConversionsSummaryWidget />

      <ActiveAccountsAuditPanel />

      <ConvertibleLeadPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}
