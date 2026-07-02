import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Clock,
  Phone,
  ClipboardList,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────

const US_CA_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Puerto_Rico', label: 'Puerto Rico (AST)' },
  { value: 'America/Toronto', label: 'Eastern Canada (ET)' },
  { value: 'America/Vancouver', label: 'Pacific Canada (PT)' },
  { value: 'America/Winnipeg', label: 'Central Canada (CT)' },
  { value: 'America/Halifax', label: 'Atlantic Canada (AT)' },
];

const STEPS = [
  { label: 'Business Info', icon: Building2 },
  { label: 'Hours & Location', icon: Clock },
  { label: 'Call Handling', icon: Phone },
  { label: 'Review & Submit', icon: ClipboardList },
];

// ── Types ─────────────────────────────────────────────────────────

interface FormData {
  business_name: string;
  primary_contact_name: string;
  primary_contact_phone: string;
  business_hours: string;
  time_zone: string;
  greeting_preference: string;
  escalation_contact: string;
}

interface HandoffItem {
  id: string;
  item_key: string;
  value_json: { value?: unknown } | null;
  status: string;
}

const EMPTY_FORM: FormData = {
  business_name: '',
  primary_contact_name: '',
  primary_contact_phone: '',
  business_hours: '',
  time_zone: '',
  greeting_preference: '',
  escalation_contact: '',
};

// ── Step validation ───────────────────────────────────────────────

function stepValid(step: number, data: FormData): boolean {
  switch (step) {
    case 1:
      return (
        data.business_name.trim().length > 0 &&
        data.primary_contact_name.trim().length > 0 &&
        data.primary_contact_phone.trim().length > 0
      );
    case 2:
      return data.business_hours.trim().length > 0 && data.time_zone.trim().length > 0;
    case 3:
      return data.escalation_contact.trim().length > 0;
    default:
      return true;
  }
}

// ── Sub-components ────────────────────────────────────────────────

function StepIndicator({ currentStep }: { currentStep: number }) {
  const pct = ((currentStep - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="mb-6" data-testid="step-indicator">
      <Progress value={pct} className="h-1.5 mb-4" />
      <div className="grid grid-cols-4 gap-1">
        {STEPS.map(({ label }, idx) => {
          const num = idx + 1;
          const done = num < currentStep;
          const active = num === currentStep;
          return (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  done && 'bg-primary text-primary-foreground',
                  active && 'bg-primary/15 text-primary border-2 border-primary',
                  !done && !active && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : num}
              </div>
              <span
                className={cn(
                  'text-[11px] text-center leading-tight hidden sm:block',
                  active ? 'text-primary font-medium' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm py-1.5 border-b last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-words">{value || '—'}</span>
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-lg border p-4 space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium mb-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {rows.map((r) => (
        <ReviewRow key={r.label} label={r.label} value={r.value} />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function Setup() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [handoffId, setHandoffId] = useState<string | null>(null);
  const [items, setItems] = useState<HandoffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [noHandoff, setNoHandoff] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        // RLS scopes this to the current client automatically
        const { data: handoff } = await supabase
          .from('client_onboarding_handoffs')
          .select('id, status')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        if (!handoff) {
          setNoHandoff(true);
          return;
        }

        // Already submitted — show success state immediately
        if (!['collecting_info', 'needs_more_info'].includes(handoff.status)) {
          setSubmitted(true);
          return;
        }

        setHandoffId(handoff.id);
        setHandoffStatus(handoff.status);

        const { data: itemRows } = await supabase
          .from('client_handoff_items')
          .select('id, item_key, value_json, status')
          .eq('handoff_id', handoff.id)
          .eq('is_client_fillable', true)
          .order('sort_order', { ascending: true });

        if (!mounted) return;

        const loaded = (itemRows ?? []) as HandoffItem[];
        setItems(loaded);

        // Pre-populate form from any previously saved values
        const pre: FormData = { ...EMPTY_FORM };
        for (const item of loaded) {
          if (item.status === 'provided' && item.value_json?.value != null) {
            const key = item.item_key as keyof FormData;
            if (key in pre) {
              (pre as Record<string, string>)[key] = String(item.value_json.value);
            }
          }
        }
        setFormData(pre);
      } catch (err) {
        console.error('Error loading setup data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const update = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (validationError) setValidationError(null);
  };

  const handleNext = () => {
    if (!stepValid(step, formData)) {
      setValidationError('Please fill in all required fields before continuing.');
      return;
    }
    setValidationError(null);
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    setValidationError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (!handoffId) return;
    setSubmitting(true);
    try {
      // Update all client-fillable items in parallel
      await Promise.all(
        items.map((item) => {
          const raw = (formData as Record<string, string>)[item.item_key] ?? '';
          const hasValue = raw.trim().length > 0;
          return supabase
            .from('client_handoff_items')
            .update({
              status: hasValue ? 'provided' : 'pending',
              value_json: hasValue ? { value: raw } : null,
            } as never)
            .eq('id', item.id);
        }),
      );

      // Flip handoff status + log activity via SECURITY DEFINER RPC
      const { error } = await (supabase as any).rpc('submit_client_setup');
      if (error) throw error;

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit setup';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout title="Account Setup" description="Configure your service details">
        <Card>
          <CardContent className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (noHandoff) {
    return (
      <DashboardLayout title="Account Setup" description="Configure your service details">
        <Card data-testid="setup-no-handoff">
          <CardContent className="py-16 text-center space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">Your account setup isn't ready yet</p>
            <p className="text-sm text-muted-foreground">
              Your account needs to be activated before you can complete setup. Contact support if
              you believe this is an error.
            </p>
            <Button variant="outline" asChild>
              <Link to="/client-dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (submitted) {
    return (
      <DashboardLayout title="Account Setup" description="Configure your service details">
        <Card data-testid="setup-success">
          <CardContent className="py-16 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Setup Complete!</h2>
              <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                Your setup is complete — our team will be in touch shortly to finalize your
                configuration and get your service live.
              </p>
            </div>
            <Button asChild className="mt-2">
              <Link to="/client-dashboard">
                Return to Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────

  const isLastStep = step === STEPS.length;

  return (
    <DashboardLayout>
      <div className="rounded-2xl border border-border p-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mb-6">
        <h1 className="text-2xl font-bold text-heading">Account Setup</h1>
        <p className="text-muted-foreground mt-0.5">Tell us about your business so we can configure your service</p>
      </div>
      <div className="max-w-2xl mx-auto">
        {handoffStatus === 'needs_more_info' && (
          <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <strong>Your account team has requested additional information.</strong>{' '}
            Please review and update your details below.
          </div>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {(() => {
                const Icon = STEPS[step - 1].icon;
                return <Icon className="h-4 w-4 text-primary" />;
              })()}
              {STEPS[step - 1].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StepIndicator currentStep={step} />

            {/* Step content */}
            <div data-testid={`setup-step-${step}`}>
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">
                      Business Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="business_name"
                      data-testid="field-business_name"
                      value={formData.business_name}
                      onChange={(e) => update('business_name', e.target.value)}
                      placeholder="Acme Legal Services"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_name">
                      Primary Contact Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="primary_contact_name"
                      data-testid="field-primary_contact_name"
                      value={formData.primary_contact_name}
                      onChange={(e) => update('primary_contact_name', e.target.value)}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primary_contact_phone">
                      Primary Contact Phone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="primary_contact_phone"
                      data-testid="field-primary_contact_phone"
                      type="tel"
                      value={formData.primary_contact_phone}
                      onChange={(e) => update('primary_contact_phone', e.target.value)}
                      placeholder="555-0100"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business_hours">
                      Business Hours <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="business_hours"
                      data-testid="field-business_hours"
                      value={formData.business_hours}
                      onChange={(e) => update('business_hours', e.target.value)}
                      placeholder={'Mon–Fri: 9am–5pm\nSat: 10am–2pm\nSun: Closed'}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      List your hours by day. Your receptionist will follow this schedule.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_zone">
                      Time Zone <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.time_zone}
                      onValueChange={(v) => update('time_zone', v)}
                    >
                      <SelectTrigger id="time_zone" data-testid="field-time_zone">
                        <SelectValue placeholder="Select your time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_CA_TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="greeting_preference">
                      Preferred Greeting / Script Notes{' '}
                      <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Textarea
                      id="greeting_preference"
                      data-testid="field-greeting_preference"
                      value={formData.greeting_preference}
                      onChange={(e) => update('greeting_preference', e.target.value)}
                      placeholder={
                        '"Thank you for calling Acme Legal, how can I help you today?" — we prefer a warm, professional tone.'
                      }
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe how you'd like calls answered, including your preferred greeting
                      phrase.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="escalation_contact">
                      Escalation Contact <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="escalation_contact"
                      data-testid="field-escalation_contact"
                      value={formData.escalation_contact}
                      onChange={(e) => update('escalation_contact', e.target.value)}
                      placeholder="Jane Smith: 555-0199"
                    />
                    <p className="text-xs text-muted-foreground">
                      Name and phone number for urgent matters that need immediate attention.
                    </p>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4" data-testid="setup-review">
                  <p className="text-sm text-muted-foreground">
                    Review your details below. You can go back to edit anything before submitting.
                  </p>
                  <ReviewSection
                    title="Business Info"
                    icon={Building2}
                    rows={[
                      { label: 'Business Name', value: formData.business_name },
                      { label: 'Primary Contact', value: formData.primary_contact_name },
                      { label: 'Contact Phone', value: formData.primary_contact_phone },
                    ]}
                  />
                  <ReviewSection
                    title="Hours & Location"
                    icon={Clock}
                    rows={[
                      { label: 'Business Hours', value: formData.business_hours },
                      {
                        label: 'Time Zone',
                        value:
                          US_CA_TIMEZONES.find((t) => t.value === formData.time_zone)?.label ??
                          formData.time_zone,
                      },
                    ]}
                  />
                  <ReviewSection
                    title="Call Handling"
                    icon={Phone}
                    rows={[
                      {
                        label: 'Greeting Preference',
                        value: formData.greeting_preference || '(not specified)',
                      },
                      { label: 'Escalation Contact', value: formData.escalation_contact },
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Validation error */}
            {validationError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {validationError}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>

              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  data-testid="submit-setup"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      Submit Setup <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext} data-testid={`next-step-${step}`}>
                  Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
