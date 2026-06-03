import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DiscTable =
  | "disc_templates"
  | "disc_locations"
  | "disc_keywords"
  | "disc_audiences"
  | "disc_faq_sets"
  | "disc_faqs"
  | "disc_internal_link_sets"
  | "disc_internal_link_items";

export interface CrudField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "boolean";
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  hideInList?: boolean;
}

export interface SimpleCrudTableProps {
  table: DiscTable;
  title: string;
  description?: string;
  fields: CrudField[];
  orderBy?: { column: string; ascending?: boolean };
  emptyMessage?: string;
}

export function SimpleCrudTable({
  table, title, description, fields, orderBy, emptyMessage,
}: SimpleCrudTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const listFields = fields.filter((f) => !f.hideInList).slice(0, 5);

  async function load() {
    setLoading(true);
    let q = supabase.from(table as any).select("*");
    if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    const { data, error } = await q.limit(500);
    if (error) toast.error(error.message);
    setRows((data as any[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [table]);

  function startCreate() {
    const init: Record<string, any> = {};
    fields.forEach((f) => {
      init[f.key] = f.defaultValue ?? (f.type === "boolean" ? true : f.type === "number" ? 0 : "");
    });
    setEditing(null);
    setForm(init);
    setOpen(true);
  }

  function startEdit(row: any) {
    const init: Record<string, any> = {};
    fields.forEach((f) => { init[f.key] = row[f.key] ?? (f.type === "boolean" ? false : ""); });
    setEditing(row);
    setForm(init);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      for (const f of fields) {
        if (f.required && (form[f.key] === "" || form[f.key] == null)) {
          toast.error(`${f.label} is required`);
          setSaving(false); return;
        }
      }
      const payload: Record<string, any> = {};
      fields.forEach((f) => {
        let v = form[f.key];
        if (f.type === "number") v = v === "" ? null : Number(v);
        if (v === "") v = null;
        payload[f.key] = v;
      });

      if (editing?.id) {
        const { error } = await supabase.from(table as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Saved");
      } else {
        const { error } = await supabase.from(table as any).insert(payload);
        if (error) throw error;
        toast.success("Created");
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startCreate}><Plus className="w-4 h-4 mr-2" />New</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} {title}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      rows={4}
                      value={form[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  ) : f.type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!form[f.key]}
                        onCheckedChange={(v) => setForm({ ...form, [f.key]: v })}
                      />
                      <span className="text-sm text-muted-foreground">{form[f.key] ? "Yes" : "No"}</span>
                    </div>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : "text"}
                      value={form[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {emptyMessage ?? "Nothing yet. Click New to add your first record."}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {listFields.map((f) => (
                  <th key={f.key} className="px-3 py-2 text-left font-medium">{f.label}</th>
                ))}
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  {listFields.map((f) => (
                    <td key={f.key} className="px-3 py-2 align-top">
                      {f.type === "boolean" ? (r[f.key] ? "Yes" : "No") :
                       typeof r[f.key] === "object" ? JSON.stringify(r[f.key]).slice(0, 60) :
                       String(r[f.key] ?? "—").slice(0, 100)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(r.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Type narrowing helper for callers if needed
export type _Db = Database;
