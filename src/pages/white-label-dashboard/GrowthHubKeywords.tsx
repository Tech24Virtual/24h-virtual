import { useState } from "react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Loader2, Trash2, Sparkles, ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  queued: "bg-yellow-100 text-yellow-800",
  generated: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
};

const categoryLabels: Record<string, string> = {
  service: "Service",
  location: "Location",
  industry: "Industry",
  comparison: "Comparison",
  "how-to": "How-To",
  cost: "Cost",
};

export default function GrowthHubKeywords() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("service");
  const [focusArea, setFocusArea] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const { data: partner } = useQuery({
    queryKey: ["wl-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("white_label_partners").select("id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: keywords, isLoading } = useQuery({
    queryKey: ["wl-keywords", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wl_keyword_tracker")
        .select("*")
        .eq("partner_id", partner!.id)
        .order("sort_priority", { ascending: false });
      return data || [];
    },
    enabled: !!partner?.id,
  });

  const addKeyword = useMutation({
    mutationFn: async () => {
      if (!newKeyword.trim()) throw new Error("Keyword is required");
      const { error } = await supabase.from("wl_keyword_tracker").insert({
        partner_id: partner!.id,
        keyword: newKeyword.trim(),
        category: newCategory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewKeyword("");
      queryClient.invalidateQueries({ queryKey: ["wl-keywords"] });
      toast.success("Keyword added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteKeyword = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wl_keyword_tracker").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-keywords"] });
      toast.success("Keyword removed");
    },
  });

  const queueForContent = useMutation({
    mutationFn: async (kw: any) => {
      const { error } = await supabase.from("wl_blog_queue").insert({
        partner_id: partner!.id,
        keyword_id: kw.id,
        keyword_text: kw.keyword,
      });
      if (error) throw error;
      await supabase.from("wl_keyword_tracker").update({ content_status: "queued" }).eq("id", kw.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-keywords"] });
      toast.success("Queued for content generation");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const suggestKeywords = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wl-suggest-keywords", {
        body: { partner_id: partner!.id, focus_area: focusArea || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.suggestions;
    },
    onSuccess: (data) => {
      setSuggestions(data || []);
      toast.success(`${data?.length || 0} suggestions generated`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addSuggestion = useMutation({
    mutationFn: async (s: any) => {
      const { error } = await supabase.from("wl_keyword_tracker").insert({
        partner_id: partner!.id,
        keyword: s.keyword,
        category: s.category || "service",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-keywords"] });
      toast.success("Keyword added from suggestion");
    },
  });

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/white-label-dashboard/growth"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-heading">Keyword Research</h1>
            <p className="text-muted-foreground">Track keywords and build your content strategy.</p>
          </div>
        </div>

        {/* Add Keyword */}
        <Card>
          <CardHeader><CardTitle className="text-base">Add Keyword</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1"
              />
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => addKeyword.mutate()} disabled={addKeyword.isPending}>
                <Plus className="w-4 h-4 mr-1" />Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4" />AI Keyword Suggestions</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Input
                placeholder="Focus area (optional, e.g. 'dental practices in Miami')"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => suggestKeywords.mutate()} disabled={suggestKeywords.isPending}>
                {suggestKeywords.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Suggest
              </Button>
            </div>
            {suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                    <div>
                      <span className="font-medium text-sm">{s.keyword}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{s.category}</Badge>
                      <Badge variant="outline" className="ml-1 text-xs">{s.intent}</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addSuggestion.mutate(s)}>
                      <Plus className="w-3 h-3 mr-1" />Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyword List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Tracked Keywords ({keywords?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !keywords?.length ? (
              <p className="text-center text-muted-foreground py-8">No keywords tracked yet. Add one above or use AI suggestions.</p>
            ) : (
              <div className="space-y-2">
                {keywords.map((kw: any) => (
                  <div key={kw.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{kw.keyword}</p>
                      <Badge variant="outline" className="text-xs mt-1">{categoryLabels[kw.category] || kw.category}</Badge>
                    </div>
                    <Badge className={statusColors[kw.content_status] || ""}>
                      {kw.content_status.replace("_", " ")}
                    </Badge>
                    {kw.content_status === "not_started" && (
                      <Button size="sm" variant="outline" onClick={() => queueForContent.mutate(kw)}>
                        <FileText className="w-3 h-3 mr-1" />Queue
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => deleteKeyword.mutate(kw.id)} className="text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WhiteLabelLayout>
  );
}
