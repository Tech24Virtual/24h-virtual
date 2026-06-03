import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Type, LayoutList, Space, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type FixType = 'content' | 'structure' | 'spacing' | 'all';

interface AIFixToolbarProps {
  selectedText: string;
  fullContext: string;
  onFixed: (improvedText: string) => void;
}

export default function AIFixToolbar({ selectedText, fullContext, onFixed }: AIFixToolbarProps) {
  const [loading, setLoading] = useState<FixType | null>(null);
  const [userNote, setUserNote] = useState('');

  const handleFix = async (fixType: FixType) => {
    if (!selectedText.trim()) return;
    setLoading(fixType);

    try {
      const { data, error } = await supabase.functions.invoke('fix-blog-content', {
        body: { selectedText, fixType, fullContext, userNote: userNote.trim() || undefined },
      });

      if (error) throw error;

      if (data?.error) {
        if (data.status === 429) {
          toast.error('Rate limit reached — try again in a moment.');
        } else if (data.status === 402) {
          toast.error('AI credits exhausted — top up in workspace settings.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      const improved = data?.improvedText;
      if (improved) {
        onFixed(improved);
        setUserNote('');
        toast.success('Section updated!');
      } else {
        toast.error('AI returned empty result.');
      }
    } catch (e: any) {
      console.error('AI fix error:', e);
      toast.error(e.message || 'Failed to fix content.');
    } finally {
      setLoading(null);
    }
  };

  if (!selectedText.trim()) return null;

  const fixes: { type: FixType; label: string; icon: React.ReactNode }[] = [
    { type: 'content', label: 'Content', icon: <Type className="w-3.5 h-3.5" /> },
    { type: 'structure', label: 'Structure', icon: <LayoutList className="w-3.5 h-3.5" /> },
    { type: 'spacing', label: 'Spacing', icon: <Space className="w-3.5 h-3.5" /> },
    { type: 'all', label: 'Improve All', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded-lg border bg-background shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[380px]">
      <Input
        value={userNote}
        onChange={e => setUserNote(e.target.value)}
        placeholder="Describe the issue (optional)..."
        className="h-7 text-xs"
        onKeyDown={e => { if (e.key === 'Enter' && userNote.trim()) handleFix('all'); }}
      />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground px-0.5 font-medium">AI Fix:</span>
        {fixes.map(({ type, label, icon }) => (
          <Button
            key={type}
            variant={type === 'all' ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={loading !== null}
            onClick={() => handleFix(type)}
          >
            {loading === type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
