import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HRLayout } from '@/components/hr/HRLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Send, Plus, Mail, MailOpen } from 'lucide-react';

const categoryColors: Record<string, string> = {
  announcement: 'bg-blue-100 text-blue-800',
  warning: 'bg-amber-100 text-amber-800',
  commendation: 'bg-green-100 text-green-800',
  general: 'bg-gray-100 text-gray-800',
};

export default function HRCommunications() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({ to_user_id: '', subject: '', message: '', category: 'general' });

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    const [sentRes, inboxRes, empRes] = await Promise.all([
      (supabase as any).from('hr_communications').select('*, to_profile:to_user_id(full_name)').eq('from_user_id', user.id).order('created_at', { ascending: false }),
      (supabase as any).from('hr_communications').select('*, from_profile:from_user_id(full_name)').eq('to_user_id', user.id).order('created_at', { ascending: false }),
      (supabase as any).from('profiles').select('id, full_name').order('full_name'),
    ]);
    setMessages(sentRes.data || []);
    setInbox(inboxRes.data || []);
    setEmployees(empRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleSend = async () => {
    if (!form.subject.trim() || !form.message.trim()) { toast.error('Subject and message required'); return; }
    
    if (form.to_user_id) {
      // Direct message
      const { error } = await supabase.from('hr_communications').insert({
        from_user_id: user!.id,
        to_user_id: form.to_user_id,
        subject: form.subject,
        message: form.message,
        category: form.category,
      });
      if (error) { toast.error('Failed to send'); return; }
    } else {
      // Broadcast to all
      const inserts = employees.filter(e => e.id !== user!.id).map(e => ({
        from_user_id: user!.id,
        to_user_id: e.id,
        subject: form.subject,
        message: form.message,
        category: form.category,
      }));
      if (inserts.length > 0) {
        const { error } = await supabase.from('hr_communications').insert(inserts);
        if (error) { toast.error('Failed to broadcast'); return; }
      }
    }
    
    toast.success(form.to_user_id ? 'Message sent' : 'Announcement broadcast');
    setComposeOpen(false);
    setForm({ to_user_id: '', subject: '', message: '', category: 'general' });
    fetchData();
  };

  const handleMarkRead = async (id: string) => {
    await supabase.from('hr_communications').update({ read_at: new Date().toISOString() }).eq('id', id);
    fetchData();
  };

  return (
    <HRLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Communications</h1>
            <p className="text-muted-foreground mt-1">Announcements, direct messages, and inbox</p>
          </div>
          <Button onClick={() => setComposeOpen(true)}><Plus className="w-4 h-4 mr-2" /> Compose</Button>
        </div>

        <Tabs defaultValue="inbox">
          <TabsList>
            <TabsTrigger value="inbox">Inbox ({inbox.filter(m => !m.read_at).length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({messages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="inbox" className="space-y-3 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">Loading...</div>
            ) : inbox.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No messages in inbox.</CardContent></Card>
            ) : (
              inbox.map(m => (
                <Card key={m.id} className={!m.read_at ? 'border-primary/30 bg-primary/5' : ''}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {!m.read_at ? <Mail className="w-4 h-4 text-primary" /> : <MailOpen className="w-4 h-4 text-muted-foreground" />}
                        <p className="font-medium">{m.subject}</p>
                        <Badge className={`text-xs ${categoryColors[m.category] || categoryColors.general}`}>{m.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), 'MMM d, h:mm a')}</span>
                        {!m.read_at && <Button size="sm" variant="ghost" onClick={() => handleMarkRead(m.id)}>Mark Read</Button>}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">From: {m.from_profile?.full_name || 'Unknown'}</p>
                    <p className="text-sm mt-1">{m.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3 mt-4">
            {messages.length === 0 ? (
              <Card><CardContent className="p-12 text-center text-muted-foreground">No sent messages.</CardContent></Card>
            ) : (
              messages.map(m => (
                <Card key={m.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{m.subject}</p>
                        <Badge className={`text-xs ${categoryColors[m.category] || categoryColors.general}`}>{m.category}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">To: {m.to_profile?.full_name || 'All Staff'}</p>
                    <p className="text-sm mt-1">{m.message}</p>
                    {m.read_at && <p className="text-xs text-muted-foreground mt-1">Read {format(new Date(m.read_at), 'MMM d, h:mm a')}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Compose Message</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={form.to_user_id || 'broadcast'} onValueChange={v => setForm(p => ({ ...p, to_user_id: v === 'broadcast' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="All Staff (Broadcast)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="broadcast">All Staff (Broadcast)</SelectItem>
                  {employees.filter(e => e.id !== user?.id).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name || 'Unnamed'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="commendation">Commendation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Message subject" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Write your message..." rows={5} />
            </div>
            <Button className="w-full" onClick={handleSend}><Send className="w-4 h-4 mr-2" /> Send</Button>
          </div>
        </DialogContent>
      </Dialog>
    </HRLayout>
  );
}
