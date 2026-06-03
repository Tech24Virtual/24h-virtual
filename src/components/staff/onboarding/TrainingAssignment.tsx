import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BookOpen, Plus, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TrainingItem {
  key: string;
  label: string;
  completed: boolean;
}

interface TrainingAssignmentProps {
  onboarding: any;
  onRefresh: () => void;
  canCheck?: boolean;
}

export function TrainingAssignment({ onboarding, onRefresh, canCheck = false }: TrainingAssignmentProps) {
  const { user } = useAuth();
  const [newItem, setNewItem] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const checklist: TrainingItem[] = onboarding.training_checklist || [];

  const completedCount = checklist.filter(i => i.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  const { data: templates } = useQuery({
    queryKey: ['training-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateChecklist = useMutation({
    mutationFn: async (newChecklist: TrainingItem[]) => {
      const allComplete = newChecklist.length > 0 && newChecklist.every(i => i.completed);
      const updates: Record<string, any> = {
        training_checklist: newChecklist,
      };
      if (allComplete && !onboarding.training_completed_at) {
        updates.training_completed_at = new Date().toISOString();
        updates.status = 'live_training';
      }

      const { error } = await supabase
        .from('agent_onboarding')
        .update(updates)
        .eq('id', onboarding.id);
      if (error) throw error;

      if (allComplete && !onboarding.training_completed_at) {
        await supabase.from('agent_onboarding_log').insert({
          onboarding_id: onboarding.id,
          action: 'training_completed',
          performed_by: user!.id,
        });

        // Notify supervisor
        await supabase.from('notifications').insert({
          user_id: onboarding.supervisor_id,
          title: 'Agent Training Complete',
          message: `${onboarding.profiles?.full_name || 'An agent'} has completed all self-training items. Schedule live training.`,
          category: 'onboarding',
          action_url: '/staff/supervisor/agent-onboarding',
        });
      }
    },
    onSuccess: () => {
      onRefresh();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    const updated = [...checklist, { key: crypto.randomUUID(), label: newItem.trim(), completed: false }];
    updateChecklist.mutate(updated);
    setNewItem('');
  };

  const handleRemoveItem = (key: string) => {
    updateChecklist.mutate(checklist.filter(i => i.key !== key));
  };

  const handleApplyTemplate = () => {
    const template = templates?.find((t: any) => t.id === selectedTemplate);
    if (!template) return;
    const items = (template.items as any[]).map((item: any) => ({
      key: crypto.randomUUID(),
      label: item.label,
      completed: false,
    }));
    updateChecklist.mutate([...checklist, ...items]);
    setSelectedTemplate('');
    toast.success(`Applied template: ${template.name}`);

    supabase.from('agent_onboarding_log').insert({
      onboarding_id: onboarding.id,
      action: 'training_assigned',
      performed_by: user!.id,
      details: { template_name: template.name, items_count: items.length },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Training Checklist
          </CardTitle>
          <Badge variant={progress === 100 ? 'default' : 'secondary'}>
            {completedCount}/{checklist.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist.length > 0 && (
          <Progress value={progress} className="h-2" />
        )}

        {/* Template picker */}
        {(templates || []).length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Apply a template..." />
              </SelectTrigger>
              <SelectContent>
                {(templates || []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleApplyTemplate} disabled={!selectedTemplate}>
              Apply
            </Button>
          </div>
        )}

        {/* Checklist items */}
        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.key} className="flex items-center gap-3 group">
              <Checkbox
                checked={item.completed}
                disabled={!canCheck || updateChecklist.isPending}
                onCheckedChange={canCheck ? (checked) => {
                  const updated = checklist.map(i =>
                    i.key === item.key ? { ...i, completed: !!checked } : i
                  );
                  updateChecklist.mutate(updated);
                } : undefined}
              />
              <span className={item.completed ? 'line-through text-muted-foreground flex-1' : 'flex-1'}>
                {item.label}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                onClick={() => handleRemoveItem(item.key)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add new item */}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add training item..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          />
          <Button variant="outline" size="sm" onClick={handleAddItem}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {onboarding.status === 'provisioning' && checklist.length > 0 && (
          <Button
            className="w-full"
            onClick={() => {
              supabase
                .from('agent_onboarding')
                .update({ status: 'training' })
                .eq('id', onboarding.id)
                .then(() => {
                  supabase.from('agent_onboarding_log').insert({
                    onboarding_id: onboarding.id,
                    action: 'training_assigned',
                    performed_by: user!.id,
                  });
                  supabase.from('notifications').insert({
                    user_id: onboarding.applicant_user_id,
                    title: 'Training Assigned',
                    message: 'Your training checklist has been assigned. Complete all items to proceed.',
                    category: 'onboarding',
                    action_url: '/hr-portal',
                  });
                  onRefresh();
                  toast.success('Training assigned');
                });
            }}
          >
            Assign Training & Notify Agent
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
