import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight, History } from 'lucide-react';
import { format } from 'date-fns';

interface KnowledgeVersion {
  id: string;
  entity: string;
  entity_id: string;
  version: number;
  snapshot: Record<string, any>;
  created_at: string;
  created_by: string | null;
}

interface Props {
  entity: 'faq' | 'policy';
  entityId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KnowledgeVersionHistory({ entity, entityId, title, open, onOpenChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['campaign-os', 'knowledge-versions', entity, entityId],
    enabled: open && !!entityId,
    queryFn: async (): Promise<KnowledgeVersion[]> => {
      const { data, error } = await (supabase as any)
        .from('campaign_knowledge_versions')
        .select('*')
        .eq('entity', entity)
        .eq('entity_id', entityId)
        .order('version', { ascending: false });
      if (error) throw error;
      return (data ?? []) as KnowledgeVersion[];
    },
  });

  const getPreview = (snapshot: Record<string, any>) => {
    const text = entity === 'faq' ? snapshot.answer_md : snapshot.body_md;
    if (!text) return '(no content)';
    return text.length > 100 ? text.slice(0, 100) + '…' : text;
  };

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-[480px] sm:w-[540px] overflow-y-auto"
        data-testid="version-history-sheet"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </SheetTitle>
          <p className="text-sm text-muted-foreground truncate">{title}</p>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading history…</p>
          )}

          {!isLoading && versions.length === 0 && (
            <p className="text-sm text-muted-foreground">No version history yet.</p>
          )}

          {versions.map((v) => (
            <Card
              key={v.id}
              className="cursor-pointer"
              data-testid="version-history-entry"
              onClick={() => toggle(v.id)}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {expandedId === v.id
                      ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <Badge variant="secondary">v{v.version}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(v.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {v.snapshot.status}
                  </Badge>
                </div>

                {expandedId !== v.id && (
                  <p className="text-xs text-muted-foreground pl-6 line-clamp-2">
                    {getPreview(v.snapshot)}
                  </p>
                )}

                {expandedId === v.id && (
                  <div className="pl-6 space-y-3 text-sm border-t pt-3 mt-1">
                    {entity === 'faq' && (
                      <>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Question</p>
                          <p>{v.snapshot.question}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Answer</p>
                          <p className="whitespace-pre-wrap text-xs">{v.snapshot.answer_md}</p>
                        </div>
                      </>
                    )}
                    {entity === 'policy' && (
                      <>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Title</p>
                          <p>{v.snapshot.title}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Body</p>
                          <p className="whitespace-pre-wrap text-xs">{v.snapshot.body_md}</p>
                        </div>
                        {(v.snapshot.effective_from || v.snapshot.effective_to) && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Effective Period</p>
                            <p className="text-xs">
                              {v.snapshot.effective_from
                                ? format(new Date(v.snapshot.effective_from), 'MMM d, yyyy')
                                : '—'}
                              {' → '}
                              {v.snapshot.effective_to
                                ? format(new Date(v.snapshot.effective_to), 'MMM d, yyyy')
                                : '—'}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="outline" className="text-xs">{v.snapshot.scope}</Badge>
                      {v.snapshot.policy_kind && (
                        <Badge variant="outline" className="text-xs">{v.snapshot.policy_kind}</Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
