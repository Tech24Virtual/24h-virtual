import { useState } from 'react';
import { useDepartmentTypeDefaults, useUpsertDepartmentTypeDefault, type DepartmentTypeDefault } from '@/hooks/campaign-os/useDepartmentTypeDefaults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function CampaignOsDefaults() {
  const { data: defaults = [], isLoading } = useDepartmentTypeDefaults();
  const upsert = useUpsertDepartmentTypeDefault();
  const [editing, setEditing] = useState<Record<string, { fields: string; faqs: string; mappings: string }>>({});

  const handleSave = async (d: DepartmentTypeDefault) => {
    const draft = editing[d.department_type];
    if (!draft) return;
    try {
      const payload: any = { department_type: d.department_type };
      payload.default_field_group_json = JSON.parse(draft.fields);
      payload.default_faqs_json = JSON.parse(draft.faqs);
      payload.default_five9_mappings_json = JSON.parse(draft.mappings);
      await upsert.mutateAsync(payload);
      toast.success(`Updated defaults for ${d.department_type}`);
      setEditing((prev) => { const copy = { ...prev }; delete copy[d.department_type]; return copy; });
    } catch (e: any) {
      toast.error(`Invalid JSON: ${e.message}`);
    }
  };

  if (isLoading) return <Skeleton className="h-60 w-full" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Edit JSON templates that auto-seed when a new department of each type is created. Admins only.</p>
      {defaults.map((d) => {
        const draft = editing[d.department_type] ?? {
          fields: JSON.stringify(d.default_field_group_json, null, 2),
          faqs: JSON.stringify(d.default_faqs_json, null, 2),
          mappings: JSON.stringify(d.default_five9_mappings_json, null, 2),
        };
        return (
          <Card key={d.department_type}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Badge variant="secondary">{d.department_type}</Badge></CardTitle>
              <Button size="sm" onClick={() => handleSave(d)} disabled={!editing[d.department_type] || upsert.isPending}>Save</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Field Group JSON</Label>
                <Textarea rows={6} className="font-mono text-xs" value={draft.fields} onChange={(e) => setEditing((p) => ({ ...p, [d.department_type]: { ...draft, fields: e.target.value } }))} />
              </div>
              <div>
                <Label>FAQs JSON</Label>
                <Textarea rows={4} className="font-mono text-xs" value={draft.faqs} onChange={(e) => setEditing((p) => ({ ...p, [d.department_type]: { ...draft, faqs: e.target.value } }))} />
              </div>
              <div>
                <Label>Five9 Mappings JSON</Label>
                <Textarea rows={4} className="font-mono text-xs" value={draft.mappings} onChange={(e) => setEditing((p) => ({ ...p, [d.department_type]: { ...draft, mappings: e.target.value } }))} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
