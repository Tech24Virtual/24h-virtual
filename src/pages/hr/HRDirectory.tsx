import { useState, useEffect } from 'react';
import { Search, MoreHorizontal, UserMinus, Landmark, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HRLayout } from '@/components/hr/HRLayout';
import { AgentBankingForm } from '@/components/staff/AgentBankingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function HRDirectory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bankingOpen, setBankingOpen] = useState(false);
  const [bankingAgentId, setBankingAgentId] = useState<string | null>(null);
  const [editField, setEditField] = useState<{ id: string; field: string; value: string } | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [empRes, rolesRes] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact' }).order('full_name').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    const roleMap: Record<string, string[]> = {};
    (rolesRes.data || []).forEach((r: any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    setEmployees((empRes.data || []).map((p: any) => ({ ...p, roles: roleMap[p.id] || [] })));
    setTotalCount(empRes.count || 0);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user, page]);

  const handleUpdateField = async (id: string, field: string, value: string) => {
    const { data, error } = await supabase.from('profiles').update({ [field]: value || null }).eq('id', id).select().maybeSingle();
    if (error) { toast.error('Failed to update'); return; }
    if (!data) { toast.error("Update wasn't applied — you may not have permission to edit this employee."); return; }
    toast.success('Updated successfully');
    setEditField(null);
    setSelectedEmployee((prev: any) => (prev && prev.id === id ? { ...prev, [field]: value || null } : prev));
    fetchData();
  };

  const handleInitiateOffboarding = async (emp: any) => {
    const { error } = await supabase.from('offboarding').insert({
      agent_id: emp.id,
      initiated_by: user!.id,
      reason: 'resignation',
      status: 'initiated',
    });
    if (error) { toast.error('Failed to initiate offboarding'); return; }
    toast.success('Offboarding initiated');
    navigate('/hr-portal/people/offboarding');
  };

  const filtered = employees.filter(e => {
    const matchesSearch = !search ||
      (e.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.job_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || e.roles.includes(roleFilter);
    return matchesSearch && matchesRole;
  });

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    on_leave: 'bg-amber-100 text-amber-800',
    terminated: 'bg-red-100 text-red-800',
  };

  return (
    <HRLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Employee Directory</h1>
          <p className="text-muted-foreground mt-1">Manage all staff members</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, title, department..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter by role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">No employees found.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(emp => (
              <Card key={emp.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{emp.full_name || 'Unnamed'}</p>
                      <Badge className={`text-xs capitalize ${statusColors[emp.employment_status] || statusColors.active}`}>
                        {(emp.employment_status || 'active').replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {emp.job_title || 'No title'} {emp.department ? `• ${emp.department}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {emp.roles.map((r: string) => (
                      <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>
                    ))}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedEmployee(emp); setDetailOpen(true); }}>
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setBankingAgentId(emp.id); setBankingOpen(true); }}>
                          <Landmark className="w-4 h-4 mr-2" /> Banking Details
                        </DropdownMenuItem>
                        {emp.employment_status !== 'terminated' && (
                          <DropdownMenuItem className="text-destructive" onClick={() => handleInitiateOffboarding(emp)}>
                            <UserMinus className="w-4 h-4 mr-2" /> Initiate Offboarding
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && totalCount > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} staff members
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</Button>
              <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Employee Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.full_name || 'Employee Details'}</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={selectedEmployee.employment_status || 'active'} onValueChange={v => handleUpdateField(selectedEmployee.id, 'employment_status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Input defaultValue={selectedEmployee.department || ''} onBlur={e => handleUpdateField(selectedEmployee.id, 'department', e.target.value)} placeholder="e.g. Operations" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Job Title</Label>
                  <Input defaultValue={selectedEmployee.job_title || ''} onBlur={e => handleUpdateField(selectedEmployee.id, 'job_title', e.target.value)} placeholder="e.g. Receptionist" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hire Date</Label>
                  <Input type="date" defaultValue={selectedEmployee.hire_date || ''} onBlur={e => handleUpdateField(selectedEmployee.id, 'hire_date', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs text-muted-foreground">Roles:</Label>
                {(selectedEmployee.roles || []).map((r: string) => (
                  <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setBankingAgentId(selectedEmployee.id); setBankingOpen(true); setDetailOpen(false); }}>
                  <Landmark className="w-4 h-4 mr-2" /> Manage Banking
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Banking Dialog */}
      <Dialog open={bankingOpen} onOpenChange={setBankingOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Banking Details</DialogTitle>
          </DialogHeader>
          {bankingAgentId && <AgentBankingForm agentId={bankingAgentId} showHourlyRate />}
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
