import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete: () => void;
}

interface Tpl { id: string; name: string; page_type: string }
interface Loc { id: string; city: string; country: string; priority_score: number }
interface Kw { id: string; keyword: string }
interface Aud { id: string; audience_name: string }

export function GenerateBatchDialog({ open, onOpenChange, onComplete }: Props) {
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [keywords, setKeywords] = useState<Kw[]>([]);
  const [audiences, setAudiences] = useState<Aud[]>([]);
  const [selT, setSelT] = useState<Set<string>>(new Set());
  const [selK, setSelK] = useState<Set<string>>(new Set());
  const [selA, setSelA] = useState<Set<string>>(new Set());
  const [country, setCountry] = useState<"all" | "United States" | "Canada">("all");
  const [topN, setTopN] = useState<string>("50");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [t, l, k, a] = await Promise.all([
        supabase.from("disc_templates").select("id,name,page_type").order("name"),
        supabase.from("disc_locations").select("id,city,country,priority_score").eq("active", true).order("priority_score", { ascending: false }).order("city"),
        supabase.from("disc_keywords").select("id,keyword").eq("active", true).order("keyword"),
        supabase.from("disc_audiences").select("id,audience_name").eq("active", true).order("audience_name"),
      ]);
      setTemplates(t.data ?? []);
      setLocations(l.data ?? []);
      setKeywords(k.data ?? []);
      setAudiences(a.data ?? []);
    })();
  }, [open]);

  const filteredLocations = locations
    .filter((l) => country === "all" || l.country === country)
    .slice(0, parseInt(topN) || 50);

  const totalCombos = selT.size * Math.max(filteredLocations.length, 1) * Math.max(selK.size, 1) * Math.max(selA.size, 1);

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    setter(n);
  }

  async function run() {
    if (selT.size === 0) { toast.error("Pick at least one template"); return; }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("disc-generate-pages", {
        body: {
          templateIds: Array.from(selT),
          locationIds: filteredLocations.map((l) => l.id),
          keywordIds: Array.from(selK),
          audienceIds: Array.from(selA),
        },
      });
      if (error) throw error;
      toast.success(`Created ${data?.created ?? 0}, skipped ${data?.skipped ?? 0}`);
      onComplete();
      onOpenChange(false);
    } catch (e) {
      toast.error(`Generation failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Generate Batch</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <section>
            <Label className="text-sm font-medium">Templates</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {templates.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm border rounded-md p-2 hover:bg-muted/30 cursor-pointer">
                  <Checkbox checked={selT.has(t.id)} onCheckedChange={() => toggle(selT, t.id, setSelT)} />
                  <span className="truncate">{t.name} <span className="text-muted-foreground">({t.page_type})</span></span>
                </label>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Country filter</Label>
              <Select value={country} onValueChange={(v) => setCountry(v as typeof country)}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Top N locations by priority</Label>
              <Select value={topN} onValueChange={setTopN}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="25">Top 25</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                  <SelectItem value="100">Top 100</SelectItem>
                  <SelectItem value="200">All available</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>
          <p className="text-xs text-muted-foreground">{filteredLocations.length} locations selected</p>

          <section>
            <Label className="text-sm font-medium">Keywords</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
              {keywords.map((k) => (
                <label key={k.id} className="flex items-center gap-2 text-sm border rounded-md p-2 hover:bg-muted/30 cursor-pointer">
                  <Checkbox checked={selK.has(k.id)} onCheckedChange={() => toggle(selK, k.id, setSelK)} />
                  <span className="truncate">{k.keyword}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <Label className="text-sm font-medium">Audiences (optional)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
              {audiences.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm border rounded-md p-2 hover:bg-muted/30 cursor-pointer">
                  <Checkbox checked={selA.has(a.id)} onCheckedChange={() => toggle(selA, a.id, setSelA)} />
                  <span className="truncate">{a.audience_name}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="bg-muted/30 rounded-md p-3 text-sm">
            <span className="font-medium">{totalCombos.toLocaleString()}</span> combinations will be attempted. Existing pages with the same combination are skipped.
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={running}>Cancel</Button>
          <Button onClick={run} disabled={running || selT.size === 0}>
            {running && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
