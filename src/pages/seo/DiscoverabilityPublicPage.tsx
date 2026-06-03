/**
 * Phase 2 — Public Discoverability Page Renderer.
 *
 * Renders canonical disc_generated_pages by slug. RLS only exposes pages
 * that are publish_status='published', indexation_status='index', and
 * include_in_sitemap=true, so a 404 is safe for everything else.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/NotFound";
import { Button } from "@/components/ui/button";

interface DiscPage {
  id: string;
  slug: string;
  full_url: string | null;
  page_title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  h1: string | null;
  hero_content: string | null;
  direct_answer_content: string | null;
  local_overview_content: string | null;
  problem_section_content: string | null;
  solution_section_content: string | null;
  feature_section_content: string | null;
  faq_content: any;
  internal_links_payload: any;
  schema_payload: any;
  breadcrumb_title: string | null;
}

function Section({ title, body }: { title?: string; body: string | null | undefined }) {
  if (!body || !body.trim()) return null;
  return (
    <section className="mb-10">
      {title && <h2 className="text-2xl font-semibold mb-4 text-heading">{title}</h2>}
      <div className="prose prose-neutral max-w-none whitespace-pre-line text-foreground/90">{body}</div>
    </section>
  );
}

export default function DiscoverabilityPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<DiscPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      // Slug stored may include leading /seo/ or just trailing portion. Try both.
      const candidates = Array.from(new Set([
        slug ?? "",
        `/seo/${slug ?? ""}`,
        `seo/${slug ?? ""}`,
      ]));
      const { data } = await supabase
        .from("disc_generated_pages")
        .select("*")
        .in("slug", candidates)
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setPage((data as DiscPage | null) ?? null);
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-12 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!page) return <NotFound />;

  const faqs: Array<{ question: string; answer_short?: string; answer_full?: string }> =
    Array.isArray(page.faq_content) ? page.faq_content : [];
  const links: Array<{ anchor_text: string; target_url: string }> =
    Array.isArray(page.internal_links_payload) ? page.internal_links_payload : [];

  const schemas: any[] = [];
  const baseSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.page_title ?? page.h1,
    description: page.meta_description,
    url: page.canonical_url ?? `https://24hv.io/seo/${slug}`,
  };
  schemas.push(baseSchema);
  if (faqs.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer_full ?? f.answer_short ?? "" },
      })),
    });
  }
  if (page.schema_payload && typeof page.schema_payload === "object") {
    schemas.push(page.schema_payload);
  }

  return (
    <>
      <SEO
        title={page.meta_title ?? page.page_title ?? "24H Virtual"}
        description={page.meta_description ?? ""}
        canonical={page.canonical_url ?? `/seo/${slug}`}
        jsonLd={schemas}
      />

      <article className="container mx-auto max-w-4xl py-12 px-4">
        {page.breadcrumb_title && (
          <nav className="text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <span>{page.breadcrumb_title}</span>
          </nav>
        )}

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-heading mb-6">
          {page.h1 ?? page.page_title}
        </h1>

        {page.direct_answer_content && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-10">
            <p className="text-lg text-foreground/90 whitespace-pre-line">{page.direct_answer_content}</p>
          </div>
        )}

        <Section body={page.hero_content} />
        <Section title="Local Overview" body={page.local_overview_content} />
        <Section title="The Challenge" body={page.problem_section_content} />
        <Section title="Our Solution" body={page.solution_section_content} />
        <Section title="What You Get" body={page.feature_section_content} />

        {faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-heading">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <div key={i} className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold mb-2">{f.question}</h3>
                  <p className="text-sm text-foreground/80 whitespace-pre-line">{f.answer_full ?? f.answer_short}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {links.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-3 text-heading">Related</h2>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">
              {links.map((l, i) => (
                <li key={i}>
                  <a href={l.target_url} className="text-primary hover:underline">{l.anchor_text}</a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-12 rounded-2xl bg-primary text-primary-foreground p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to Get Started?</h2>
          <p className="mb-4 opacity-90">Book a free consultation with our team.</p>
          <Button asChild variant="cta" size="lg" className="rounded-full">
            <Link to="/get-started">Book FREE Consultation</Link>
          </Button>
        </div>
      </article>
    </>
  );
}
