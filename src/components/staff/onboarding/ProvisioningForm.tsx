import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ProvisioningFormProps {
  onboarding: any;
  onRefresh: () => void;
}

export function ProvisioningForm({ onboarding, onRefresh }: ProvisioningFormProps) {
  const { user } = useAuth();
  const [googleEmail, setGoogleEmail] = useState(onboarding.google_email || '');
  const [five9Username, setFive9Username] = useState(onboarding.five9_username || '');
  // Password is stored hashed — never pre-populated for security
  const [five9Password, setFive9Password] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, any> = {
        google_email: googleEmail || null,
        five9_username: five9Username || null,
      };

      // Only overwrite the stored password if a new one was entered
      if (five9Password) {
        updates.five9_password_encrypted = five9Password;
      }

      // Advance to training when all credentials are present:
      // password field filled now, OR username already existed (meaning password was set previously)
      const hasPassword = !!five9Password || !!onboarding.five9_username;
      if (googleEmail && five9Username && hasPassword) {
        updates.status = 'training';
      }

      const { error } = await supabase
        .from('agent_onboarding')
        .update(updates)
        .eq('id', onboarding.id);
      if (error) throw error;

      // Log provisioning
      await supabase.from('agent_onboarding_log').insert({
        onboarding_id: onboarding.id,
        action: 'provisioning_updated',
        performed_by: user!.id,
        details: { google_email: googleEmail, five9_username: five9Username },
      });

      // Auto-trigger Slack invite if google email is new
      if (googleEmail && googleEmail !== onboarding.google_email) {
        try {
          const { error: slackError } = await supabase.functions.invoke('slack-workspace-invite', {
            body: { email: googleEmail },
          });
          if (!slackError) {
            await supabase
              .from('agent_onboarding')
              .update({ slack_invited: true })
              .eq('id', onboarding.id);

            await supabase.from('agent_onboarding_log').insert({
              onboarding_id: onboarding.id,
              action: 'slack_invite_sent',
              performed_by: user!.id,
              details: { email: googleEmail },
            });
          }
        } catch {
          // Non-critical failure
          console.error('Slack invite failed');
        }
      }

      // Notify the agent
      await supabase.from('notifications').insert({
        user_id: onboarding.applicant_user_id,
        title: 'Your accounts are ready',
        message: `Your Google email and Five9 credentials have been set up. Check your Applicant Portal for details.`,
        category: 'onboarding',
        action_url: '/hr-portal',
      });
    },
    onSuccess: () => {
      toast.success('Provisioning saved');
      onRefresh();
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Provisioning
          {onboarding.slack_invited && (
            <Badge variant="outline" className="ml-2 text-xs">
              <MessageSquare className="w-3 h-3 mr-1" />
              Slack Invited
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Google Workspace Email</Label>
          <Input
            type="email"
            value={googleEmail}
            onChange={(e) => setGoogleEmail(e.target.value)}
            placeholder="agent@company.com"
          />
          <p className="text-xs text-muted-foreground">
            Entering this will auto-send a Slack workspace invitation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Five9 Username</Label>
            <Input
              value={five9Username}
              onChange={(e) => setFive9Username(e.target.value)}
              placeholder="Five9 login username"
            />
          </div>
          <div className="space-y-2">
            <Label>Five9 Password</Label>
            <Input
              type="password"
              value={five9Password}
              onChange={(e) => setFive9Password(e.target.value)}
              placeholder="Enter new password to update"
            />
            <p className="text-xs text-muted-foreground">
              Password is stored securely. Leave blank to keep existing password.
            </p>
          </div>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            'Save Provisioning'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
