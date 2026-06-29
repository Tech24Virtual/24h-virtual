import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserPlus, Shield, Users, FlaskConical, ShieldOff, Mail } from 'lucide-react';
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
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [revokeUser, setRevokeUser] = useState<UserRow | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [resendUser, setResendUser] = useState<UserRow | null>(null);
  const [resendOpen, setResendOpen] = useState(false);
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profiles — email is synced from auth.users via trigger (migration 20260629000001)
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, is_demo_account');
      if (pErr) throw pErr;

      // Fetch all roles
      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rErr) throw rErr;

      // Build a map of user_id -> roles
      const roleMap = new Map<string, AppRole[]>();
      roles?.forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role as AppRole);
        roleMap.set(r.user_id, existing);
      });

      const merged: UserRow[] = (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: (p as any).email ?? null,
        created_at: p.created_at,
        roles: roleMap.get(p.id) || [],
        is_demo_account: (p as any).is_demo_account ?? false,
      }));

      setUsers(merged);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.roles.some(r => r.toLowerCase().includes(q))
    );
  });

  // Stats
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and portal access</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        {topRoles.map(([role, count]) => {
          const info = getRoleInfo(role as AppRole);
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{info.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
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
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found</TableCell>
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
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px] px-1.5 py-0">Demo</Badge>
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
                    <div className="flex justify-end gap-1.5">
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
                      {user.is_demo_account && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResendUser(user);
                              setResendOpen(true);
                            }}
                          >
                            <Mail className="w-3.5 h-3.5 mr-1.5" />
                            Resend
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setRevokeUser(user);
                              setRevokeOpen(true);
                            }}
                          >
                            <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
                            Revoke
                          </Button>
                        </>
                      )}
                    </div>
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
        onSaved={fetchUsers}
      />
      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={fetchUsers}
      />
      <CreateDemoDialog
        open={demoOpen}
        onOpenChange={setDemoOpen}
        onCreated={fetchUsers}
      />
      <RevokeDemoDialog
        user={revokeUser}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onRevoked={fetchUsers}
      />
      <ResendDemoDialog
        user={resendUser}
        open={resendOpen}
        onOpenChange={setResendOpen}
        onResent={fetchUsers}
      />
    </div>
  );
}
