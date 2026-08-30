import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Rocket, 
  FileText, 
  Search, 
  Globe, 
  ArrowRight,
  TrendingUp,
  BarChart3,
  Share2,
  Mail
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function GrowthHub() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: partner } = useQuery({
    queryKey: ["wl-partner", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("white_label_partners")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: stats } = useQuery({
    queryKey: ["growth-hub-stats", partner?.id],
    queryFn: async () => {
      const [blogRes, keywordRes, wpRes, snippetsRes, reportsRes, newsletterRes, emailSendsRes] = await Promise.all([
        supabase.from("wl_blog_queue").select("status", { count: "exact" }).eq("partner_id", partner!.id),
        supabase.from("wl_keyword_tracker").select("content_status", { count: "exact" }).eq("partner_id", partner!.id),
        supabase.from("wl_wordpress_connections").select("status").eq("partner_id", partner!.id).maybeSingle(),
        supabase.from("wl_social_snippets").select("id", { count: "exact", head: true }).eq("partner_id", partner!.id),
        supabase.from("wl_seo_reports").select("id", { count: "exact", head: true }).eq("partner_id", partner!.id),
        supabase.from("wl_newsletter_drafts").select("id", { count: "exact", head: true }).eq("partner_id", partner!.id),
        supabase.from("wl_email_sends").select("id", { count: "exact", head: true }).eq("partner_id", partner!.id).eq("status", "sent"),
      ]);

      const { data: blogData, error: blogError } = blogRes;
      const { data: keywordData, error: keywordError } = keywordRes;
      const { data: wpData, error: wpError } = wpRes;
      const { count: snippetsCountRaw, error: snippetsError } = snippetsRes;
      const { count: reportsCountRaw, error: reportsError } = reportsRes;
      const { count: newsletterCountRaw, error: newsletterError } = newsletterRes;
      const { count: emailSendsCountRaw, error: emailSendsError } = emailSendsRes;

      const namedErrors = [
        ["wl_blog_queue", blogError],
        ["wl_keyword_tracker", keywordError],
        ["wl_wordpress_connections", wpError],
        ["wl_social_snippets", snippetsError],
        ["wl_seo_reports", reportsError],
        ["wl_newsletter_drafts", newsletterError],
        ["wl_email_sends", emailSendsError],
      ].filter(([, err]) => Boolean(err)) as [string, { message: string }][];

      const errors = namedErrors.map(([, err]) => err);

      if (namedErrors.length > 0) {
        console.error(
          "[GrowthHub] query errors:",
          namedErrors.map(([table, err]) => `${table}: ${err.message}`),
        );
      }

      if (errors.length === 7) {
        toast({
          title: "Some data could not be loaded",
          description: "Check your permissions or contact support.",
          variant: "destructive",
        });
      }

      const blogItems = blogData ?? [];
      const keywords = keywordData ?? [];

      return {
        totalPosts: blogItems.length,
        publishedPosts: blogItems.filter(b => b.status === "published").length,
        totalKeywords: keywords.length,
        coveredKeywords: keywords.filter(k => k.content_status !== "not_started").length,
        wpConnected: wpData?.status === "connected",
        snippetsCount: snippetsCountRaw ?? 0,
        reportsCount: reportsCountRaw ?? 0,
        newsletterCount: newsletterCountRaw ?? 0,
        emailSendsCount: emailSendsCountRaw ?? 0,
      };
    },
    enabled: !!partner?.id,
  });

  const tools = [
    {
      title: "Auto-Blog Engine",
      description: "Generate SEO-optimized blog posts branded for your business. AI writes content that positions you as the expert.",
      icon: FileText,
      href: "/white-label-dashboard/growth/blog",
      stat: stats ? `${stats.publishedPosts} published` : "—",
    },
    {
      title: "Keyword Research",
      description: "Track target keywords, get AI-powered suggestions, and build a content strategy for your local market.",
      icon: Search,
      href: "/white-label-dashboard/growth/keywords",
      stat: stats ? `${stats.totalKeywords} tracked` : "—",
    },
    {
      title: "WordPress Connection",
      description: "Connect your WordPress site to auto-publish blog posts directly. Zero manual copy-paste.",
      icon: Globe,
      href: "/white-label-dashboard/growth/wordpress",
      stat: stats?.wpConnected ? "Connected" : "Not connected",
    },
    {
      title: "Social Snippets",
      description: "Auto-generate social media posts for LinkedIn, Facebook, and X from your blog content.",
      icon: Share2,
      href: "/white-label-dashboard/growth/social",
      stat: stats ? `${stats.snippetsCount} generated` : "—",
    },
    {
      title: "SEO Reports",
      description: "Generate monthly content marketing reports you can share with your clients.",
      icon: BarChart3,
      href: "/white-label-dashboard/growth/reports",
      stat: stats ? `${stats.reportsCount} reports` : "—",
    },
    {
      title: "Newsletter Generator",
      description: "Auto-draft email newsletters from recent blog posts to send to your client list.",
      icon: Mail,
      href: "/white-label-dashboard/growth/newsletter",
      stat: stats ? `${stats.newsletterCount} drafts` : "—",
    },
    {
      title: "Email Integration",
      description: "Connect Resend to send newsletters directly to your contact list.",
      icon: Mail,
      href: "/white-label-dashboard/growth/email",
      stat: stats ? `${stats.emailSendsCount} sent` : "—",
    },
  ];

  return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-heading">Growth Hub</h1>
              <p className="text-muted-foreground">Tools to grow your business and dominate local SEO.</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
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

        {/* Tool Cards */}
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
                    <Badge variant="outline" className="text-xs">
                      {tool.stat}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to={tool.href}>
                      Open
                      <ArrowRight className="w-4 h-4 ml-2" />
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
