import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Building, Mail, Phone, Globe, Calendar, Copy, ExternalLink, UserCheck, Flame, Thermometer, Snowflake, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { LeadPipelineStatus } from '@/components/admin/LeadPipelineStatus';
import { OnboardingChecklist } from '@/components/admin/OnboardingChecklist';
import { BillingActions } from '@/components/admin/BillingActions';
import { DynamicBillingPreview } from '@/components/admin/DynamicBillingPreview';
import { ActivityTimeline, TaskList, EmailFollowupList } from '@/components/admin/crm';
import { LeadIntelligencePanel } from '@/components/admin/LeadIntelligencePanel';
import { LeadConversionDialog } from '@/components/admin/LeadConversionDialog';
import { applyClientActivationEffects } from '@/lib/client-onboarding/applyClientActivationEffects';
import { calculateLeadScore, getScoreLabel, getScoreBadgeClasses, type ScoringRules, DEFAULT_SCORING_RULES } from '@/lib/leadScoring';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Lead {
  id: string;
  name: string;
  account_code: string | null;
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
  user_id: string | null;
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

export default function AdminLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [forwardingNumber, setForwardingNumber] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const [showConversion, setShowConversion] = useState(false);
  const [scoringRules, setScoringRules] = useState<ScoringRules>(DEFAULT_SCORING_RULES);

  useEffect(() => {
    if (id) {
      fetchLead();
      fetchScoringRules();
    }
  }, [id]);

  const fetchScoringRules = async () => {
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'lead_scoring_rules')
      .single();
    if (data?.value) setScoringRules(data.value as unknown as ScoringRules);
  };

  const fetchLead = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: 'Error loading lead',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/admin/leads');
      return;
    }

    // Parse onboarding_checklist if it's a string
    const parsedLead = {
      ...data,
      onboarding_checklist: typeof data.onboarding_checklist === 'string' 
        ? JSON.parse(data.onboarding_checklist) 
        : data.onboarding_checklist,
    };

    setLead(parsedLead);
    setForwardingNumber(data.forwarding_number || '');
    setAccountCode(data.account_code || '');
    setIsLoading(false);
  };

  const updateLead = async (updates: Partial<Lead>) => {
    if (!lead) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', lead.id);

    if (error) {
      toast({
        title: 'Error updating lead',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setLead({ ...lead, ...updates });
      toast({
        title: 'Lead updated',
        description: 'Changes saved successfully.',
      });
    }
    setIsSaving(false);
  };

  const handlePipelineChange = async (stage: string) => {
    await updateLead({ pipeline_stage: stage });
    if (stage === 'active' && lead) {
      try {
        const result = await applyClientActivationEffects({
          leadId: lead.id,
          leadUserId: lead.user_id ?? null,
          leadSnapshot: { converted_via: 'admin_pipeline_status' },
        });
        if (!result.alreadyExisted) {
          toast({
            title: 'Client account activated',
            description: 'Onboarding handoff created.',
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        toast({
          title: 'Activation warning',
          description: `Stage updated but handoff creation failed: ${msg}`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleChecklistChange = (key: string, value: boolean) => {
    if (!lead) return;
    const newChecklist = {
      ...(lead.onboarding_checklist || {}),
      [key]: value,
    };
    updateLead({ onboarding_checklist: newChecklist });
  };

  const handleForwardingNumberSave = () => {
    updateLead({ 
      forwarding_number: forwardingNumber,
      onboarding_checklist: {
        ...(lead?.onboarding_checklist || {}),
        forwarding_number_assigned: !!forwardingNumber,
      },
    });
  };

  // Format currency based on billing_currency
  const formatCurrency = (amount: number) => {
    const currency = lead?.billing_currency || 'usd';
    const symbol = currency === 'cad' ? 'C$' : '$';
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading lead details...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Lead not found</div>
      </div>
    );
  }

  const parsedNotes = lead.notes ? (() => {
    try {
      return JSON.parse(lead.notes);
    } catch {
      return null;
    }
  })() : null;

  const overageRate = lead.service_type ? overageRatesUSD[lead.service_type] || 0 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/leads')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-heading">{lead.name}</h1>
              {(() => {
                const score = calculateLeadScore(lead, scoringRules);
                const label = getScoreLabel(score, scoringRules.labels);
                return (
                  <Badge variant="secondary" className={getScoreBadgeClasses(label)}>
                    {label === 'hot' ? <Flame className="w-3 h-3 mr-1" /> : label === 'warm' ? <Thermometer className="w-3 h-3 mr-1" /> : <Snowflake className="w-3 h-3 mr-1" />}
                    {score} · {label.charAt(0).toUpperCase() + label.slice(1)}
                  </Badge>
                );
              })()}
            </div>
            <p className="text-muted-foreground">{lead.company || 'No company'}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild data-testid="view-call-report-btn">
            <Link to={`/admin/clients/${lead.id}/call-report`}>
              <BarChart2 className="w-4 h-4 mr-2" />
              View Call Report
            </Link>
          </Button>
          {lead.pipeline_stage !== 'active' && lead.pipeline_stage !== 'ready_for_billing' && (
            <Button onClick={() => setShowConversion(true)}>
              <UserCheck className="w-4 h-4 mr-2" />
              Convert to Client
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Status */}
      <LeadPipelineStatus 
        currentStage={lead.pipeline_stage || 'new'} 
        onStageChange={handlePipelineChange}
        disabled={isSaving}
      />

      {/* Main Content - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Lead Info & Billing */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Lead Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Lead Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.email}</span>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-3">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.company}</span>
                    </div>
                  )}
                  {lead.country && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.country === 'CA' ? 'Canada' : 'United States'}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Created {format(new Date(lead.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Source</span>
                    <Badge variant="secondary">{lead.source || 'Unknown'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Score</span>
                    <span className="font-medium">{lead.score || 0}</span>
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
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Service</span>
                        <span className="font-medium">{serviceLabels[lead.service_type] || lead.service_type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Minutes/Month</span>
                        <span className="font-medium">{lead.plan_minutes?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Billing Period</span>
                        <Badge variant="outline" className="capitalize">
                          {lead.billing_period || 'monthly'}
                          {lead.billing_period === 'annual' && ' (10% off)'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Currency</span>
                        <Badge variant="secondary">
                          {lead.billing_currency?.toUpperCase() || 'USD'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Overage Rate</span>
                        <span className="font-medium">{formatCurrency(overageRate)}/min</span>
                      </div>
                    </div>

                    {parsedNotes && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Preferences</p>
                          {parsedNotes.callHandling && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Call Handling:</strong> {parsedNotes.callHandling}
                            </p>
                          )}
                          {parsedNotes.businessHours && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Business Hours:</strong> {parsedNotes.businessHours}
                            </p>
                          )}
                          {parsedNotes.specialInstructions && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Special Instructions:</strong> {parsedNotes.specialInstructions}
                            </p>
                          )}
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
            {/* Onboarding Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Onboarding Checklist</CardTitle>
                <CardDescription>Track setup progress</CardDescription>
              </CardHeader>
              <CardContent>
                <OnboardingChecklist 
                  checklist={lead.onboarding_checklist || {}}
                  onChange={handleChecklistChange}
                  disabled={isSaving}
                />
              </CardContent>
            </Card>

            {/* Billing & Forwarding */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Billing & Setup</CardTitle>
                <CardDescription>Manage subscription and forwarding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Reach59 Account Code */}
                <div className="space-y-2">
                  <Label htmlFor="account-code">Reach59 Account Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="account-code"
                      placeholder="e.g. SMITH_LAW"
                      value={accountCode}
                      onChange={(e) => setAccountCode(e.target.value.toUpperCase())}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => updateLead({ account_code: accountCode.trim() || null })}
                      disabled={isSaving}
                    >
                      Save
                    </Button>
                  </div>
                  {lead.account_code && (
                    <p className="text-xs text-muted-foreground">
                      Linked: {lead.account_code}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Forwarding Number */}
                <div className="space-y-2">
                  <Label htmlFor="forwarding-number">Forwarding Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="forwarding-number"
                      placeholder="+1 (555) 123-4567"
                      value={forwardingNumber}
                      onChange={(e) => setForwardingNumber(e.target.value)}
                    />
                    <Button 
                      variant="secondary" 
                      onClick={handleForwardingNumberSave}
                      disabled={isSaving}
                    >
                      Save
                    </Button>
                  </div>
                  {lead.forwarding_number && (
                    <p className="text-xs text-muted-foreground">
                      Assigned: {lead.forwarding_number}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Billing Actions */}
                <BillingActions
                  lead={lead}
                  onUpdate={fetchLead}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - AI Intelligence, CRM: Activity & Tasks */}
        <div className="space-y-6">
          <LeadIntelligencePanel lead={lead} />
          <ActivityTimeline leadId={lead.id} />
          <TaskList leadId={lead.id} />
          <EmailFollowupList leadId={lead.id} leadEmail={lead.email} />
        </div>
      </div>

      {/* Conversion Dialog */}
      <LeadConversionDialog
        lead={lead}
        open={showConversion}
        onOpenChange={setShowConversion}
        onConverted={fetchLead}
      />
    </div>
  );
}
