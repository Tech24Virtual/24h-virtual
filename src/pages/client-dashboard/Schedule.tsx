import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sun, Moon, Save, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface AfterHoursSettings {
  take_messages: boolean;
  emergency_escalation: boolean;
  holiday_coverage: boolean;
}

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const dayLabels: Record<typeof days[number], string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const DEFAULT_HOURS: BusinessHours = {
  monday:    { enabled: true,  start: '09:00', end: '17:00' },
  tuesday:   { enabled: true,  start: '09:00', end: '17:00' },
  wednesday: { enabled: true,  start: '09:00', end: '17:00' },
  thursday:  { enabled: true,  start: '09:00', end: '17:00' },
  friday:    { enabled: true,  start: '09:00', end: '17:00' },
  saturday:  { enabled: false, start: '09:00', end: '17:00' },
  sunday:    { enabled: false, start: '09:00', end: '17:00' },
};

const DEFAULT_AFTER_HOURS: AfterHoursSettings = {
  take_messages: true, emergency_escalation: false, holiday_coverage: true,
};

export default function Schedule() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [afterHours, setAfterHours] = useState<AfterHoursSettings>(DEFAULT_AFTER_HOURS);

  // Query profile for schedule data
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['client-schedule', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('business_hours, after_hours_settings')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Initialise form state once the profile loads — select() is pure, so
  // setState belongs here in useEffect, not inside the select callback
  useEffect(() => {
    if (!profileData) return;
    if (profileData.business_hours && typeof profileData.business_hours === 'object') {
      setBusinessHours({ ...DEFAULT_HOURS, ...(profileData.business_hours as unknown as BusinessHours) });
    }
    if (profileData.after_hours_settings && typeof profileData.after_hours_settings === 'object') {
      setAfterHours({ ...DEFAULT_AFTER_HOURS, ...(profileData.after_hours_settings as unknown as AfterHoursSettings) });
    }
  }, [profileData]);

  const handleDayToggle = (day: typeof days[number], enabled: boolean) => {
    setBusinessHours(prev => ({ ...prev, [day]: { ...prev[day], enabled } }));
    setHasChanges(true);
  };

  const handleTimeChange = (day: typeof days[number], field: 'start' | 'end', value: string) => {
    setBusinessHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    setHasChanges(true);
  };

  const handleAfterHoursChange = (key: keyof AfterHoursSettings, value: boolean) => {
    setAfterHours(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_hours: businessHours as unknown as Json,
          after_hours_settings: afterHours as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Schedule saved successfully');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['client-schedule', user.id] });
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Gradient header */}
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Business Hours</h1>
        <p className="text-muted-foreground mt-0.5">Set your availability and after-hours handling</p>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 mb-6">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Schedule changes are reviewed by your account team and take effect within 24 hours.
        </p>
      </div>

      {hasChanges && (
        <div className="mb-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} variant="cta">
            <Save className="mr-2 w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="w-5 h-5 text-primary" />
              Regular Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))
            ) : (
              days.map((day) => (
                <div key={day} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={businessHours[day].enabled}
                      onCheckedChange={(checked) => handleDayToggle(day, checked)}
                    />
                    <span className="font-medium w-24">{dayLabels[day]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {businessHours[day].enabled ? (
                      <>
                        <Input
                          type="time"
                          value={businessHours[day].start}
                          onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={businessHours[day].end}
                          onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                          className="w-32"
                        />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Moon className="w-5 h-5 text-primary" />
              After-Hours Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Take Messages</Label>
                    <p className="text-sm text-muted-foreground">Callers can leave detailed messages</p>
                  </div>
                  <Switch
                    checked={afterHours.take_messages}
                    onCheckedChange={(v) => handleAfterHoursChange('take_messages', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Emergency Escalation</Label>
                    <p className="text-sm text-muted-foreground">Urgent calls are forwarded to you</p>
                  </div>
                  <Switch
                    checked={afterHours.emergency_escalation}
                    onCheckedChange={(v) => handleAfterHoursChange('emergency_escalation', v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Holiday Coverage</Label>
                    <p className="text-sm text-muted-foreground">Maintain coverage on holidays</p>
                  </div>
                  <Switch
                    checked={afterHours.holiday_coverage}
                    onCheckedChange={(v) => handleAfterHoursChange('holiday_coverage', v)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
