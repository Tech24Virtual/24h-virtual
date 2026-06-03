import { useState, useEffect } from 'react';
import { User, Bell, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { HRLayout } from '@/components/hr/HRLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export default function HRSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', company_name: '', phone: '' });
  const [emailNotif, setEmailNotif] = useState(true);

  useEffect(() => {
    if (profile) {
      setFormData({ full_name: profile.full_name || '', company_name: profile.company_name || '', phone: profile.phone || '' });
      const prefs = (profile as any).notification_preferences;
      if (prefs && typeof prefs === 'object') setEmailNotif(prefs.email_notifications ?? true);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: formData.full_name, company_name: formData.company_name, phone: formData.phone,
        notification_preferences: { email_notifications: emailNotif } as unknown as Json,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      if (error) throw error;
      if (refreshProfile) await refreshProfile();
      toast.success('Settings saved successfully');
    } catch { toast.error('Failed to save settings'); }
    finally { setIsSaving(false); }
  };

  return (
    <HRLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" />Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="fullName">Full Name</Label><Input id="fullName" value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" defaultValue={user?.email || ''} disabled /><p className="text-xs text-muted-foreground">Contact support to change your email</p></div>
              <div className="space-y-2"><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} /></div>
              <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-primary" />Notifications</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div><Label>Email Notifications</Label><p className="text-sm text-muted-foreground">Receive updates via email</p></div>
                  <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Security</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">Change Password</Button>
                <Button variant="outline" className="w-full">Enable Two-Factor Authentication</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </HRLayout>
  );
}
