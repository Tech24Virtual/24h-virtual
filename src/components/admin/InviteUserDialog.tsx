import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ROLE_CONFIG, type AppRole } from './roleConfig';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}

export function InviteUserDialog({ open, onOpenChange, onInvited }: InviteUserDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(['client']);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setSelectedRoles(['client']);
    setSuccess(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }
    if (selectedRoles.length === 0) {
      toast({ title: 'No roles selected', description: 'Please assign at least one role.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('invite-user', {
        body: { name: name.trim(), email: email.trim(), password, roles: selectedRoles },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to invite user');
      if (response.data?.error) throw new Error(response.data.error);

      setSuccess(true);
      toast({ title: 'User invited', description: `${name} has been invited successfully.` });
      onInvited();
    } catch (err: any) {
      toast({ title: 'Invitation failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{success ? 'User Invited!' : 'Invite New User'}</DialogTitle>
          <DialogDescription>
            {success
              ? 'The user has been created and a welcome email has been sent.'
              : 'Create a new user account and assign portal access.'}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <div className="space-y-1">
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="text-muted-foreground mb-1">Temporary Password</p>
              <p className="font-mono font-medium">{password}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Share these credentials securely. The user should change their password after first login.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full Name *</Label>
              <Input id="invite-name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email *</Label>
              <Input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-password">Temporary Password *</Label>
              <div className="relative">
                <Input
                  id="invite-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter temporary password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Portal Access</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLE_CONFIG.map(({ role, label, description }) => (
                  <label
                    key={role}
                    className="flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={() => toggleRole(role)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0">
                      <span className="text-sm font-medium">{label}</span>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {success ? (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Creating…' : 'Invite User'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
