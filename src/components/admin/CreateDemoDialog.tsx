import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Users, Building, LayoutDashboard, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type Preset = 'business' | 'affiliate' | 'white_label' | 'all';

const PRESETS: { id: Preset; label: string; icon: typeof Briefcase; description: string; portals: string[] }[] = [
  {
    id: 'business',
    label: 'Business Operations',
    icon: Briefcase,
    description: 'Client, Sales, Agent, Supervisor, Billing & Tech portals with leads, calls, tickets, and billing data',
    portals: ['Client', 'Sales', 'Agent', 'Supervisor', 'Billing', 'Tech'],
  },
  {
    id: 'affiliate',
    label: 'Affiliate Program',
    icon: Users,
    description: 'Affiliate portal with referrals, commissions, payouts, and marketing assets',
    portals: ['Affiliate'],
  },
  {
    id: 'white_label',
    label: 'White Label Partner',
    icon: Building,
    description: 'WL portal with partner branding, sub-clients, call logs, and wholesale billing',
    portals: ['White Label'],
  },
  {
    id: 'all',
    label: 'Full Platform',
    icon: LayoutDashboard,
    description: 'All 10 dashboards with complete mock data across every portal',
    portals: ['Admin', 'Client', 'Sales', 'Agent', 'Supervisor', 'Billing', 'Tech', 'White Label', 'Affiliate', 'Referrer'],
  },
];

function generatePassword(length = 16): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  // Guarantee at least one of each type
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  const all = upper + lower + digits + symbols;
  for (let i = required.length; i < length; i++) {
    required.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle
  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }
  return required.join('');
}

export function CreateDemoDialog({ open, onOpenChange, onCreated }: CreateDemoDialogProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('Demo User');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdRoles, setCreatedRoles] = useState<string[]>([]);

  const resetForm = () => {
    setStep(1);
    setName('Demo User');
    setEmail('');
    setPassword(generatePassword());
    setShowPassword(false);
    setPreset(null);
    setLoading(false);
    setCreatedRoles([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleCreate = async () => {
    if (!preset) return;
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-demo-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ name, email, password, preset }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create demo account');

      setCreatedRoles(result.roles || []);
      setStep(3);
      toast.success('Demo account created successfully');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create demo account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && 'Create Demo Account'}
            {step === 2 && 'Select Demo Preset'}
            {step === 3 && 'Demo Account Created'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Enter the demo user credentials'}
            {step === 2 && 'Choose which dashboards and data to provision'}
            {step === 3 && 'The account is ready with mock data'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="demo-name">Full Name</Label>
              <Input id="demo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Demo User" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-email">Email</Label>
              <Input id="demo-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="demo@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-password">Temporary Password</Label>
              <div className="relative">
                <Input
                  id="demo-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setStep(2)} disabled={!name.trim() || !email.trim() || !password.trim()}>
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 pt-2">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              const selected = preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{p.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleCreate} disabled={!preset || loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Demo Account'}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 pt-2 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <div className="space-y-2 text-left bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Password</span>
                <span className="font-mono font-medium">{password}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 justify-center">
              {createdRoles.map((r) => (
                <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">A branded demo invitation email has been sent to {email}</p>
            <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
