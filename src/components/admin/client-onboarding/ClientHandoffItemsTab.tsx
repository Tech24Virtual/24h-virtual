import { useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import { useClientHandoffItems } from '@/hooks/admin/useClientHandoffs';
import { ClientHandoffItemEditor } from './ClientHandoffItemEditor';
import { toast } from 'sonner';

interface Props {
  handoffId: string;
  focusKey?: string | null;
}

export function ClientHandoffItemsTab({ handoffId, focusKey }: Props) {
  const { data: items, isLoading } = useClientHandoffItems(handoffId);

  const { required, optional, completion } = useMemo(() => {
    const list = items ?? [];
    const req = list.filter((i) => i.is_required);
    const opt = list.filter((i) => !i.is_required);
    const reqDone = req.filter((i) => i.status === 'provided' || i.status === 'na').length;
    return {
      required: req,
      optional: opt,
      completion: {
        done: reqDone,
        total: req.length,
        percent: req.length === 0 ? 0 : Math.round((reqDone / req.length) * 100),
      },
    };
  }, [items]);

  useEffect(() => {
    if (!focusKey || !items?.length) return;
    const exists = items.some((i) => i.item_key === focusKey);
    if (!exists) {
      toast.message('Linked item not found');
      return;
    }
    document.getElementById(`item-${focusKey}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [focusKey, items]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <Card className="p-8 text-center space-y-3">
        <Sparkles className="w-6 h-6 mx-auto text-muted-foreground" />
        <p className="font-medium">No intake items yet</p>
        <p className="text-sm text-muted-foreground">
          This handoff was created without a template. Use the recovery action to seed default items.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Required completion</span>
          <span className="text-muted-foreground">
            {completion.done} / {completion.total}
          </span>
        </div>
        <Progress value={completion.percent} />
      </Card>

      {required.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Required
          </h3>
          <div className="space-y-2">
            {required.map((it) => (
              <ClientHandoffItemEditor
                key={it.id}
                item={it}
                handoffId={handoffId}
                highlight={focusKey === it.item_key}
              />
            ))}
          </div>
        </div>
      )}

      {optional.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Optional
          </h3>
          <div className="space-y-2">
            {optional.map((it) => (
              <ClientHandoffItemEditor
                key={it.id}
                item={it}
                handoffId={handoffId}
                highlight={focusKey === it.item_key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
