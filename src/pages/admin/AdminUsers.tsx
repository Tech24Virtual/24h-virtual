import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, UserPlus, Shield, Users, FlaskConical, ShieldOff, Mail, AlertTriangle } from 'lucide-react';
import { ManageUserRolesDialog } from '@/components/admin/ManageUserRolesDialog';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import { CreateDemoDialog } from '@/components/admin/CreateDemoDialog';
import { RevokeDemoDialog } from '@/components/admin/RevokeDemoDialog';
import { ResendDemoDialog } from '@/components/admin/ResendDemoDialog';
import { getRoleInfo, ROLE_CONFIG, type AppRole } from '@/components/admin/roleConfig';
import { format } from 'date-fns';

interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  roles: AppRole[];
  is_demo_account: boolean;
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [revokeUser, setRevokeUser] = useState<UserRow | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [resendUser, setResendUser] = useState<UserRow | null>(null);
  const [resendOpen, setResendOpen] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    staleTime: 60_000,
    queryFn: async () => {
      const [profilesResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, created_at, is_demo_account')
          .order('created_at', { ascending: false }),
        supabase
          .from('user_roles')
          .select('user_id, role'),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (rolesResult.error) throw rolesResult.error;

      const roleMap = new Map<string, AppRole[]>();
      (rolesResult.data || []).forEach((r: { user_id: string; role: string }) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        roleMap.set(r.user_id, existing);
      });

      return (profilesResult.data || []).map((p) => ({
        id: p.id,
        full_name: p.full_name ?? null,
        email: p.email ?? null,
        created_at: p.created_at,
        roles: roleMap.get(p.id) || [],
        is_demo_account: p.is_demo_account ?? false,
      })) as UserRow[];
    },
  });

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.roles.some(r => r.toLowerCase().includes(q));
    const matchesRole = roleFilter === 'all' || u.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const roleCounts = ROLE_CONFIG.reduce((acc, { role }) => {
    acc[role] = users.filter(u => u.roles.includes(role)).length;
    return acc;
  }, {} as Record<string, number>);

  const topRoles = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Gradient header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage user accounts and portal access</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDemoOpen(true)}>
              <FlaskConical className="w-4 h-4 mr-2" />
              Create Demo
            </Button>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite User
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-10 mb-0.5" />
              ) : (
                <p className="text-2xl font-bold">{totalUsers}</p>
              )}
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>

        {isLoading
          ? [1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-7 w-10 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </CardContent>
              </Card>
            ))
          : topRoles.map(([role, count]) => {
              const info = getRoleInfo(role as AppRole);
              return (
                <Card
                  key={role}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setRoleFilter(role as AppRole)}
                >
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">
                      {info.label.replace(' Portal', '').replace(' Dashboard', '')}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      {/* Search + Role filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={v => setRoleFilter(v as AppRole | 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLE_CONFIG.map(({ role, label }) => (
              <SelectItem key={role} value={role}>
                {label.replace(' Portal', '').replace(' Dashboard', '')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {roleFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setRoleFilter('all')}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10">
                  <div className="text-center text-destructive/80">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                    <p className="font-medium">Failed to load users</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verify{' '}
                      <code className="font-mono">GRANT SELECT ON public.profiles</code>{' '}
                      and{' '}
                      <code className="font-mono">public.user_roles</code>{' '}
                      are applied.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              [1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-44" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-14" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-28 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {search || roleFilter !== 'all'
                    ? 'No users match your filter'
                    : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {user.email ?? user.id}
                        </p>
                      </div>
                      {user.is_demo_account && (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] px-1.5 py-0"
                        >
                          Demo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      ) : (
                        user.roles.map(role => {
                          const info = getRoleInfo(role);
                          return (
                            <Badge key={role} variant="secondary" className={`text-xs ${info.color}`}>
                              {info.label.replace(' Portal', '').replace(' Dashboard', '')}
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.is_demo_account ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setManageOpen(true);
                            }}
                          >
                            <Shield className="w-3.5 h-3.5 mr-1.5" />
                            Manage Roles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setResendUser(user);
                              setResendOpen(true);
                            }}
                          >
                            <Mail className="w-3.5 h-3.5 mr-1.5" />
                            Resend
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setRevokeUser(user);
                              setRevokeOpen(true);
                            }}
                          >
                            <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
                            Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setManageOpen(true);
                        }}
                      >
                        <Shield className="w-3.5 h-3.5 mr-1.5" />
                        Manage Roles
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      <ManageUserRolesDialog
        user={selectedUser}
        open={manageOpen}
        onOpenChange={setManageOpen}
        onSaved={refresh}
      />
      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={refresh}
      />
      <CreateDemoDialog
        open={demoOpen}
        onOpenChange={setDemoOpen}
        onCreated={refresh}
      />
      <RevokeDemoDialog
        user={revokeUser}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onRevoked={refresh}
      />
      <ResendDemoDialog
        user={resendUser}
        open={resendOpen}
        onOpenChange={setResendOpen}
        onResent={refresh}
      />
    </div>
  );
}
