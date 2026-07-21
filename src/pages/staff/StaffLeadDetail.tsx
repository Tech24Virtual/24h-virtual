import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Building, Mail, Phone, Globe, Calendar, Sparkles, ArrowRightCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { StaffLayout } from '@/components/staff/StaffLayout';
import { LeadPipelineStatus } from '@/components/admin/LeadPipelineStatus';
import { OnboardingChecklist } from '@/components/admin/OnboardingChecklist';
import { BillingActions } from '@/components/admin/BillingActions';
import { DynamicBillingPreview } from '@/components/admin/DynamicBillingPreview';
import { LeadIntelligencePanel } from '@/components/admin/LeadIntelligencePanel';
import { LeadConversionDialog } from '@/components/admin/LeadConversionDialog';
import { ActivityTimeline, TaskList, EmailFollowupList } from '@/components/admin/crm';
import { canTransition, type PipelineStage } from '@/lib/revenue/pipeline';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string | null;
  score: number | null;
  notes: string | null;
  created_at: string;
  pipeline_stage: string | null;
  assigned_sales_rep: string | null;
  assigned_onboarding_rep: string | null;
  service_type: string | null;
  plan_minutes: number | null;
  billing_period: string | null;
  billing_currency: string | null;
  country: string | null;
  forwarding_number: string | null;
  onboarding_checklist: Record<string, boolean> | null;
  payment_link_sent_at: string | null;
  subscription_started_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  dynamic_billing_enabled: boolean | null;
  next_follow_up: string | null;
  lead_temperature: string | null;
}

const serviceLabels: Record<string, string> = {
  'ai-receptionist': 'AI Receptionist',
  'message-assistant': 'Message Assistant',
  'virtual-receptionist': 'Virtual Receptionist',
  'virtual-secretary': 'Virtual Secretary',
};

const overageRatesUSD: Record<string, number> = {
  'ai-receptionist': 0.75,
  'message-assistant': 1.75,
  'virtual-receptionist': 2.00,
  'virtual-secretary': 2.50,
};

const temperatureStyles: Record<string, string> = {
  hot: 'bg-green-100 text-green-800',
  warm: 'bg-yellow-100 text-yellow-800',
  cold: 'bg-muted text-muted-foreground',
};

const CONVERTIBLE_STAGES = new Set(['new', 'contacted', 'qualified']);

