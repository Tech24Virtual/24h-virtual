import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Bot, Mail, Phone, User, FileText, Ticket, Zap,
  ChevronRight, ChevronLeft, Copy, ExternalLink, Plus, UserPlus, ArrowUp, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  conversationId: string | null;
  onCreateTicket: () => void;
  onEscalate: () => void;
  onClose: () => void;
  onAssignToMe: () => void;
}

export function ContextDrawer({ conversationId, onCreateTicket, onEscalate, onClose, onAssignToMe }: Props) {
  // In-memory only — no localStorage (Phase 1 rule: workspace state lives in session)
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // Auto-collapse when no conversation
  useEffect(() => {
    if (!conversationId && !collapsed) {
      setCollapsed(true);
    }
  }, [conversationId]);

  const toggle = () => setCollapsed((c) => !c);

  const { data: convo } = useQuery({
    queryKey: ['chat-conversation-context', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data } = await supabase
        .from('chat_conversations')
        .select('*, chat_visitors(*), chat_deployments(display_name, ownership_mode)')
        .eq('id', conversationId)
        .maybeSingle();
      return data;
    },
    enabled: !!conversationId,
  });

  const clientId = (convo as any)?.direct_client_id ?? null;

  const { data: script } = useQuery({
    queryKey: ['drawer-active-script', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data } = await supabase
        .from('client_scripts')
        .select('id, name, greeting, faqs')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!clientId,
  });

  const { data: linkedTickets } = useQuery({
    queryKey: ['drawer-linked-tickets', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, status, priority, created_at')
        .contains('metadata' as any, { chat_conversation_id: conversationId })
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!conversationId,
  });

  // Collapsed icon rail
  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 border-l bg-card flex flex-col items-center py-2 gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={toggle} title="Expand context">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="h-px w-6 bg-border my-1" />
        {[
          { icon: Bot, label: 'Summary' },
          { icon: User, label: 'Visitor' },
          { icon: FileText, label: 'Script' },
          { icon: Ticket, label: 'Tickets' },
          { icon: Zap, label: 'Actions' },
        ].map((s, i) => (
          <Button
            key={i}
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            onClick={toggle}
            title={s.label}
            disabled={!conversationId}
          >
            <s.icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </aside>
    );
  }

  if (!conversationId) {
    return (
      <aside className="w-80 shrink-0 border-l bg-card flex flex-col">
        <div className="h-9 border-b flex items-center justify-between px-2 shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Context</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={toggle}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
          Select a conversation to view context
        </div>
      </aside>
    );
  }

  const visitor = (convo as any)?.chat_visitors;
  const deployment = (convo as any)?.chat_deployments;
  const faqs = Array.isArray(script?.faqs) ? (script!.faqs as any[]) : [];

  const copy = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  return (
    <aside className="w-80 shrink-0 border-l bg-card flex flex-col overflow-hidden">
      <div className="h-9 border-b flex items-center justify-between px-2 shrink-0 bg-muted/30">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Context</span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={toggle}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* AI Summary */}
          <Section icon={<Bot className="h-3 w-3" />} title="AI Summary">
            <div className="text-xs bg-muted/40 rounded p-2 leading-relaxed">
              {convo?.ai_summary || <span className="text-muted-foreground italic">No summary yet</span>}
            </div>
          </Section>

          {/* Visitor */}
          <Section icon={<User className="h-3 w-3" />} title="Visitor">
            <div className="space-y-1">
              <CopyRow label="Name" value={visitor?.name || 'Anonymous'} onCopy={copy} />
              {visitor?.email && <CopyRow label="Email" value={visitor.email} icon={<Mail className="h-3 w-3" />} onCopy={copy} />}
              {visitor?.phone && <CopyRow label="Phone" value={visitor.phone} icon={<Phone className="h-3 w-3" />} onCopy={copy} />}
            </div>
          </Section>

          {/* Client */}
          <Section title="Client">
            <div className="rounded bg-background border p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium truncate">{deployment?.display_name || '—'}</p>
                <Badge variant={deployment?.ownership_mode === 'wl' ? 'secondary' : 'default'} className="text-[9px] h-4 shrink-0">
                  {deployment?.ownership_mode === 'wl' ? 'WL' : 'Direct'}
                </Badge>
              </div>
              {clientId && (
                <Link
                  to={`/staff/agent/clients`}
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                >
                  View client profile <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          </Section>

          {/* Active Script */}
          {script && (
            <Section icon={<FileText className="h-3 w-3" />} title="Active Script">
              <div className="rounded bg-background border p-2 space-y-1.5">
                <p className="text-xs font-medium truncate">{script.name}</p>
                {script.greeting && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-wide">Greeting</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-3 leading-tight whitespace-pre-wrap">{script.greeting}</p>
                  </div>
                )}
                {faqs.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">{faqs.length} FAQ{faqs.length > 1 ? 's' : ''} available below in pinned bar</p>
                )}
              </div>
            </Section>
          )}

          {/* Linked Tickets */}
          <Section
            icon={<Ticket className="h-3 w-3" />}
            title="Linked Tickets"
            action={
              <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={onCreateTicket}>
                <Plus className="h-2.5 w-2.5 mr-0.5" /> New
              </Button>
            }
          >
            {!linkedTickets || linkedTickets.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic px-1">None linked</p>
            ) : (
              <div className="space-y-1">
                {linkedTickets.map((t) => (
                  <Link
                    key={t.id}
                    to={`/staff/agent/tickets/${t.id}`}
                    className="flex items-center gap-1.5 rounded border bg-background px-2 py-1 hover:bg-accent transition-colors"
                  >
                    <span className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      t.status === 'open' && 'bg-primary',
                      t.status === 'pending' && 'bg-cta',
                      t.status === 'resolved' && 'bg-secondary',
                      (t.status === 'closed' || !['open','pending','resolved'].includes(t.status)) && 'bg-muted-foreground',
                    )} />
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">#{t.ticket_number}</span>
                    <span className="text-[11px] truncate flex-1">{t.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </Section>
        </div>
      </ScrollArea>

      {/* Sticky Quick Actions */}
      <div className="border-t bg-muted/20 p-1.5 shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 px-1">Quick Actions</p>
        <div className="grid grid-cols-2 gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[11px] justify-start px-2" onClick={onAssignToMe}>
            <UserPlus className="h-3 w-3 mr-1" /> Assign
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] justify-start px-2" onClick={onCreateTicket}>
            <Ticket className="h-3 w-3 mr-1" /> Ticket
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] justify-start px-2" onClick={onEscalate}>
            <ArrowUp className="h-3 w-3 mr-1" /> Escalate
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] justify-start px-2" onClick={onClose}>
            <X className="h-3 w-3 mr-1" /> Close
          </Button>
        </div>
      </div>
    </aside>
  );
}

function Section({
  title, children, icon, action,
}: { title: string; children: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {icon}
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function CopyRow({
  label, value, icon, onCopy,
}: { label: string; value: string; icon?: React.ReactNode; onCopy: (t: string, l?: string) => void }) {
  return (
    <div className="group flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-accent">
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <span className="text-[11px] truncate flex-1" title={value}>{value}</span>
      <button
        onClick={() => onCopy(value, `${label} copied`)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        title={`Copy ${label}`}
      >
        <Copy className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
}
