import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HRLayout } from '@/components/hr/HRLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Users } from 'lucide-react';
import { RunHiringAgentButton } from '@/components/missions/RunHiringAgentButton';
import { MissionsList } from '@/components/missions/MissionsList';

export default function HRJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', department: '', location: '', description: '', requirements: '', status: 'open' });

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [jobRes, appRes] = await Promise.all([
      supabase.from('job_postings').select('*, job_applications(id)').order('created_at', { ascending: false }),
      supabase.from('job_applications').select('*, job_posting:job_postings(title)').order('applied_at', { ascending: false }),
    ]);
    setJobs((jobRes.data || []).map((j: any) => ({ ...j, application_count: j.job_applications?.length || 0 })));
    setApplicants(appRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    const payload = { title: form.title, department: form.department || null, location: form.location || null, description: form.description || null, requirements: form.requirements || null, status: form.status };
    
    if (editingJob) {
      const { error } = await supabase.from('job_postings').update(payload).eq('id', editingJob.id);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Job posting updated');
    } else {
      const { error } = await supabase.from('job_postings').insert(payload);
      if (error) { toast.error('Failed to create'); return; }
      toast.success('Job posting created');
    }
    setDialogOpen(false);
    setEditingJob(null);
    setForm({ title: '', department: '', location: '', description: '', requirements: '', status: 'open' });
    fetchData();
  };

  const handleUpdateApplicantStatus = async (appId: string, status: string) => {
    const { error } = await supabase.from('job_applications').update({ status, updated_at: new Date().toISOString() }).eq('id', appId);
    if (error) { toast.error('Failed to update'); return; }
    toast.success(`Status updated to ${status}`);
    fetchData();
  };

  const openEdit = (job: any) => {
    setEditingJob(job);
    setForm({ title: job.title, department: job.department || '', location: job.location || '', description: job.description || '', requirements: job.requirements || '', status: job.status || 'open' });
    setDialogOpen(true);
  };

  const jobApplicants = selectedJobId ? applicants.filter(a => a.job_posting_id === selectedJobId) : [];
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-800', reviewing: 'bg-amber-100 text-amber-800', interviewing: 'bg-purple-100 text-purple-800',
    accepted: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800',
  };

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Job Postings</h1>
            <p className="text-muted-foreground mt-1">Manage open positions and applicants</p>
          </div>
          <div className="flex gap-3">
            <RunHiringAgentButton />
            <Button onClick={() => { setEditingJob(null); setForm({ title: '', department: '', location: '', description: '', requirements: '', status: 'open' }); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Create Posting
            </Button>
          </div>
        </div>

        <Tabs defaultValue="postings">
          <TabsList>
            <TabsTrigger value="postings">Postings ({jobs.length})</TabsTrigger>
            <TabsTrigger value="applicants">Applicants ({applicants.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="postings" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
            ) : jobs.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No job postings found.</CardContent></Card>
            ) : (
              jobs.map(job => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {job.department && <span>{job.department}</span>}
                          {job.location && <><span>•</span><span>{job.location}</span></>}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedJobId(job.id); }}>
                          <Users className="w-4 h-4 mr-1" /> {job.application_count}
                        </Button>
                        <Badge variant={job.status === 'open' ? 'default' : 'secondary'} className="capitalize">{job.status || 'draft'}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(job)}><Pencil className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  {job.description && (
                    <CardContent><p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p></CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="applicants" className="space-y-3 mt-4">
            {applicants.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No applicants found.</CardContent></Card>
            ) : (
              applicants.map(app => (
                <Card key={app.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-sm text-muted-foreground">{app.email} • {app.job_posting?.title || 'No posting'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`capitalize ${statusColors[app.status] || statusColors.new}`}>{app.status || 'new'}</Badge>
                      <Select value={app.status || 'new'} onValueChange={v => handleUpdateApplicantStatus(app.id, v)}>
                        <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="interviewing">Interviewing</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <MissionsList title="Recent Hiring Missions" missionTypeFilter="hiring_agent" limit={5} />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingJob ? 'Edit Job Posting' : 'Create Job Posting'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Virtual Receptionist" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Operations" /></div>
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Remote" /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} /></div>
            <div className="space-y-2"><Label>Requirements</Label><Textarea value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} rows={3} /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave}>{editingJob ? 'Update' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedJobId} onOpenChange={open => !open && setSelectedJobId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Applicants for {selectedJob?.title || 'Job'}</DialogTitle>
          </DialogHeader>
          {jobApplicants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No applicants for this job yet.</p>
          ) : (
            <div className="space-y-2">
              {jobApplicants.map(app => (
                <div key={app.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{app.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{app.email}</p>
                  </div>
                  <Badge className={`capitalize shrink-0 ${statusColors[app.status] || statusColors.new}`}>{app.status || 'new'}</Badge>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => setSelectedJobId(null)}>Close</Button>
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
