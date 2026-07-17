import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Link2, Unlink, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SlackUser {
  slack_user_id: string;
  display_name: string;
  email: string | null;
}

export function SlackUserMappings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [slackUsers, setSlackUsers] = useState<SlackUser[]>([]);
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});

  // Fetch CRM users with roles
  const { data: crmUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['crm-users-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['agent', 'supervisor', 'admin', 'sales', 'billing', 'tech']);

      if (error) throw error;

      // Deduplicate by user_id
      const uniqueUsers = new Map<string, { user_id: string; roles: string[] }>();
      data.forEach((r) => {
        const existing = uniqueUsers.get(r.user_id);
        if (existing) {
          existing.roles.push(r.role);
        } else {
          uniqueUsers.set(r.user_id, { user_id: r.user_id, roles: [r.role] });
        }
      });
      const users = Array.from(uniqueUsers.values());
      if (!users.length) return [];

      // No FK between user_roles and profiles, so PostgREST can't embed —
      // fetch profiles separately and merge client-side.
      // profiles.full_name/email predate types.ts; cast needed.
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, email')
        .in('id', users.map((u) => u.user_id));
      if (profilesError) throw profilesError;

      const profileById = new Map<string, { full_name: string | null; email: string | null }>(
        (profiles || []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }])
      );

      return users.map((u) => ({
        ...u,
        full_name: profileById.get(u.user_id)?.full_name ?? null,
        email: profileById.get(u.user_id)?.email ?? null,
      }));
    },
  });

  // Fetch existing mappings
  const { data: existingMappings = [] } = useQuery({
    queryKey: ['slack-user-mappings-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slack_user_mappings')
        .select('*');

      if (error) throw error;
      return data;
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/slack-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );
      const result = await resp.json();
      if (!resp.ok || result.error) {
        throw new Error(result.error || 'Sync failed');
      }
      setSlackUsers(result.slack_users || []);
      toast({
        title: 'Sync complete',
        description: `${result.channels_synced} channels synced, ${result.users_fetched} Slack users found.`,
      });
      queryClient.invalidateQueries({ queryKey: ['slack-channels'] });
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const handleMap = async (userId: string, slackUserId: string) => {
    const slackUser = slackUsers.find((u) => u.slack_user_id === slackUserId);
    const { error } = await supabase.from('slack_user_mappings').upsert(
      {
        user_id: userId,
        slack_user_id: slackUserId,
        slack_display_name: slackUser?.display_name || null,
      },
      { onConflict: 'slack_user_id' }
    );

    if (error) {
      toast({ title: 'Mapping failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Mapped', description: `User linked to ${slackUser?.display_name || slackUserId}` });
      queryClient.invalidateQueries({ queryKey: ['slack-user-mappings-all'] });
    }
  };

  const handleUnmap = async (userId: string) => {
    const { error } = await supabase
      .from('slack_user_mappings')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Unlinked', description: 'Slack mapping removed.' });
      queryClient.invalidateQueries({ queryKey: ['slack-user-mappings-all'] });
    }
  };

  const getMappingForUser = (userId: string) =>
    existingMappings.find((m) => m.user_id === userId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Slack User Mappings
        </CardTitle>
        <CardDescription>
          Link CRM users to their Slack accounts. Click "Sync from Slack" first to load available Slack users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync from Slack
        </Button>

        {usersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Slack Mapping</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crmUsers.map((u) => {
                const mapping = getMappingForUser(u.user_id);
                return (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="font-medium">{u.full_name ?? 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((r) => (
                          <span key={r} className="text-xs bg-muted px-1.5 py-0.5 rounded">{r}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {mapping ? (
                        <span className="text-sm text-primary font-medium">
                          {mapping.slack_display_name || mapping.slack_user_id}
                        </span>
                      ) : slackUsers.length > 0 ? (
                        <Select
                          value={pendingMappings[u.user_id] || ''}
                          onValueChange={(val) =>
                            setPendingMappings((prev) => ({ ...prev, [u.user_id]: val }))
                          }
                        >
                          <SelectTrigger className="w-48 h-8 text-xs">
                            <SelectValue placeholder="Select Slack user" />
                          </SelectTrigger>
                          <SelectContent>
                            {slackUsers.map((su) => (
                              <SelectItem key={su.slack_user_id} value={su.slack_user_id}>
                                {su.display_name} {su.email ? `(${su.email})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sync first</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapping ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnmap(u.user_id)}
                        >
                          <Unlink className="h-3 w-3 mr-1" /> Unlink
                        </Button>
                      ) : pendingMappings[u.user_id] ? (
                        <Button
                          size="sm"
                          onClick={() => handleMap(u.user_id, pendingMappings[u.user_id])}
                        >
                          <Link2 className="h-3 w-3 mr-1" /> Link
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
