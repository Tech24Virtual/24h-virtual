import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import type { WLHandoffItem } from '@/hooks/wl/useWLHandoffItems';
import { useWLHandoffItemMutations } from '@/hooks/wl/useWLHandoffItems';

interface Props {
  item: WLHandoffItem;
  handoffId: string;
  highlight?: boolean;
}

export function WLHandoffItemEditor({ item, handoffId, highlight }: Props) {
  const { updateItem } = useWLHandoffItemMutations(handoffId);
  const initialValue = (item.value_json as { value?: unknown } | null)?.value;
  const [value, setValue] = useState<unknown>(initialValue ?? '');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(initialValue ?? '');
    setDirty(false);
  }, [initialValue]);

  const save = async () => {
    const hasValue =
      typeof value === 'string'
        ? value.trim().length > 0
        : value !== null && value !== undefined && value !== '';
    await updateItem.mutateAsync({
      id: item.id,
      value,
      status: hasValue ? 'provided' : 'pending',
    });
    setDirty(false);
  };

  const markNa = async () => {
    await updateItem.mutateAsync({ id: item.id, status: 'na' });
    setDirty(false);
  };

  const renderInput = () => {
    switch (item.item_type) {
      case 'long_text':
        return (
          <Textarea
            rows={3}
            value={String(value ?? '')}
            onChange={(e) => {
              setValue(e.target.value.slice(0, 4000));
              setDirty(true);
            }}
            placeholder="Type your answer…"
          />
        );
      case 'boolean':
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(v) => {
                setValue(v);
                setDirty(true);
              }}
            />
            <span className="text-sm text-muted-foreground">{value ? 'Yes' : 'No'}</span>
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={String(value ?? '')}
            onChange={(e) => {
              setValue(e.target.value);
              setDirty(true);
            }}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={String(value ?? '')}
            onChange={(e) => {
              setValue(e.target.value);
              setDirty(true);
            }}
          />
        );
      case 'email':
        return (
          <Input
            type="email"
            value={String(value ?? '')}
            onChange={(e) => {
              setValue(e.target.value.slice(0, 200));
              setDirty(true);
            }}
            placeholder="name@example.com"
          />
        );
      case 'phone':
        return (
          <Input
            type="tel"
            value={String(value ?? '')}
            onChange={(e) => {
              setValue(e.target.value.slice(0, 40));
              setDirty(true);
            }}
            placeholder="+1 555 555 5555"
          />
        );
      default:
        return (
          <Input
            value={String(value ?? '')}
            onChange={(e) => {
              setValue(e.target.value.slice(0, 500));
              setDirty(true);
            }}
          />
        );
    }
  };

  const statusBadge = (() => {
    if (item.status === 'provided')
      return (
        <Badge variant="secondary" className="gap-1">
          <Check className="w-3 h-3" /> Provided
        </Badge>
      );
    if (item.status === 'na')
      return (
        <Badge variant="outline" className="gap-1">
          <X className="w-3 h-3" /> N/A
        </Badge>
      );
    return (
      <Badge variant={item.is_required ? 'destructive' : 'outline'}>
        {item.is_required ? 'Required' : 'Pending'}
      </Badge>
    );
  })();

  return (
    <div
      id={`item-${item.item_key}`}
      className={`rounded-md border p-3 space-y-2 transition ${
        highlight ? 'ring-2 ring-primary border-primary/50' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-medium">{item.label}</Label>
        {statusBadge}
      </div>
      {renderInput()}
      <div className="flex items-center justify-end gap-2">
        {item.status !== 'na' && !item.is_required && (
          <Button
            size="sm"
            variant="ghost"
            onClick={markNa}
            disabled={updateItem.isPending}
          >
            Mark N/A
          </Button>
        )}
        {dirty && (
          <Button size="sm" onClick={save} disabled={updateItem.isPending}>
            Save
          </Button>
        )}
      </div>
    </div>
  );
}
