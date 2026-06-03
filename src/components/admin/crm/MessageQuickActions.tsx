import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  CheckSquare, Ticket, Phone, ListTodo, PhoneOutgoing,
  Loader2, Check, Clock, AlertTriangle,
} from 'lucide-react';
import { InlineTaskForm } from '@/components/staff/InlineTaskForm';
import { InlineTicketForm } from '@/components/staff/InlineTicketForm';

interface MessageQuickActionsProps {
  channelName?: string;
}

type ActiveView = 'tabs' | 'new-task' | 'new-ticket';

export function MessageQuickActions({ channelName }: MessageQuickActionsProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<ActiveView>('tabs');

  // Call request form state
  const [callForm, setCallForm] = useState({
    contact_name: '', contact_phone: '', reason: '', urgency: 'normal',
  });
  const [savingCall, setSavingCall] = useState(false);

  // Pending tasks query
  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['quick-pending-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*')
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Pending outbound calls query
  const { data: pendingCalls = [] } = useQuery({
    queryKey: ['quick-pending-calls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outbound_call_requests')
        .select('*')
        .in('status', ['pending', 'queued'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const completeTask = async (taskId: string) => {
    const { error } = await supabase
      .from('crm_tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) {
      toast.error('Failed to complete task');
    } else {
      toast.success('Task completed');
      queryClient.invalidateQueries({ queryKey: ['quick-pending-tasks'] });
    }
  };

  const claimCall = async (callId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('outbound_call_requests')
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString(), status: 'in_progress' })
      .eq('id', callId);
    if (error) {
      toast.error('Failed to claim call');
    } else {
      toast.success('Call claimed');
      queryClient.invalidateQueries({ queryKey: ['quick-pending-calls'] });
    }
  };

  const submitCallRequest = async () => {
    if (!callForm.contact_name.trim() || !callForm.contact_phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }
    setSavingCall(true);
    const { error } = await supabase.from('outbound_call_requests').insert({
      client_id: user?.id,
      contact_name: callForm.contact_name.trim(),
      contact_phone: callForm.contact_phone.trim(),
      reason: callForm.reason.trim() || null,
      urgency: callForm.urgency,
      source: 'crm',
    });
    setSavingCall(false);
    if (error) {
      toast.error('Failed to submit call request');
    } else {
      toast.success('Call request submitted');
      setCallForm({ contact_name: '', contact_phone: '', reason: '', urgency: 'normal' });
      queryClient.invalidateQueries({ queryKey: ['quick-pending-calls'] });
    }
  };

  if (activeView === 'new-task') {
    return (
      <div className="h-full p-3 overflow-y-auto">
        <InlineTaskForm onBack={() => setActiveView('tabs')} onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['quick-pending-tasks'] });
        }} />
      </div>
    );
  }

  if (activeView === 'new-ticket') {
    return (
      <div className="h-full p-3 overflow-y-auto">
        <InlineTicketForm
          onBack={() => setActiveView('tabs')}
          onSuccess={() => setActiveView('tabs')}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b px-3 py-2">
        <h3 className="font-semibold text-sm">Quick Actions</h3>
      </div>
      <Tabs defaultValue="tasks" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 grid grid-cols-3 h-8">
          <TabsTrigger value="tasks" className="text-xs gap-1">
            <ListTodo className="h-3 w-3" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="calls" className="text-xs gap-1">
            <PhoneOutgoing className="h-3 w-3" /> Calls
          </TabsTrigger>
          <TabsTrigger value="create" className="text-xs gap-1">
            + New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full p-3">
            {pendingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No pending tasks</p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-2.5 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium leading-tight">{task.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => completeTask(task.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={
                        task.priority === 'urgent' ? 'destructive' :
                        task.priority === 'high' ? 'default' : 'secondary'
                      } className="text-[10px] px-1 py-0">
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(task.due_date), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="calls" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full p-3">
            {pendingCalls.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No pending calls</p>
            ) : (
              <div className="space-y-2">
                {pendingCalls.map((call) => (
                  <div key={call.id} className="border rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-medium">{call.contact_name}</span>
                        <p className="text-[10px] text-muted-foreground">{call.contact_phone}</p>
                      </div>
                      {call.urgency === 'urgent' && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                    {call.reason && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{call.reason}</p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs"
                      onClick={() => claimCall(call.id)}
                    >
                      <Phone className="h-3 w-3 mr-1" /> Claim Call
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="create" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full p-3">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-9 text-xs"
                onClick={() => setActiveView('new-task')}
              >
                <CheckSquare className="h-3.5 w-3.5" /> New Task
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-9 text-xs"
                onClick={() => setActiveView('new-ticket')}
              >
                <Ticket className="h-3.5 w-3.5" /> New Ticket
              </Button>

              {/* Inline call request form */}
              <div className="border rounded-lg p-3 space-y-3 mt-3">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <PhoneOutgoing className="h-3.5 w-3.5" /> New Call Request
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Contact name *"
                    className="h-8 text-xs"
                    value={callForm.contact_name}
                    onChange={(e) => setCallForm(prev => ({ ...prev, contact_name: e.target.value }))}
                  />
                  <Input
                    placeholder="Phone number *"
                    className="h-8 text-xs"
                    value={callForm.contact_phone}
                    onChange={(e) => setCallForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                  />
                  <Textarea
                    placeholder="Reason (optional)"
                    className="text-xs min-h-[60px]"
                    rows={2}
                    value={callForm.reason}
                    onChange={(e) => setCallForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                  <RadioGroup
                    value={callForm.urgency}
                    onValueChange={(v) => setCallForm(prev => ({ ...prev, urgency: v }))}
                    className="flex gap-3"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="normal" id="qa-normal" />
                      <Label htmlFor="qa-normal" className="text-xs cursor-pointer">Normal</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="urgent" id="qa-urgent" />
                      <Label htmlFor="qa-urgent" className="text-xs cursor-pointer text-destructive">Urgent</Label>
                    </div>
                  </RadioGroup>
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    disabled={savingCall}
                    onClick={submitCallRequest}
                  >
                    {savingCall ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Submit Call Request
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
