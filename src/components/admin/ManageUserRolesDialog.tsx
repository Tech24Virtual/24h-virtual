import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ROLE_CONFIG, type AppRole } from './roleConfig';

interface UserWithRoles {
  id: string;
  full_name: string | null;
  email: string | null;
  roles: AppRole[];
}

interface ManageUserRolesDialogProps {
  user: UserWithRoles | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ManageUserRolesDialog({ user, open, onOpenChange, onSaved }: ManageUserRolesDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync state when user changes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && user) {
      setSelectedRoles([...user.roles]);
    }
    onOpenChange(isOpen);
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const currentRoles = user.roles;
      const addedRoles = selectedRoles.filter(r => !currentRoles.includes(r));
      const removedRoles = currentRoles.filter(r => !selectedRoles.includes(r));

      // Insert new roles
      if (addedRoles.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .insert(addedRoles.map(role => ({ user_id: user.id, role })));
        if (error) throw error;
      }

      // Delete removed roles
      if (removedRoles.length > 0) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)
          .in('role', removedRoles);
        if (error) throw error;
      }

      // Create in-app notifications for each change
      const notifications = [
        ...addedRoles.map(role => {
          const info = ROLE_CONFIG.find(r => r.role === role);
          return {
            user_id: user.id,
            title: 'Portal access granted',
            message: `An administrator has granted you access to the ${info?.label || role}.`,
            action_url: info?.portalUrl || null,
          };
        }),
        ...removedRoles.map(role => {
          const info = ROLE_CONFIG.find(r => r.role === role);
          return {
            user_id: user.id,
            title: 'Portal access revoked',
            message: `An administrator has removed your access to the ${info?.label || role}.`,
            action_url: null,
          };
        }),
      ];

      if (notifications.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);
        if (notifError) console.error('Failed to create notifications:', notifError);
      }

      toast({ title: 'Roles updated', description: `Updated roles for ${user.full_name || user.email}` });
      onOpenChange(false);
      onSaved();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Portal Access</DialogTitle>
          <DialogDescription>
            {user.full_name || 'User'} — {user.email ?? 'no email'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
          {ROLE_CONFIG.map(({ role, label, description }) => (
            <label
              key={role}
              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={selectedRoles.includes(role)}
                onCheckedChange={() => toggleRole(role)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label className="cursor-pointer font-medium text-sm">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
