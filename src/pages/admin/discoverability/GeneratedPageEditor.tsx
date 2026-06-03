import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pageId: string;
  onSaved: () => void;
}

export function GeneratedPageEditor({ pageId, onSaved }: Props) {
  const [page, setPage] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("disc_generated_pages").select("*").eq("id", pageId).maybeSingle();
      setPage(data);
      setLoading(false);
    })();
  }, [pageId]);

  if (loading || !page) return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  function field(k: string, label: string, multiline = false) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        {multiline ? (
          <Textarea rows={4} value={page[k] ?? ""} onChange={(e) => setPage({ ...page, [k]: e.target.value })} />
        ) : (
          <Input value={page[k] ?? ""} onChange={(e) => setPage({ ...page, [k]: e.target.value })} />
        )}
      </div>
    );
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("disc_generated_pages").update({
      page_title: page.page_title,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      h1: page.h1,
      hero_content: page.hero_content,
      direct_answer_content: page.direct_answer_content,
      local_overview_content: page.local_overview_content,
      problem_section_content: page.problem_section_content,
      solution_section_content: page.solution_section_content,
      feature_section_content: page.feature_section_content,
      readiness_state: page.readiness_state,
      publish_status: page.publish_status,
      include_in_sitemap: page.include_in_sitemap,
      manual_override: true,
    }).eq("id", pageId);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success("Saved"); onSaved(); }
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge>Quality {page.quality_score}</Badge>
        <Badge variant="secondary">{page.readiness_state}</Badge>
        <Badge variant="outline">{page.publish_status}</Badge>
        <Badge variant="outline">{page.word_count} words</Badge>
      </div>

      {field("page_title", "Page title")}
      {field("meta_title", "Meta title")}
      {field("meta_description", "Meta description", true)}
      {field("h1", "H1")}
      {field("hero_content", "Hero", true)}
      {field("direct_answer_content", "Direct answer", true)}
      {field("local_overview_content", "Local overview", true)}
      {field("problem_section_content", "Problem section", true)}
      {field("solution_section_content", "Solution section", true)}
      {field("feature_section_content", "Feature section", true)}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Readiness</Label>
          <Select value={page.readiness_state} onValueChange={(v) => setPage({ ...page, readiness_state: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="needs_review">Needs review</SelectItem>
              <SelectItem value="needs_rewrite">Needs rewrite</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Publish status</Label>
          <Select value={page.publish_status} onValueChange={(v) => setPage({ ...page, publish_status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}
