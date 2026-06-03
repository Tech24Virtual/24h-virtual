import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Rocket, FileText, Search, Globe, ArrowRight,
  TrendingUp, BarChart3, Share2, Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function AdminGrowthHub() {
  const { data: stats } = useQuery({
    queryKey: ["admin-growth-hub-stats"],
    queryFn: async () => {
      const [blogRes, keywordRes, wpRes] = await Promise.all([
        supabase.from("blog_posts").select("status", { count: "exact" }),
        supabase.from("keyword_tracker").select("content_status", { count: "exact" }),
        supabase.from("admin_wordpress_connection").select("status").limit(1).maybeSingle(),
      ]);

      const blogItems = blogRes.data || [];
      const keywords = keywordRes.data || [];

      return {
        totalPosts: blogItems.length,
        publishedPosts: blogItems.filter((b: any) => b.status === "published").length,
        totalKeywords: keywords.length,
        coveredKeywords: keywords.filter((k: any) => k.content_status !== "not_started").length,
        wpConnected: wpRes.data?.status === "connected",
      };
    },
  });

  const tools = [
    {
      title: "Blog Manager",
      description: "Create and manage SEO-optimized blog posts for your company website.",
      icon: FileText,
      href: "/admin/blog",
      stat: stats ? `${stats.publishedPosts} published` : "—",
    },
    {
      title: "Keyword Tracker",
      description: "Track target keywords, monitor rankings, and build your content strategy.",
      icon: Search,
      href: "/admin/keywords",
      stat: stats ? `${stats.totalKeywords} tracked` : "—",
    },
    {
      title: "WordPress Connection",
      description: "Connect your WordPress site to auto-publish blog posts directly.",
      icon: Globe,
      href: "/admin/growth-hub/wordpress",
      stat: stats?.wpConnected ? "Connected" : "Not connected",
    },
    {
      title: "Social Snippets",
      description: "Auto-generate social media posts for LinkedIn, Facebook, and X from your blog content.",
      icon: Share2,
      href: "/admin/growth-hub/social",
      stat: "Ready",
    },
    {
      title: "SEO Reports",
      description: "Generate monthly content marketing reports with AI-powered executive summaries.",
      icon: BarChart3,
      href: "/admin/growth-hub/reports",
      stat: "Ready",
    },
    {
      title: "Newsletter Generator",
      description: "Auto-draft email newsletters from recent blog posts to send to your contact list.",
      icon: Mail,
      href: "/admin/growth-hub/newsletter",
      stat: "Ready",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">Growth Hub</h1>
            <p className="text-muted-foreground">Tools to grow your business and dominate SEO.</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">📡 Mrunsox Integration:</strong> Content for 24Hvirtual.com is managed in Mrunsox / Kingdom OS. This dashboard shows synced content. Local legacy posts remain editable during the transition.
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalPosts ?? 0}</p>
              <p className="text-xs text-muted-foreground">Blog Posts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalKeywords ?? 0}</p>
              <p className="text-xs text-muted-foreground">Keywords Tracked</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.coveredKeywords ?? 0}</p>
              <p className="text-xs text-muted-foreground">Keywords Covered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="h-full hover:shadow-soft transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <tool.icon className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-xs">{tool.stat}</Badge>
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link to={tool.href}>
                    Open <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
