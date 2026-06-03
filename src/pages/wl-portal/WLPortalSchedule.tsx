import { useState, useEffect } from 'react';
import { Sun, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WLPortalLayout } from '@/components/wl-portal/WLPortalLayout';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleRow {
  id?: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_enabled: boolean;
}

export default function WLPortalSchedule() {
  const { clientInfo } = useWLPortal();
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!clientInfo) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('wl_client_schedules')
        .select('*')
        .eq('wl_client_id', clientInfo.id)
        .order('day_of_week');

      if (data && data.length > 0) {
        setSchedules(data.map(d => ({
          id: d.id,
          day_of_week: d.day_of_week,
          start_time: d.start_time,
          end_time: d.end_time,
          is_enabled: d.is_enabled ?? true,
        })));
      } else {
        // Default schedule
        setSchedules(Array.from({ length: 7 }, (_, i) => ({
          day_of_week: i,
          start_time: '09:00',
          end_time: '17:00',
          is_enabled: i >= 1 && i <= 5,
        })));
      }
      setIsLoading(false);
    };
    fetch();
  }, [clientInfo]);

  const handleSave = async () => {
    if (!clientInfo) return;
    setIsSaving(true);
    try {
      // Delete existing and re-insert
      await supabase.from('wl_client_schedules').delete().eq('wl_client_id', clientInfo.id);
      const rows = schedules.map(s => ({
        partner_id: clientInfo.partner_id,
        wl_client_id: clientInfo.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_enabled: s.is_enabled,
      }));
      const { error } = await supabase.from('wl_client_schedules').insert(rows);
      if (error) throw error;
      toast.success('Schedule saved');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const update = (idx: number, field: string, value: any) => {
    setSchedules(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  return (
    <WLPortalLayout title="Business Hours" description="Set your availability">
      <div className="flex justify-end mb-4">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sun className="w-5 h-5 text-primary" />
            Regular Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            schedules.map((s, i) => (
              <div key={s.day_of_week} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Switch checked={s.is_enabled} onCheckedChange={(v) => update(i, 'is_enabled', v)} />
                  <span className="font-medium w-24">{dayNames[s.day_of_week]}</span>
                </div>
                <div className="flex items-center gap-2">
                  {s.is_enabled ? (
                    <>
                      <Input type="time" value={s.start_time || '09:00'} onChange={(e) => update(i, 'start_time', e.target.value)} className="w-32" />
                      <span className="text-muted-foreground">to</span>
                      <Input type="time" value={s.end_time || '17:00'} onChange={(e) => update(i, 'end_time', e.target.value)} className="w-32" />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </WLPortalLayout>
  );
}
