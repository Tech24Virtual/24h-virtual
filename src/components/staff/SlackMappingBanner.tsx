import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function SlackMappingBanner() {
  const { user } = useAuth();

  const { data: hasMapping, isLoading } = useQuery({
    queryKey: ['slack-mapping-check', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('slack_user_mappings')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id,
  });

  if (isLoading || hasMapping) return null;

  return (
    <Alert variant="destructive" className="border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-200 [&>svg]:text-orange-600 dark:[&>svg]:text-orange-400">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Slack Account Not Linked</AlertTitle>
      <AlertDescription>
        Your Slack account is not connected. Ask an admin or supervisor to link it so you can send and receive messages.
      </AlertDescription>
    </Alert>
  );
}
