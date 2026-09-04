import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Search, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DriftJson {
  missing_in_five9?: string[];
  missing_in_os?: string[];
  type_mismatches?: Array<{ name: string; os_type: string | null; five9_type: string | null }>;
  kind_mismatches?: Array<{ name: string; os_kind: string | null; five9_kind: string | null }>;
  total_drift?: number;
}

export default function TechFive9() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  const { data: departments } = useQuery({
    queryKey: ['tech-five9-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_departments')
        .select('id, department_name, display_name')
        .order('department_name');
      if (error) throw error;
      return data || [];
    },
  });

  const departmentName = useMemo(() => {
    const map = new Map<string, string>();
    (departments || []).forEach(d => map.set(d.id, d.display_name || d.department_name));
    return (id: string | null) => (id ? map.get(id) || id : '—');
  }, [departments]);

  const { data: driftSnapshots, isLoading: driftLoading } = useQuery({
    queryKey: ['tech-five9-drift-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('five9_drift_snapshots')
        .select('id, client_department_id, source, captured_at, drift')
        .order('captured_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ['tech-five9-variable-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('five9_variable_mappings')
        .select('id, five9_variable_name, data_type, client_department_id, created_at')
        .order('five9_variable_name');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredDriftSnapshots = useMemo(() => {
    if (!driftSnapshots) return driftSnapshots;
    if (selectedDeptId === 'all') return driftSnapshots;
    return driftSnapshots.filter(s => s.client_department_id === selectedDeptId);
  }, [driftSnapshots, selectedDeptId]);

  const filteredMappings = useMemo(() => {
    if (!mappings) return mappings;
    let result = mappings;
    if (selectedDeptId !== 'all') result = result.filter(m => m.client_department_id === selectedDeptId);
    const term = searchTerm.trim().toLowerCase();
    if (term) result = result.filter(m => m.five9_variable_name.toLowerCase().includes(term));
    return result;
  }, [mappings, searchTerm, selectedDeptId]);

  const driftCounts = (drift: DriftJson | null | undefined) => ({
    missingInFive9: drift?.missing_in_five9?.length || 0,
    missingInOs: drift?.missing_in_os?.length || 0,
    typeMismatches: drift?.type_mismatches?.length || 0,
    kindMismatches: drift?.kind_mismatches?.length || 0,
  });

  return (
    <StaffLayout role="tech">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Five9 Management</h1>
            <p className="text-muted-foreground">Monitor variable drift and manage Five9 variable mappings</p>
          </div>
          <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {(departments || []).map(d => (
                <SelectItem key={d.id} value={d.id}>{d.display_name || d.department_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="drift">
          <TabsList>
            <TabsTrigger value="drift">Drift Detection</TabsTrigger>
            <TabsTrigger value="mappings">Variable Mappings</TabsTrigger>
          </TabsList>

          <TabsContent value="drift" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>On-demand drift checks are unavailable</AlertTitle>
              <AlertDescription>
                There is currently no scheduled job or working on-demand trigger for Five9 drift detection from this page.
                The table below shows historical snapshots only.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manual Paste</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">For manual drift analysis, use the Admin → Five9 tab.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Drift Snapshots</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {driftLoading ? (
                  <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !filteredDriftSnapshots?.length ? (
                  <div className="text-center py-8 text-muted-foreground">No drift snapshots yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Call Flow / Department</TableHead>
                        <TableHead>Missing in Five9</TableHead>
                        <TableHead>Missing in OS</TableHead>
                        <TableHead>Type Mismatches</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Captured</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDriftSnapshots.map(snap => {
                        const counts = driftCounts(snap.drift as DriftJson);
                        const total = counts.missingInFive9 + counts.missingInOs + counts.typeMismatches + counts.kindMismatches;
                        return (
                          <TableRow key={snap.id}>
                            <TableCell className="font-medium">{departmentName(snap.client_department_id)}</TableCell>
                            <TableCell>{counts.missingInFive9}</TableCell>
                            <TableCell>{counts.missingInOs}</TableCell>
                            <TableCell>{counts.typeMismatches + counts.kindMismatches}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{snap.source.replace('_', ' ')}</Badge></TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {total > 0 ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                )}
                                {formatDistanceToNow(new Date(snap.captured_at), { addSuffix: true })}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mappings" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search variable name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

            <Card>
              <CardContent className="p-0">
                {mappingsLoading ? (
                  <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : !filteredMappings?.length ? (
                  <div className="text-center py-8 text-muted-foreground">No variable mappings found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variable Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Call Flow / Department</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMappings.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-sm">{m.five9_variable_name}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{m.data_type}</Badge></TableCell>
                          <TableCell>{departmentName(m.client_department_id)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
}
