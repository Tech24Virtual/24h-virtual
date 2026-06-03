import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, DollarSign } from 'lucide-react';
import { formatAddOnPrice, getAddOnBySlug } from '@/lib/addOnsPricing';

interface AddOnSummaryItem {
  slug: string;
  name: string;
  count: number;
  revenue: number;
}

interface AddOnsSummaryProps {
  data: AddOnSummaryItem[];
  isLoading: boolean;
}

export function AddOnsSummary({ data, isLoading }: AddOnsSummaryProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Add-On Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}/mo</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Add-Ons</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalCount}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add-Ons Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Add-Ons Breakdown</CardTitle>
          <CardDescription>
            Active add-ons across all clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active add-ons</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((item) => {
                const addon = getAddOnBySlug(item.slug);
                return (
                  <div 
                    key={item.slug} 
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {addon ? formatAddOnPrice(addon) : `$${item.revenue / item.count}/unit`}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">
                        {item.count} active
                      </Badge>
                      <div className="text-right min-w-[80px]">
                        <div className="font-medium">${item.revenue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">/month</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