export default function StaffLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [forwardingNumber, setForwardingNumber] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [showConversion, setShowConversion] = useState(false);

  useEffect(() => {
    if (id) fetchLead();
  }, [id]);

  const fetchLead = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
    if (error) {
      toast({ title: 'Error loading lead', description: error.message, variant: 'destructive' });
      navigate('/staff/sales/pipeline/leads');
      return;
    }
    const parsedLead = {
      ...data,
      onboarding_checklist: typeof data.onboarding_checklist === 'string'
        ? JSON.parse(data.onboarding_checklist)
        : data.onboarding_checklist,
    };
    setLead(parsedLead);
    setForwardingNumber(data.forwarding_number || '');
    setFollowUpDate(data.next_follow_up ? format(new Date(data.next_follow_up), "yyyy-MM-dd'T'HH:mm") : '');
    setIsLoading(false);
  };

  const updateLead = async (updates: Partial<Lead>) => {
    if (!lead) return;
    setIsSaving(true);
    const { error } = await supabase.from('leads').update(updates).eq('id', lead.id);
    if (error) {
      toast({ title: 'Error updating lead', description: error.message, variant: 'destructive' });
    } else {
      setLead({ ...lead, ...updates });
      toast({ title: 'Lead updated', description: 'Changes saved successfully.' });
    }
    setIsSaving(false);
  };

  const handlePipelineChange = (stage: string) => {
    if (!lead) return;
    if (!canTransition(lead.pipeline_stage as PipelineStage, stage as PipelineStage)) {
      toast({
        title: 'Invalid stage transition',
        description: `Cannot move from ${lead.pipeline_stage} to ${stage}`,
        variant: 'destructive',
      });
      return;
    }
    updateLead({ pipeline_stage: stage });
  };

  const handleChecklistChange = (key: string, value: boolean) => {
    if (!lead) return;
    const newChecklist = { ...(lead.onboarding_checklist || {}), [key]: value };
    updateLead({ onboarding_checklist: newChecklist });
  };

  const handleForwardingNumberSave = () => {
    updateLead({
      forwarding_number: forwardingNumber,
      onboarding_checklist: { ...(lead?.onboarding_checklist || {}), forwarding_number_assigned: !!forwardingNumber },
    });
  };

  const handleFollowUpSave = () => {
    updateLead({ next_follow_up: followUpDate ? new Date(followUpDate).toISOString() : null });
  };

  if (isLoading) {
    return (
      <StaffLayout role="sales">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading lead details...</div>
        </div>
      </StaffLayout>
    );
  }

  if (!lead) {
    return (
      <StaffLayout role="sales">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Lead not found</div>
        </div>
      </StaffLayout>
    );
  }

  const parsedNotes = lead.notes ? (() => { try { return JSON.parse(lead.notes); } catch { return null; } })() : null;
  const overageRate = lead.service_type ? overageRatesUSD[lead.service_type] || 0 : 0;

  return (
    <StaffLayout role="sales">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/staff/sales/pipeline/leads')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl lg:text-3xl font-bold text-heading">{lead.name}</h1>
                {lead.lead_temperature && (
                  <Badge className={temperatureStyles[lead.lead_temperature] || ''}>{lead.lead_temperature}</Badge>
                )}
              </div>
              <p className="text-muted-foreground">{lead.company || 'No company'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {CONVERTIBLE_STAGES.has(lead.pipeline_stage || '') && (
              <>
                <Button onClick={() => setShowConversion(true)} variant="default">
                  <ArrowRightCircle className="h-4 w-4 mr-2" />Convert Lead
                </Button>
                <LeadConversionDialog lead={lead} open={showConversion} onOpenChange={setShowConversion} onConverted={fetchLead} />
              </>
            )}
          </div>
        </div>

        {/* Pipeline Status */}
        <LeadPipelineStatus currentStage={lead.pipeline_stage || 'new'} onStageChange={handlePipelineChange} disabled={isSaving} />

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Lead Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" />Lead Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{lead.email}</span></div>
                    {lead.phone && <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{lead.phone}</span></div>}
                    {lead.company && <div className="flex items-center gap-3"><Building className="h-4 w-4 text-muted-foreground" /><span>{lead.company}</span></div>}
                    {lead.country && <div className="flex items-center gap-3"><Globe className="h-4 w-4 text-muted-foreground" /><span>{lead.country === 'CA' ? 'Canada' : 'United States'}</span></div>}
                    <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Created {format(new Date(lead.created_at), 'MMM d, yyyy')}</span></div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Source</span><Badge variant="secondary">{lead.source || 'Unknown'}</Badge></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Score</span><span className="font-medium">{lead.score || 0}</span></div>
                  </div>
                  {/* Follow-up Date */}
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="follow-up" className="text-sm">Next Follow-up</Label>
                    <div className="flex gap-2">
                      <Input id="follow-up" type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                      <Button variant="secondary" size="sm" onClick={handleFollowUpSave} disabled={isSaving}>Set</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Selected Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Plan</CardTitle>
                  <CardDescription>Service preferences from wizard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lead.service_type ? (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Service</span><span className="font-medium">{serviceLabels[lead.service_type] || lead.service_type}</span></div>
                        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Minutes/Month</span><span className="font-medium">{lead.plan_minutes?.toLocaleString() || 'N/A'}</span></div>
                        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Billing Period</span><Badge variant="outline" className="capitalize">{lead.billing_period || 'monthly'}{lead.billing_period === 'annual' && ' (10% off)'}</Badge></div>
                        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Currency</span><Badge variant="secondary">{lead.billing_currency?.toUpperCase() || 'USD'}</Badge></div>
                        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Overage Rate</span><span className="font-medium">${overageRate}/min (USD)</span></div>
                      </div>
                      {parsedNotes && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Preferences</p>
                            {parsedNotes.callHandling && <p className="text-sm text-muted-foreground"><strong>Call Handling:</strong> {parsedNotes.callHandling}</p>}
                            {parsedNotes.businessHours && <p className="text-sm text-muted-foreground"><strong>Business Hours:</strong> {parsedNotes.businessHours}</p>}
                            {parsedNotes.specialInstructions && <p className="text-sm text-muted-foreground"><strong>Special Instructions:</strong> {parsedNotes.specialInstructions}</p>}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">No plan selected yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI Lead Intelligence */}
            <LeadIntelligencePanel lead={lead} />

            {/* Dynamic Billing Preview */}
            <DynamicBillingPreview
              leadId={lead.id}
              serviceType={lead.service_type}
              planMinutes={lead.plan_minutes}
              dynamicBillingEnabled={lead.dynamic_billing_enabled ?? true}
              billingCurrency={lead.billing_currency || 'usd'}
              billingPeriod={lead.billing_period || 'monthly'}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Onboarding Checklist</CardTitle>
                  <CardDescription>Track setup progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <OnboardingChecklist checklist={lead.onboarding_checklist || {}} onChange={handleChecklistChange} disabled={isSaving} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Billing & Setup</CardTitle>
                  <CardDescription>Manage subscription and forwarding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="forwarding-number">Forwarding Number</Label>
                    <div className="flex gap-2">
                      <Input id="forwarding-number" placeholder="+1 (555) 123-4567" value={forwardingNumber} onChange={e => setForwardingNumber(e.target.value)} />
                      <Button variant="secondary" onClick={handleForwardingNumberSave} disabled={isSaving}>Save</Button>
                    </div>
                    {lead.forwarding_number && <p className="text-xs text-muted-foreground">Assigned: {lead.forwarding_number}</p>}
                  </div>
                  <Separator />
                  <BillingActions lead={lead} onUpdate={fetchLead} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ActivityTimeline leadId={lead.id} />
            <TaskList leadId={lead.id} />
            <EmailFollowupList leadId={lead.id} leadEmail={lead.email} />
          </div>
        </div>
      </div>
    </StaffLayout>
  );
}
