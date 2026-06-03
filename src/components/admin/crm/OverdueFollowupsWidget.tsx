import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

export function OverdueFollowupsWidget() {
  const { data: count = 0, isLoading } = useQuery({
    queryKey: ['overdue-followups-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('email_followups' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('follow_up_at', new Date().toISOString());
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000, // refresh every minute
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Follow-ups</CardTitle>
        <AlertCircle className={`h-4 w-4 ${count > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-2xl font-bold ${count > 0 ? 'text-destructive' : ''}`}>
            {count}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
