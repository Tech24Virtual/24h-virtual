import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { LegacyMigratedBanner } from '@/components/campaign-os/LegacyMigratedBanner';

export default function WLPortalScripts() {
  const { clientInfo } = useWLPortal();
  const [scripts, setScripts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!clientInfo) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('wl_client_scripts')
        .select('*')
        .eq('wl_client_id', clientInfo.id)
        .order('created_at', { ascending: false });
      if (data) setScripts(data);
      setIsLoading(false);
    };
    fetch();
  }, [clientInfo]);

  return (
    <WLPortalLayout title="Call Scripts" description="Your configured call scripts">
      <div className="space-y-4">
        <LegacyMigratedBanner
          migratedCount={scripts.filter(s => !!s.migrated_to_campaign_id).length}
          totalCount={scripts.length}
          surfaceLabel="White Label Portal"
        />
        <Card>
          <CardHeader><CardTitle className="text-lg">Your Scripts</CardTitle></CardHeader>
          <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading scripts...</div>
          ) : scripts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-heading mb-2">No scripts yet</h3>
              <p className="text-sm">Your call scripts will appear here once configured.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.map((script) => (
                <div key={script.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-heading">{script.title}</h4>
                      <Badge variant={script.is_active ? 'default' : 'secondary'}>
                        {script.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {script.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{script.content}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Category: {script.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </WLPortalLayout>
  );
}
