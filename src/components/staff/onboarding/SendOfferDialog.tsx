import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SendOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SendOfferDialog({ open, onOpenChange, onSuccess }: SendOfferDialogProps) {
  const { user } = useAuth();
  const [applicantId, setApplicantId] = useState('');
  const [payRate, setPayRate] = useState('');
  const [payType, setPayType] = useState('hourly');
  const [scheduleType, setScheduleType] = useState('full_time');
  const [contractText, setContractText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const { data: templates = [] } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('onboarding_templates')
        .select('id, name, description, steps, is_default')
        .order('is_default', { ascending: false })
        .order('name');
      return (data ?? []) as Array<{ id: string; name: string; description: string | null; steps: any[]; is_default: boolean }>;
    },
  });

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default) ?? templates[0];
      setSelectedTemplateId(defaultTemplate.id);
    }
  }, [templates]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? null;

  // Fetch job applications that don't already have an onboarding record
  const { data: applicants } = useQuery({
    queryKey: ['available-applicants'],
    queryFn: async () => {
      const [appsRes, onboardingRes] = await Promise.all([
        supabase
          .from('job_applications')
          .select('id, name, email, applicant_user_id, job_posting:job_postings(title)')
          .in('status', ['new', 'reviewing', 'accepted'])
          .order('applied_at', { ascending: false }),
        supabase
          .from('agent_onboarding')
          .select('applicant_user_id'),
      ]);
      if (appsRes.error) throw appsRes.error;
      const onboardedIds = new Set(
        (onboardingRes.data ?? []).map((o: any) => o.applicant_user_id)
      );
      return (appsRes.data ?? []).filter(
        (a: any) => !onboardedIds.has(a.applicant_user_id)
      );
    },
    enabled: open,
  });

  const sendOfferMutation = useMutation({
    mutationFn: async () => {
      const app = applicants?.find((a: any) => a.id === applicantId);
      if (!app || !app.applicant_user_id) throw new Error('Select an applicant with a user account');
      if (!payRate) throw new Error('Pay rate is required');

      const { data: existing } = await supabase
        .from('agent_onboarding')
        .select('id')
        .eq('applicant_user_id', app.applicant_user_id)
        .maybeSingle();
      if (existing) throw new Error('This applicant already has an onboarding record.');

      const { data, error } = await supabase
        .from('agent_onboarding')
        .insert({
          applicant_user_id: app.applicant_user_id,
          supervisor_id: user!.id,
          job_application_id: app.id,
          status: 'offer_pending',
          pay_rate: Math.round(parseFloat(payRate) * 100) / 100,
          pay_type: payType,
          schedule_type: scheduleType,
          contract_text: contractText || null,
          onboarding_template_id: selectedTemplateId || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Log the action
      await supabase.from('agent_onboarding_log').insert({
        onboarding_id: data.id,
        action: 'offer_sent',
        performed_by: user!.id,
        details: { pay_rate: parseFloat(payRate), pay_type: payType, schedule_type: scheduleType },
      });

      // Notify the applicant
      await supabase.from('notifications').insert({
        user_id: app.applicant_user_id,
        title: 'You have a new offer!',
        message: `An offer has been sent for your review. Pay: $${Number(payRate).toFixed(2)}/${payType === 'hourly' ? 'hr' : 'min'}`,
        category: 'onboarding',
        action_url: '/hr-portal',
      });

      // Update application status
      await supabase
        .from('job_applications')
        .update({ status: 'accepted' })
        .eq('id', app.id);

      return data;
    },
    onSuccess: () => {
      toast.success('Offer sent successfully');
      setApplicantId('');
      setPayRate('');
      setContractText('');
      setSelectedTemplateId('');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send offer');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Offer to Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Applicant</Label>
            <Select value={applicantId} onValueChange={setApplicantId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an applicant..." />
              </SelectTrigger>
              <SelectContent>
                {(applicants || []).map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {a.email}
                    {a.job_posting?.title && ` (${a.job_posting.title})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pay Rate ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={payRate}
                onChange={(e) => setPayRate(e.target.value)}
                placeholder="e.g. 18.50"
              />
            </div>
            <div className="space-y-2">
              <Label>Pay Type</Label>
              <Select value={payType} onValueChange={setPayType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="per_minute">Per Minute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select value={scheduleType} onValueChange={setScheduleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Onboarding Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="No template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No template</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.is_default ? ' (default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                  {selectedTemplate.description && (
                    <p>{selectedTemplate.description}</p>
                  )}
                  {selectedTemplate.steps?.length > 0 && (
                    <>
                      <p className="font-medium">{selectedTemplate.steps.length} steps:</p>
                      {selectedTemplate.steps.slice(0, 3).map((s: any, i: number) => (
                        <p key={i}>{i + 1}. {s.label} ({s.who})</p>
                      ))}
                      {selectedTemplate.steps.length > 3 && (
                        <p>+{selectedTemplate.steps.length - 3} more</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Contract Text</Label>
            <Textarea
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              placeholder="Enter the contract terms and conditions..."
              rows={6}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => sendOfferMutation.mutate()}
            disabled={!applicantId || !payRate || sendOfferMutation.isPending}
          >
            {sendOfferMutation.isPending ? 'Sending...' : 'Send Offer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
