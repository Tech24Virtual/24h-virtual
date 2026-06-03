import { useState, useEffect } from 'react';
import { Sun, Moon, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const defaultBusinessHours: BusinessHours = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '17:00' },
  sunday: { enabled: false, start: '09:00', end: '17:00' },
};

const defaultAfterHours: AfterHoursSettings = {
  take_messages: true,
  emergency_escalation: false,
  holiday_coverage: true,
};

export default function Schedule() {
  const { user, profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours);
  const [afterHours, setAfterHours] = useState<AfterHoursSettings>(defaultAfterHours);

  useEffect(() => {
    if (profile) {
      const savedHours = (profile as any).business_hours;
      const savedAfterHours = (profile as any).after_hours_settings;
      
      if (savedHours && typeof savedHours === 'object') {
        setBusinessHours({ ...defaultBusinessHours, ...savedHours });
      }
      if (savedAfterHours && typeof savedAfterHours === 'object') {
        setAfterHours({ ...defaultAfterHours, ...savedAfterHours });
      }
    }
  }, [profile]);

  const handleDayToggle = (day: typeof days[number], enabled: boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled },
    }));
    setHasChanges(true);
  };

  const handleTimeChange = (day: typeof days[number], field: 'start' | 'end', value: string) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
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
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <DashboardLayout
      title="Business Hours"
      description="Set your availability and after-hours handling"
    >
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
            {days.map((day) => (
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
            ))}
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Take Messages</Label>
                <p className="text-sm text-muted-foreground">
                  Callers can leave detailed messages
                </p>
              </div>
              <Switch 
                checked={afterHours.take_messages}
                onCheckedChange={(checked) => handleAfterHoursChange('take_messages', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Emergency Escalation</Label>
                <p className="text-sm text-muted-foreground">
                  Urgent calls are forwarded to you
                </p>
              </div>
              <Switch 
                checked={afterHours.emergency_escalation}
                onCheckedChange={(checked) => handleAfterHoursChange('emergency_escalation', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Holiday Coverage</Label>
                <p className="text-sm text-muted-foreground">
                  Maintain coverage on holidays
                </p>
              </div>
              <Switch 
                checked={afterHours.holiday_coverage}
                onCheckedChange={(checked) => handleAfterHoursChange('holiday_coverage', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
