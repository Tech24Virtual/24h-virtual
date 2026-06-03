import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShieldOff, Trash2, Loader2 } from 'lucide-react';
import { getRoleInfo, type AppRole } from '@/components/admin/roleConfig';

interface RevokeDemoUser {
  id: string;
  full_name: string | null;
  roles: AppRole[];
}

interface RevokeDemoDialogProps {
  user: RevokeDemoUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRevoked: () => void;
}

export function RevokeDemoDialog({ user, open, onOpenChange, onRevoked }: RevokeDemoDialogProps) {
  const [loading, setLoading] = useState<'disable' | 'delete' | null>(null);

  const handleDisableAccess = async () => {
    if (!user) return;
    setLoading('disable');
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('All portal access revoked for ' + (user.full_name || 'demo user'));
      onOpenChange(false);
      onRevoked();
    } catch (err: any) {
      toast.error('Failed to revoke access: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading('delete');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('delete-demo-account', {
        body: { userId: user.id },
      });

      if (res.error) throw res.error;
      const result = res.data as any;
      if (result?.error) throw new Error(result.error);

      toast.success('Demo account deleted: ' + (user.full_name || user.id));
      onOpenChange(false);
      onRevoked();
    } catch (err: any) {
      toast.error('Failed to delete account: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(null);
    }
  };

  if (!user) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Demo Access</AlertDialogTitle>
          <AlertDialogDescription>
            Choose how to revoke access for <strong>{user.full_name || 'Unnamed'}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {user.roles.length > 0 && (
          <div className="flex flex-wrap gap-1 py-2">
            {user.roles.map(role => {
              const info = getRoleInfo(role);
              return (
                <Badge key={role} variant="secondary" className={`text-xs ${info.color}`}>
                  {info.label}
                </Badge>
              );
            })}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            disabled={!!loading}
            onClick={handleDisableAccess}
          >
            {loading === 'disable' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
            Disable Access
            <span className="ml-auto text-xs text-muted-foreground">Remove all roles, keep account</span>
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start gap-2"
            disabled={!!loading}
            onClick={handleDeleteAccount}
          >
            {loading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Account
            <span className="ml-auto text-xs text-destructive-foreground/70">Permanently remove user</span>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={!!loading}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
