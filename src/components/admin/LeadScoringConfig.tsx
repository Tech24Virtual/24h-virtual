import { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_SCORING_RULES, RULE_LABELS, type ScoringRules } from '@/lib/leadScoring';

export function LeadScoringConfig() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rules, setRules] = useState<ScoringRules>(DEFAULT_SCORING_RULES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchRules = async () => {
      const { data } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'lead_scoring_rules')
        .single();

      if (data?.value) {
        setRules(data.value as unknown as ScoringRules);
      }
      setIsLoading(false);
    };
    fetchRules();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('admin_settings')
      .upsert([{
        key: 'lead_scoring_rules',
        value: JSON.parse(JSON.stringify(rules)),
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      }], { onConflict: 'key' });

    setIsSaving(false);
    if (error) {
      toast({ title: 'Error saving scoring rules', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Scoring rules saved', description: 'Lead scoring weights updated successfully.' });
    }
  };

  const updateRule = (key: string, field: 'points' | 'enabled', value: number | boolean) => {
    setRules(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [key]: { ...prev.rules[key], [field]: value },
      },
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Scoring Rules</CardTitle>
          <CardDescription>
            Configure point values for each scoring factor. Leads are automatically scored based on these rules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(rules.rules).map(([key, rule]) => (
            <div key={key} className="flex items-center gap-4 p-3 rounded-lg border">
              <Switch
                checked={rule.enabled}
                onCheckedChange={(checked) => updateRule(key, 'enabled', checked)}
              />
              <div className="flex-1 min-w-0">
                <Label className="text-sm font-medium">{RULE_LABELS[key] || key}</Label>
                <Slider
                  value={[rule.points]}
                  onValueChange={([v]) => updateRule(key, 'points', v)}
                  min={0}
                  max={50}
                  step={5}
                  disabled={!rule.enabled}
                  className="mt-2"
                />
              </div>
              <span className="text-sm font-mono w-12 text-right text-muted-foreground">
                +{rule.points}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Score Labels</CardTitle>
          <CardDescription>Set thresholds for Hot, Warm, and Cold labels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hot Threshold (≥)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={rules.labels.hot}
                onChange={(e) => setRules(prev => ({ ...prev, labels: { ...prev.labels, hot: parseInt(e.target.value) || 0 } }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Warm Threshold (≥)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={rules.labels.warm}
                onChange={(e) => setRules(prev => ({ ...prev, labels: { ...prev.labels, warm: parseInt(e.target.value) || 0 } }))}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Leads with score ≥ {rules.labels.hot} are <strong className="text-green-600">Hot</strong>,
            ≥ {rules.labels.warm} are <strong className="text-yellow-600">Warm</strong>,
            below are <strong>Cold</strong>.
          </p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Save Scoring Rules
      </Button>
    </div>
  );
}
