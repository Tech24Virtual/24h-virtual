import { useState, useEffect } from "react";
import { Plus, Search, BookOpen, Pencil, Trash2 } from "lucide-react";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Audience = "internal" | "client" | "both";
type AudienceFilter = "all" | Audience;

const AUDIENCE_LABEL: Record<Audience, string> = {
  internal: "Internal only",
  client: "Clients only",
  both: "Internal + Clients",
};

const AUDIENCE_BADGE: Record<Audience, "secondary" | "default" | "cta"> = {
  internal: "secondary",
  client: "cta",
  both: "default",
};

export default function WLKnowledgeBase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [form, setForm] = useState<{
    title: string; content: string; category: string; tags: string; audience: Audience;
  }>({ title: "", content: "", category: "general", tags: "", audience: "internal" });

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from("white_label_partners").select("id").eq("user_id", user.id).single();
      if (!partner) return;
      setPartnerId(partner.id);

      const { data } = await supabase.from("wl_knowledge_base").select("*")
        .eq("partner_id", partner.id).order("updated_at", { ascending: false });
      setArticles(data || []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const openEditor = (article?: any) => {
    if (article) {
      setEditingArticle(article);
      setForm({
        title: article.title,
        content: article.content,
        category: article.category,
        tags: (article.tags || []).join(", "),
        audience: (article.audience as Audience) || "internal",
      });
    } else {
      setEditingArticle(null);
      setForm({ title: "", content: "", category: "general", tags: "", audience: "internal" });
    }
    setIsEditorOpen(true);
  };

  const handleSave = async () => {
    if (!partnerId || !form.title || !form.content) return;
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    const payload = {
      title: form.title,
      content: form.content,
      category: form.category,
      tags,
      audience: form.audience,
    };
    try {
      if (editingArticle) {
        await supabase.from("wl_knowledge_base").update(payload).eq("id", editingArticle.id);
      } else {
        await supabase.from("wl_knowledge_base").insert({ partner_id: partnerId, ...payload });
      }
      toast({ title: editingArticle ? "Article Updated" : "Article Created" });
      setIsEditorOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("wl_knowledge_base").delete().eq("id", id);
    toast({ title: "Article Deleted" });
    fetchData();
  };

  const filtered = articles.filter(a => {
    const matchesText =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAudience =
      audienceFilter === "all" ||
      (a.audience || "internal") === audienceFilter;
    return matchesText && matchesAudience;
  });

  const categories = [...new Set(articles.map(a => a.category))];

  const audienceCounts = {
    all: articles.length,
    internal: articles.filter(a => (a.audience || "internal") === "internal").length,
    client: articles.filter(a => a.audience === "client").length,
    both: articles.filter(a => a.audience === "both").length,
  };

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Knowledge Base</h1>
            <p className="text-muted-foreground mt-1">Your private knowledge base — isolated from all other partners</p>
          </div>
          <Button onClick={() => openEditor()}><Plus className="w-4 h-4 mr-2" />New Article</Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search articles..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "internal", "client", "both"] as AudienceFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setAudienceFilter(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                audienceFilter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {f === "all" ? "All" : AUDIENCE_LABEL[f]} ({audienceCounts[f]})
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Badge key={cat} variant="secondary" className="cursor-pointer capitalize" onClick={() => setSearchQuery(cat)}>
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-lg font-medium mb-2">No articles yet</p>
              <p className="text-muted-foreground mb-4">Build your knowledge base for your clients and AI assistant</p>
              <Button onClick={() => openEditor()}>Create First Article</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(a => {
              const audience = (a.audience || "internal") as Audience;
              return (
                <Card key={a.id} className="hover:shadow-soft transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{a.title}</CardTitle>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="secondary" className="capitalize">{a.category}</Badge>
                          <Badge variant={AUDIENCE_BADGE[audience]}>{AUDIENCE_LABEL[audience]}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditor(a)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">{a.content}</p>
                    {a.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.tags.map((tag: string) => (
                          <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingArticle ? "Edit Article" : "New Article"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g., general, billing, procedures" />
                </div>
                <div className="space-y-2">
                  <Label>Audience *</Label>
                  <Select value={form.audience} onValueChange={(v: Audience) => setForm(p => ({ ...p, audience: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal only — your staff</SelectItem>
                      <SelectItem value="client">Clients only — visible to your end clients</SelectItem>
                      <SelectItem value="both">Internal + Clients</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={10} />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="e.g., faq, onboarding, billing" />
              </div>
              <Button onClick={handleSave} className="w-full">{editingArticle ? "Update Article" : "Create Article"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WhiteLabelLayout>
  );
}
