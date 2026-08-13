import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, FileText, Loader2, ExternalLink, Trash2, Send, RefreshCw, ArrowLeft, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  generating: "bg-yellow-100 text-yellow-800",
  generated: "bg-blue-100 text-blue-800",
  publishing: "bg-purple-100 text-purple-800",
  published: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default function GrowthHubBlog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [contentLength, setContentLength] = useState("medium");
  const [tone, setTone] = useState("professional");

  const { data: partner } = useQuery({
    queryKey: ["wl-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("white_label_partners").select("id").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: queue, isLoading } = useQuery({
    queryKey: ["wl-blog-queue", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wl_blog_queue")
        .select("*")
        .eq("partner_id", partner!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!partner?.id,
  });

  const { data: wpConnection } = useQuery({
    queryKey: ["wl-wp-connection", partner?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wl_wordpress_connections")
        .select("status")
        .eq("partner_id", partner!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!partner?.id,
  });

  const addToQueue = useMutation({
    mutationFn: async () => {
      if (!keyword.trim()) throw new Error("Keyword is required");
      const { error } = await supabase.from("wl_blog_queue").insert({
        partner_id: partner!.id,
        keyword_text: keyword.trim(),
        content_length: contentLength,
        tone,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setKeyword("");
      queryClient.invalidateQueries({ queryKey: ["wl-blog-queue"] });
      toast.success("Added to blog queue");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generatePost = useMutation({
    mutationFn: async (queueId: string) => {
      const { data, error } = await supabase.functions.invoke("wl-generate-blog-post", {
        body: { queue_id: queueId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message ?? 'Unknown error');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-blog-queue"] });
      toast.success("Blog post generated!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const publishPost = useMutation({
    mutationFn: async (queueId: string) => {
      const { data, error } = await supabase.functions.invoke("publish-to-wordpress", {
        body: { queue_id: queueId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message ?? 'Unknown error');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-blog-queue"] });
      toast.success("Published to WordPress!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (queueId: string) => {
      const { error } = await supabase.from("wl_blog_queue").delete().eq("id", queueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wl-blog-queue"] });
      toast.success("Removed from queue");
    },
  });

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/white-label-dashboard/growth"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-heading">Auto-Blog Engine</h1>
            <p className="text-muted-foreground">Generate and publish SEO blog posts under your brand.</p>
          </div>
        </div>

        {/* Add to Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Queue New Blog Post</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter target keyword..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="flex-1"
              />
              <Select value={contentLength} onValueChange={setContentLength}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => addToQueue.mutate()} disabled={addToQueue.isPending}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Queue List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Blog Queue ({queue?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !queue?.length ? (
              <p className="text-center text-muted-foreground py-8">No posts in queue yet. Add a keyword above to get started.</p>
            ) : (
              <div className="space-y-3">
                {queue.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.generated_title || item.keyword_text}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.content_length} · {item.tone} · {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={statusColors[item.status] || ""}>
                      {item.status}
                    </Badge>
                    <div className="flex gap-1">
                      {item.status === "queued" && (
                        <Button size="sm" variant="outline" onClick={() => generatePost.mutate(item.id)} disabled={generatePost.isPending}>
                          <Zap className="w-3 h-3 mr-1" />Generate
                        </Button>
                      )}
                      {item.status === "generated" && wpConnection?.status === "connected" && (
                        <Button size="sm" variant="outline" onClick={() => publishPost.mutate(item.id)} disabled={publishPost.isPending}>
                          <Send className="w-3 h-3 mr-1" />Publish
                        </Button>
                      )}
                      {item.status === "failed" && (
                        <Button size="sm" variant="outline" onClick={() => generatePost.mutate(item.id)} disabled={generatePost.isPending}>
                          <RefreshCw className="w-3 h-3 mr-1" />Retry
                        </Button>
                      )}
                      {item.wp_post_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={item.wp_post_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteItem.mutate(item.id)} className="text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
