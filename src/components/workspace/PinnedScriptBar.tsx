import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, FileText, Copy, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  clientId: string | null;
  onInsert: (text: string) => void;
}

export interface PinnedScriptBarHandle {
  focusSearch: () => void;
}

export const PinnedScriptBar = forwardRef<PinnedScriptBarHandle, Props>(({ clientId, onInsert }, ref) => {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      setExpanded(true);
      setTimeout(() => searchRef.current?.focus(), 50);
    },
  }));

  const { data: script } = useQuery({
    queryKey: ['pinned-script', clientId],
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

  if (!script) return null;

  const greeting = script.greeting || '';
  const faqs = Array.isArray(script.faqs) ? (script.faqs as any[]) : [];
  const topChips = faqs.slice(0, 3);

  const filtered = (() => {
    if (!search.trim()) return faqs;
    const s = search.toLowerCase();
    return faqs.filter((f) => (f.question || '').toLowerCase().includes(s) || (f.answer || '').toLowerCase().includes(s));
  })();

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <div className="border-t bg-muted/20 shrink-0">
      {/* Compact bar with inline FAQ chips */}
      <div className="flex items-center gap-1.5 px-2 h-7">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground shrink-0"
        >
          <FileText className="h-3 w-3" />
          <span className="font-medium text-foreground truncate max-w-[120px]">{script.name}</span>
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>

        {topChips.length > 0 && (
          <div className="flex-1 flex gap-1 overflow-x-auto scrollbar-none">
            {greeting && (
              <button
                onClick={() => onInsert(greeting)}
                className="shrink-0 px-1.5 h-5 rounded bg-background border text-[10px] hover:bg-accent transition-colors"
                title="Insert greeting"
              >
                Greeting
              </button>
            )}
            {topChips.map((f, i) => (
              <button
                key={i}
                onClick={() => onInsert(f.answer || '')}
                className="shrink-0 px-1.5 h-5 rounded bg-background border text-[10px] hover:bg-accent transition-colors truncate max-w-[160px]"
                title={f.answer}
              >
                {f.question || `FAQ ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t">
          <div className="p-1.5 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scripts..."
                className="h-6 pl-7 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="max-h-40">
            <div className="p-1.5 space-y-1.5">
              {greeting && !search && (
                <ScriptSnippet label="Greeting" text={greeting} onInsert={onInsert} onCopy={copy} />
              )}
              {filtered.map((f, i) => (
                <ScriptSnippet
                  key={i}
                  label={f.question || `FAQ ${i + 1}`}
                  text={f.answer || ''}
                  onInsert={onInsert}
                  onCopy={copy}
                />
              ))}
              {!greeting && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground px-1 py-2">No matching snippets</p>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
});

PinnedScriptBar.displayName = 'PinnedScriptBar';

function ScriptSnippet({
  label,
  text,
  onInsert,
  onCopy,
}: {
  label: string;
  text: string;
  onInsert: (t: string) => void;
  onCopy: (t: string) => void;
}) {
  return (
    <div className="rounded border bg-background p-1.5 text-xs">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <p className="font-medium truncate text-[11px]">{label}</p>
        <div className="flex gap-0.5 shrink-0">
          <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => onCopy(text)}>
            <Copy className="h-2.5 w-2.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={() => onInsert(text)}>
            Insert
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground line-clamp-2 whitespace-pre-wrap text-[11px] leading-tight">{text}</p>
    </div>
  );
}
