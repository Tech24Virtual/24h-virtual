import { useEffect, useState } from 'react';
import { Loader2, Search, UserCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  ConvertLeadToAccountDialog,
  type ConvertLeadInput,
} from './ConvertLeadToAccountDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STAGES = ['qualified', 'sales', 'new'];

/**
 * Picker dialog used from the Active Accounts empty state. Lists leads in
 * convertible pipeline stages and hands the chosen one to ConvertLeadToAccountDialog.
 */
export function ConvertibleLeadPickerDialog({ open, onOpenChange }: Props) {
  const [leads, setLeads] = useState<ConvertLeadInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<ConvertLeadInput | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('leads')
        .select('id, name, email, company, partner_id, user_id, pipeline_stage')
        .in('pipeline_stage', STAGES)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled) {
        setLeads((data as any[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = leads.filter(
    (l) =>
      !query.trim() ||
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      (l.email ?? '').toLowerCase().includes(query.toLowerCase()) ||
      (l.company ?? '').toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <Dialog open={open && !picked} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Pick a lead to convert
            </DialogTitle>
            <DialogDescription>
              Showing leads in qualified, sales, or new pipeline stages.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search name, email, or company"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-72 overflow-auto -mx-2 px-2">
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No convertible leads found.
              </p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((l) => (
                  <li key={l.id}>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-auto py-2"
                      onClick={() => setPicked(l)}
                    >
                      <div className="text-left">
                        <p className="font-medium text-sm">{l.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.email}{l.company ? ` · ${l.company}` : ''}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        Convert
                      </Badge>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConvertLeadToAccountDialog
        lead={picked}
        open={!!picked}
        onOpenChange={(v) => {
          if (!v) {
            setPicked(null);
            onOpenChange(false);
          }
        }}
      />
    </>
  );
}

export default ConvertibleLeadPickerDialog;
