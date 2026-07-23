import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Share2, Copy, Check, Loader2, Linkedin, Facebook, Twitter, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const platformConfig = {
  linkedin: { label: "LinkedIn", icon: Linkedin, color: "bg-blue-600" },
  facebook: { label: "Facebook", icon: Facebook, color: "bg-blue-500" },
  twitter: { label: "X / Twitter", icon: Twitter, color: "bg-slate-800" },
};

export default function GrowthHubSocial() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: partner } = useQuery({
    queryKey: ["wl-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("white_label_partners").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: blogPosts } = useQuery({
    queryKey: ["wl-blog-posts-for-social", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wl_blog_queue")
        .select("id, generated_title, keyword_text, status")
        .eq("partner_id", partner!.id)
        .in("status", ["generated", "published"])
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!partner?.id,
  });

  const { data: snippets, isLoading: loadingSnippets } = useQuery({
    queryKey: ["wl-social-snippets", selectedPostId],
    queryFn: async () => {
      const { data } = await supabase
        .from("wl_social_snippets")
        .select("*")
        .eq("blog_queue_id", selectedPostId)
        .order("platform");
      return data || [];
    },
    enabled: !!selectedPostId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wl-generate-social-snippets", {
        body: { blog_queue_id: selectedPostId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message ?? 'Unknown error');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-social-snippets", selectedPostId] });
      toast({ title: "Snippets generated!", description: "Social media posts are ready to copy." });
    },
    onError: (e: Error) => {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/white-label-dashboard/growth"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Social Media Snippets</h1>
            <p className="text-muted-foreground text-sm">Generate platform-optimized social posts from your blog content.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select a Blog Post</CardTitle>
            <CardDescription>Choose a generated or published blog post to create social snippets from.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedPostId} onValueChange={setSelectedPostId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a blog post..." />
              </SelectTrigger>
              <SelectContent>
                {(blogPosts || []).map((post) => (
                  <SelectItem key={post.id} value={post.id}>
                    {post.generated_title || post.keyword_text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!selectedPostId || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Share2 className="w-4 h-4 mr-2" /> Generate Snippets</>
              )}
            </Button>
          </CardContent>
        </Card>

        {loadingSnippets && selectedPostId && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {snippets && snippets.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {snippets.map((snippet) => {
              const config = platformConfig[snippet.platform as keyof typeof platformConfig];
              const Icon = config?.icon || Share2;
              return (
                <Card key={snippet.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3" />
                        {config?.label || snippet.platform}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(snippet.content, snippet.id)}
                      >
                        {copiedId === snippet.id ? (
                          <><Check className="w-3.5 h-3.5 mr-1" /> Copied</>
                        ) : (
                          <><Copy className="w-3.5 h-3.5 mr-1" /> Copy</>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{snippet.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {snippets && snippets.length === 0 && selectedPostId && !loadingSnippets && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              No snippets yet. Click "Generate Snippets" to create social media posts.
            </CardContent>
          </Card>
        )}
      </div>
    </WhiteLabelLayout>
  );
}
