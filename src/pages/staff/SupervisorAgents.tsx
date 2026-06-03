import { useQuery } from '@tanstack/react-query';
import { Users, Search, Shield, Hash, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { BatchSlackInviteDialog } from '@/components/staff/BatchSlackInviteDialog';
import { LinkSlackUserDialog } from '@/components/staff/LinkSlackUserDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface AgentProfile {
  user_id: string;
  role: string;
  profile?: {
    full_name: string | null;
    company_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  email?: string;
}

export default function SupervisorAgents() {
  const [search, setSearch] = useState('');
  const [slackDialog, setSlackDialog] = useState<{ open: boolean; agentName: string; slackUserId: string }>({
    open: false, agentName: '', slackUserId: '',
  });
  const [linkDialog, setLinkDialog] = useState<{ open: boolean; agentUserId: string; agentName: string }>({
    open: false, agentUserId: '', agentName: '',
  });

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['supervisor-agents'],
    queryFn: async () => {
      // Get all users with agent/sales roles
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['agent', 'sales']);

      if (error) throw error;

      // Get profiles for those users
      const userIds = roles?.map(r => r.user_id) || [];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, phone, avatar_url')
        .in('id', userIds);

      if (profError) throw profError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return roles?.map(r => ({
        user_id: r.user_id,
        role: r.role,
        profile: profileMap.get(r.user_id) || null,
      })) as AgentProfile[];
    },
  });

  const { data: slackMappings = [] } = useQuery({
    queryKey: ['slack-user-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slack_user_mappings')
        .select('user_id, slack_user_id, slack_display_name');
      if (error) throw error;
      return data || [];
    },
  });

  const slackMap = new Map(slackMappings.map(m => [m.user_id, m]));

  const filtered = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.profile?.full_name?.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      a.user_id.toLowerCase().includes(q)
    );
  });

  const roleColors: Record<string, string> = {
    agent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    sales: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  };

  return (
    <StaffLayout role="supervisor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Team Agents</h1>
          <p className="text-muted-foreground">Overview of your team members</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{agents.length}</p>
                  <p className="text-sm text-muted-foreground">Total Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{agents.filter(a => a.role === 'agent').length}</p>
                  <p className="text-sm text-muted-foreground">Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search team..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No team members found</div>
              ) : (
                filtered.map((agent) => (
                  <div key={agent.user_id} className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {agent.profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{agent.profile?.full_name || 'Unnamed User'}</p>
                      {agent.profile?.phone && <p className="text-sm text-muted-foreground">{agent.profile.phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={roleColors[agent.role] || ''}>{agent.role}</Badge>
                      {slackMap.has(agent.user_id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() =>
                            setSlackDialog({
                              open: true,
                              agentName: agent.profile?.full_name || 'Agent',
                              slackUserId: slackMap.get(agent.user_id)!.slack_user_id,
                            })
                          }
                        >
                          <Hash className="h-3 w-3" />
                          Channels
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() =>
                            setLinkDialog({
                              open: true,
                              agentUserId: agent.user_id,
                              agentName: agent.profile?.full_name || 'Agent',
                            })
                          }
                        >
                          <Link2 className="h-3 w-3" />
                          Link Slack
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <BatchSlackInviteDialog
          open={slackDialog.open}
          onOpenChange={(open) => setSlackDialog((prev) => ({ ...prev, open }))}
          agentName={slackDialog.agentName}
          slackUserId={slackDialog.slackUserId}
        />

        <LinkSlackUserDialog
          open={linkDialog.open}
          onOpenChange={(open) => setLinkDialog((prev) => ({ ...prev, open }))}
          agentUserId={linkDialog.agentUserId}
          agentName={linkDialog.agentName}
        />
      </div>
    </StaffLayout>
  );
}