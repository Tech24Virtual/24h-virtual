import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface AgentBankingFormProps {
  agentId?: string; // If not provided, uses current user
  showHourlyRate?: boolean; // Only billing/admin should set this
}

export function AgentBankingForm({ agentId, showHourlyRate = false }: AgentBankingFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const effectiveAgentId = agentId || user?.id;

  const [formData, setFormData] = useState({
    bank_name: '',
    account_holder_name: '',
    account_number_encrypted: '',
    routing_number: '',
    institution_number: '',
    transit_number: '',
    account_type: 'checking',
    swift_bic: '',
    iban: '',
    currency: 'CAD',
    country: 'CA',
    hourly_rate: '',
  });

  const { data: banking, isLoading } = useQuery({
    queryKey: ['agent-banking', effectiveAgentId],
    queryFn: async () => {
      if (!effectiveAgentId) return null;
      const { data, error } = await supabase
        .from('agent_banking')
        .select('*')
        .eq('agent_id', effectiveAgentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveAgentId,
  });

  useEffect(() => {
    if (banking) {
      setFormData({
        bank_name: banking.bank_name || '',
        account_holder_name: banking.account_holder_name || '',
        account_number_encrypted: banking.account_number_encrypted || '',
        routing_number: banking.routing_number || '',
        institution_number: banking.institution_number || '',
        transit_number: banking.transit_number || '',
        account_type: banking.account_type || 'checking',
        swift_bic: banking.swift_bic || '',
        iban: banking.iban || '',
        currency: banking.currency || 'CAD',
        country: banking.country || 'CA',
        hourly_rate: banking.hourly_rate?.toString() || '',
      });
    }
  }, [banking]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveAgentId) throw new Error('No agent ID');
      const payload: Record<string, unknown> = {
        agent_id: effectiveAgentId,
        bank_name: formData.bank_name || null,
        account_holder_name: formData.account_holder_name || null,
        account_number_encrypted: formData.account_number_encrypted || null,
        routing_number: formData.routing_number || null,
        institution_number: formData.institution_number || null,
        transit_number: formData.transit_number || null,
        account_type: formData.account_type,
        swift_bic: formData.swift_bic || null,
        iban: formData.iban || null,
        currency: formData.currency,
        country: formData.country,
      };
      if (showHourlyRate && formData.hourly_rate) {
        payload.hourly_rate = parseFloat(formData.hourly_rate);
      }

      if (banking) {
        const { error } = await supabase
          .from('agent_banking')
          .update(payload)
          .eq('agent_id', effectiveAgentId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agent_banking')
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-banking', effectiveAgentId] });
      toast.success('Banking details saved');
    },
    onError: (err: any) => {
      console.error('Failed to save banking:', err);
      toast.error('Failed to save banking details');
    },
  });

  const update = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const showCanadianFields = formData.country === 'CA';
  const showInternationalFields = formData.country !== 'CA' && formData.country !== 'US';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" />
          Banking Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Account Holder Name</Label>
            <Input
              value={formData.account_holder_name}
              onChange={(e) => update('account_holder_name', e.target.value)}
              placeholder="Full legal name"
            />
          </div>
          <div className="space-y-2">
            <Label>Bank Name</Label>
            <Input
              value={formData.bank_name}
              onChange={(e) => update('bank_name', e.target.value)}
              placeholder="e.g. TD Canada Trust"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={formData.country} onValueChange={(v) => update('country', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={formData.currency} onValueChange={(v) => update('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              type="password"
              value={formData.account_number_encrypted}
              onChange={(e) => update('account_number_encrypted', e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select value={formData.account_type} onValueChange={(v) => update('account_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {showCanadianFields && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Institution Number</Label>
              <Input
                value={formData.institution_number}
                onChange={(e) => update('institution_number', e.target.value)}
                placeholder="3 digits"
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Transit Number</Label>
              <Input
                value={formData.transit_number}
                onChange={(e) => update('transit_number', e.target.value)}
                placeholder="5 digits"
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label>Routing Number</Label>
              <Input
                value={formData.routing_number}
                onChange={(e) => update('routing_number', e.target.value)}
                placeholder="Auto-generated or manual"
              />
            </div>
          </div>
        )}

        {!showCanadianFields && (
          <div className="space-y-2">
            <Label>Routing Number</Label>
            <Input
              value={formData.routing_number}
              onChange={(e) => update('routing_number', e.target.value)}
              placeholder="Routing / Sort Code"
            />
          </div>
        )}

        {showInternationalFields && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SWIFT / BIC</Label>
              <Input
                value={formData.swift_bic}
                onChange={(e) => update('swift_bic', e.target.value)}
                placeholder="e.g. TDOMCATTTOR"
              />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input
                value={formData.iban}
                onChange={(e) => update('iban', e.target.value)}
                placeholder="International account number"
              />
            </div>
          </div>
        )}

        {showHourlyRate && (
          <div className="space-y-2">
            <Label>Hourly Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.hourly_rate}
              onChange={(e) => update('hourly_rate', e.target.value)}
              placeholder="e.g. 18.50"
            />
          </div>
        )}

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Banking Details'}
        </Button>
      </CardContent>
    </Card>
  );
}
