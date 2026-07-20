import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Loader2, ArrowLeft, ArrowRight, CheckCircle2, Building2, MapPin, ListChecks,
  Sparkles, AlertCircle, CreditCard, Percent, Tag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { applyClientActivationEffects } from '@/lib/client-onboarding/applyClientActivationEffects';
import { DIRECT_CLIENT_DEFAULT_TEMPLATE } from '@/lib/client-onboarding/directClientTemplate';
import { track } from '@/lib/analytics';

type BillingPlan = Tables<'billing_plans'>;
type Promotion = Tables<'promotions'>;

const OVERAGE_PRESETS = ['0.05', '0.07', '0.10', '0.12'] as const;

/**
 * IANA tz validator. Uses Intl.supportedValuesOf when available (modern
 * browsers), then falls back to a structural regex + DateTimeFormat probe.
 */
function isValidTimezone(tz: string): boolean {
  const trimmed = tz.trim();
  if (!trimmed) return false;
  if (!/^[A-Za-z]+(?:[_/][A-Za-z0-9+\-_]+)+$/.test(trimmed) && trimmed !== 'UTC') {
    return false;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intlAny = Intl as any;
    if (typeof intlAny.supportedValuesOf === 'function') {
      const all: string[] = intlAny.supportedValuesOf('timeZone');
      return all.includes(trimmed);
    }
    // Fallback: probe via DateTimeFormat. Throws RangeError on invalid tz.
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const accountSchema = z.object({
  accountName: z
    .string()
    .trim()
    .min(2, { message: 'Account name must be at least 2 characters.' })
    .max(120, { message: 'Account name must be 120 characters or fewer.' }),
});

const locationSchema = z.object({
  locationName: z
    .string()
    .trim()
    .min(2, { message: 'Location name must be at least 2 characters.' })
    .max(80, { message: 'Location name must be 80 characters or fewer.' }),
  locationCity: z
    .string()
    .trim()
    .max(80, { message: 'City must be 80 characters or fewer.' })
    .optional()
    .or(z.literal('')),
  locationTimezone: z
    .string()
    .trim()
    .max(64, { message: 'Time zone must be 64 characters or fewer.' })
    .refine((v) => v === '' || isValidTimezone(v), {
      message: 'Use a valid IANA time zone, e.g. America/New_York or UTC.',
    })
    .optional()
    .or(z.literal('')),
});

type FieldErrors = Partial<
  Record<'accountName' | 'locationName' | 'locationCity' | 'locationTimezone', string>
>;

export interface ConvertLeadInput {
  id: string;
  name: string;
  email: string | null;
  company?: string | null;
  partner_id?: string | null;
  user_id?: string | null;
}

interface Props {
  lead: ConvertLeadInput | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback after successful conversion. */
  onConverted?: (leadId: string) => void;
}

type TenantKind = 'direct_24h' | 'wl_partner';

/**
 * 3-step in-place wizard: confirm account, default location, starter template.
 * Wraps the existing applyClientActivationEffects helper as the single commit step.
 * No schema changes.
 */
export function ConvertLeadToAccountDialog({ lead, open, onOpenChange, onConverted }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [tenantKind, setTenantKind] = useState<TenantKind>('direct_24h');
  const [locationName, setLocationName] = useState('Main Location');
  const [locationCity, setLocationCity] = useState('');
  const [locationTimezone, setLocationTimezone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [overageOption, setOverageOption] = useState<string>('plan_default');
  const [customOverage, setCustomOverage] = useState('');
  const [selectedPromos, setSelectedPromos] = useState<string[]>([]);

  // Reset state every time we open with a new lead
  useMemo(() => {
    if (open && lead) {
      setStep(1);
      setBusy(false);
      setAccountName(lead.company || lead.name || '');
      setTenantKind(lead.partner_id ? 'wl_partner' : 'direct_24h');
      setLocationName('Main Location');
      setLocationCity('');
      setLocationTimezone('');
      setErrors({});
      setSelectedPlanId(null);
      setOverageOption('plan_default');
      setCustomOverage('');
      setSelectedPromos([]);
    }
  }, [open, lead]);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['billing-plans-active'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('service_type', { ascending: true, nullsFirst: true })
        .order('fixed_amount', { ascending: true });
      if (error) throw error;
      return data as BillingPlan[];
    },
  });

  const { data: promotions = [], isLoading: promosLoading } = useQuery({
    queryKey: ['active-promotions'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Promotion[];
    },
  });

  const plansByService = useMemo(() => {
    return plans.reduce((acc, plan) => {
      const key = plan.service_type || 'general';
      if (!acc[key]) acc[key] = [];
      acc[key].push(plan);
      return acc;
    }, {} as Record<string, BillingPlan[]>);
  }, [plans]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const opsItems = DIRECT_CLIENT_DEFAULT_TEMPLATE.filter((t) => !t.is_client_fillable);
  const clientItems = DIRECT_CLIENT_DEFAULT_TEMPLATE.filter((t) => t.is_client_fillable);

  function validateStep1(): boolean {
    const result = accountSchema.safeParse({ accountName });
    if (result.success) {
      setErrors((e) => ({ ...e, accountName: undefined }));
      return true;
    }
    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FieldErrors;
      if (key) fieldErrors[key] = issue.message;
    }
    setErrors((e) => ({ ...e, ...fieldErrors }));
    return false;
  }

  function validateStep2(): boolean {
    const result = locationSchema.safeParse({
      locationName,
      locationCity,
      locationTimezone,
    });
    if (result.success) {
      setErrors((e) => ({
        ...e,
        locationName: undefined,
        locationCity: undefined,
        locationTimezone: undefined,
      }));
      return true;
    }
    const fieldErrors: FieldErrors = {
      locationName: undefined,
      locationCity: undefined,
      locationTimezone: undefined,
    };
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FieldErrors;
      if (key) fieldErrors[key] = issue.message;
    }
    setErrors((e) => ({ ...e, ...fieldErrors }));
    return false;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    if (!lead) return;
    // Final guard: re-validate everything before commit.
    const ok1 = validateStep1();
    const ok2 = validateStep2();
    if (!ok1 || !ok2) {
      const firstBadStep = !ok1 ? 1 : 2;
      setStep(firstBadStep);
      toast({
        title: 'Fix the highlighted fields',
        description: 'Some inputs need attention before activating the account.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const effectiveOverageRate =
        overageOption === 'plan_default'
          ? null
          : overageOption === 'custom'
            ? (customOverage.trim() && !Number.isNaN(parseFloat(customOverage))
                ? parseFloat(customOverage)
                : null)
            : parseFloat(overageOption);
      const selectedPromoRecords = promotions.filter((p) => selectedPromos.includes(p.id));

      const result = await applyClientActivationEffects({
        leadId: lead.id,
        leadUserId: lead.user_id ?? null,
        leadSnapshot: {
          account_name: accountName.trim(),
          tenant_kind: tenantKind,
          default_location: {
            name: locationName.trim(),
            city: locationCity.trim() || null,
            time_zone: locationTimezone.trim() || null,
          },
          plan_id: selectedPlanId,
          plan_name: selectedPlan?.name ?? null,
          overage_rate: effectiveOverageRate,
          promotion_ids: selectedPromos,
          promotion_names: selectedPromoRecords.map((p) => p.name),
          converted_via: 'admin_convert_dialog',
        },
      });

      // Flip pipeline stage to active (the single activation moment) and
      // persist the chosen plan / overage override in the same round trip.
      const { error: stageErr } = await supabase
        .from('leads')
        .update({
          pipeline_stage: 'active',
          ...(selectedPlanId ? { current_plan_id: selectedPlanId } : {}),
          overage_rate_override: effectiveOverageRate,
        })
        .eq('id', lead.id);
      if (stageErr) {
        // Non-fatal: handoff still seeded. Surface as warning toast below.
        console.warn('lead stage update failed', stageErr);
      }

      // Record applied promotions and bump their usage counters.
      if (selectedPromos.length > 0) {
        const { error: promoErr } = await supabase.from('lead_promotions').insert(
          selectedPromos.map((promoId) => ({
            lead_id: lead.id,
            promotion_id: promoId,
            applied_by: user?.id ?? null,
          })),
        );
        if (promoErr) {
          console.warn('lead_promotions insert failed', promoErr);
        } else {
          const { error: rpcErr } = await supabase.rpc('increment_promo_usage', {
            promo_ids: selectedPromos,
          });
          if (rpcErr) console.warn('increment_promo_usage failed', rpcErr);
        }
      }

      // Notify the billing and supervisor (onboarding) teams — best-effort,
      // must not block or fail the activation itself.
      try {
        const { data: teamUsers } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['billing', 'supervisor']);
        if (teamUsers?.length) {
          const promoSummary = selectedPromoRecords.length
            ? selectedPromoRecords.map((p) => p.name).join(', ')
            : 'None';
          const { error: notifErr } = await supabase.from('notifications').insert(
            teamUsers.map((u) => ({
              user_id: u.user_id,
              title: 'New Client Converted',
              message: `${accountName.trim()} has been converted. Plan: ${selectedPlan?.name ?? 'Not set'}. Promos: ${promoSummary}`,
              category: 'billing',
              action_url: `/admin/leads/${lead.id}`,
            })),
          );
          if (notifErr) console.warn('conversion notification failed', notifErr);
        }
      } catch (notifyErr) {
        console.warn('conversion notification failed', notifyErr);
      }

      // Analytics: measurable conversion event.
      track.cta('admin_crm', 'convert_lead_to_account', 'admin', {
        lead_id: lead.id,
        tenant_kind: tenantKind,
        already_existed: result.alreadyExisted,
        plan_id: selectedPlanId,
        promotion_count: selectedPromos.length,
      });

      // Make the new active account appear immediately.
      queryClient.invalidateQueries({ queryKey: ['campaign-os', 'clients-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });

      toast({
        title: result.alreadyExisted ? 'Account already active' : 'Account is live',
        description: result.alreadyExisted
          ? `${accountName} was already converted. Opening Active Accounts.`
          : `${accountName} has been activated and seeded with the starter template.`,
      });

      onOpenChange(false);
      onConverted?.(lead.id);
      // Direct accounts use the lead id as the client id in the detail route.
      // For WL-partner conversions the active wl_client record may not exist
      // yet, so fall back to the Active Accounts list.
      if (tenantKind === 'direct_24h') {
        navigate(`/admin/campaign-os/clients/${lead.id}?kind=direct_24h`);
      } else {
        navigate('/admin/campaign-os/clients');
      }
    } catch (err: any) {
      toast({
        title: 'Conversion failed',
        description: err?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Convert to Active Account
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4, converting{' '}
            <span className="font-medium text-foreground">{lead.name}</span> into a live active account.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pt-1 pb-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" /> Account name
              </Label>
              <Input
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value);
                  if (errors.accountName) setErrors((er) => ({ ...er, accountName: undefined }));
                }}
                onBlur={() => validateStep1()}
                placeholder="Acme Roofing Inc."
                aria-invalid={!!errors.accountName}
                aria-describedby={errors.accountName ? 'account-name-error' : undefined}
                maxLength={120}
                className={cn(errors.accountName && 'border-destructive focus-visible:ring-destructive')}
                autoFocus
              />
              {errors.accountName ? (
                <p id="account-name-error" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.accountName}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The business name shown across admin and client surfaces.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tenant kind</Label>
              <Select value={tenantKind} onValueChange={(v) => setTenantKind(v as TenantKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct_24h">Direct (24H Virtual)</SelectItem>
                  <SelectItem value="wl_partner" disabled={!lead.partner_id}>
                    White Label Partner
                    {!lead.partner_id && ' (lead not linked to a partner)'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" /> Default location name
              </Label>
              <Input
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  if (errors.locationName) setErrors((er) => ({ ...er, locationName: undefined }));
                }}
                onBlur={() => validateStep2()}
                placeholder="Main Location"
                aria-invalid={!!errors.locationName}
                aria-describedby={errors.locationName ? 'location-name-error' : undefined}
                maxLength={80}
                className={cn(errors.locationName && 'border-destructive focus-visible:ring-destructive')}
                autoFocus
              />
              {errors.locationName && (
                <p id="location-name-error" className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.locationName}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input
                  value={locationCity}
                  onChange={(e) => {
                    setLocationCity(e.target.value);
                    if (errors.locationCity) setErrors((er) => ({ ...er, locationCity: undefined }));
                  }}
                  onBlur={() => validateStep2()}
                  placeholder="Optional"
                  aria-invalid={!!errors.locationCity}
                  maxLength={80}
                  className={cn(errors.locationCity && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.locationCity && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.locationCity}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Time zone</Label>
                <Input
                  value={locationTimezone}
                  onChange={(e) => {
                    setLocationTimezone(e.target.value);
                    if (errors.locationTimezone) setErrors((er) => ({ ...er, locationTimezone: undefined }));
                  }}
                  onBlur={() => validateStep2()}
                  placeholder="e.g. America/New_York"
                  aria-invalid={!!errors.locationTimezone}
                  maxLength={64}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  className={cn(errors.locationTimezone && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.locationTimezone && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.locationTimezone}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Optional. IANA time zone names like America/New_York, Europe/London, or UTC.
              Captured on the activation snapshot. You can add more locations afterward from the
              Active Accounts workspace.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 py-2">
            {/* ── Plan selection ─────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" /> Plan
              </Label>
              {plansLoading ? (
                <p className="text-xs text-muted-foreground">Loading plans…</p>
              ) : plans.length === 0 ? (
                <p className="text-xs text-muted-foreground rounded-lg border bg-muted/30 p-3">
                  No billing plans configured yet. You can convert without one and assign a plan
                  later from Admin → Billing.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(plansByService).map(([serviceType, servicePlans]) => (
                    <div key={serviceType}>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        {serviceType.replace(/_/g, ' ')}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {servicePlans.map((plan) => (
                          <div
                            key={plan.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedPlanId((cur) => (cur === plan.id ? null : plan.id))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedPlanId((cur) => (cur === plan.id ? null : plan.id));
                              }
                            }}
                            className={cn(
                              'p-3 rounded-lg border cursor-pointer transition-colors',
                              selectedPlanId === plan.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50',
                            )}
                          >
                            <p className="font-medium text-sm">{plan.name}</p>
                            <p className="text-lg font-bold">
                              {plan.fixed_amount != null ? `$${plan.fixed_amount}/mo` : '—'}
                            </p>
                            {plan.included_minutes != null && (
                              <p className="text-xs text-muted-foreground">
                                {plan.included_minutes} min included
                              </p>
                            )}
                            {plan.minute_rate != null && plan.minute_rate > 0 && (
                              <p className="text-xs text-muted-foreground">${plan.minute_rate}/min</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Overage rate ────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" /> Overage rate (per minute, above included minutes)
              </Label>
              <div className="flex gap-2 items-center">
                <Select value={overageOption} onValueChange={setOverageOption}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan_default">Use plan default</SelectItem>
                    {OVERAGE_PRESETS.map((rate) => (
                      <SelectItem key={rate} value={rate}>${rate}/min</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom rate...</SelectItem>
                  </SelectContent>
                </Select>
                {overageOption === 'custom' && (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={customOverage}
                    onChange={(e) => setCustomOverage(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>
            </div>

            {/* ── Promotions ──────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" /> Apply promotions
              </Label>
              {promosLoading ? (
                <p className="text-xs text-muted-foreground">Loading promotions…</p>
              ) : promotions.length === 0 ? (
                <p className="text-xs text-muted-foreground rounded-lg border bg-muted/30 p-3">
                  No active promotions.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {promotions.map((promo) => (
                    <label key={promo.id} className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedPromos.includes(promo.id)}
                        onCheckedChange={(checked) => {
                          setSelectedPromos((prev) =>
                            checked ? [...prev, promo.id] : prev.filter((id) => id !== promo.id),
                          );
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium">{promo.name}</p>
                        {promo.notes && (
                          <p className="text-xs text-muted-foreground">{promo.notes}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Plan &amp; pricing
              </p>
              <p className="text-sm">
                Plan: <span className="font-medium">{selectedPlan?.name ?? 'Not set'}</span>
              </p>
              <p className="text-sm">
                Overage rate:{' '}
                <span className="font-medium">
                  {overageOption === 'plan_default'
                    ? 'Plan default'
                    : overageOption === 'custom'
                      ? (customOverage ? `$${customOverage}/min` : 'Not set')
                      : `$${overageOption}/min`}
                </span>
              </p>
              <p className="text-sm">
                Promotions:{' '}
                <span className="font-medium">
                  {selectedPromos.length > 0
                    ? promotions.filter((p) => selectedPromos.includes(p.id)).map((p) => p.name).join(', ')
                    : 'None'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <ListChecks className="h-4 w-4 text-primary" />
              <span className="font-medium">Starter template: Direct Client Default</span>
              <Badge variant="secondary" className="text-xs">
                {DIRECT_CLIENT_DEFAULT_TEMPLATE.length} items
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Submitting seeds the onboarding handoff, fulfillment intake, and flips the lead
              pipeline stage to <span className="font-medium text-foreground">Active</span>.
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 max-h-56 overflow-auto space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Ops items ({opsItems.length})
                </p>
                <ul className="space-y-1">
                  {opsItems.map((i) => (
                    <li key={i.item_key} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-primary/70" />
                      {i.label}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Client to fill ({clientItems.length})
                </p>
                <ul className="space-y-1">
                  {clientItems.map((i) => (
                    <li key={i.item_key} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-cta/70" />
                      {i.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex sm:justify-between gap-2">
          <div>
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={() => setStep((s) => s - 1)}
                disabled={busy}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Activate Account
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConvertLeadToAccountDialog;
