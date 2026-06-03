import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { SEO, createFAQSchema, createSpeakableSchema, createBreadcrumbSchema } from '@/components/SEO';
import { BlogPostHero } from '@/components/blog/BlogPostHero';
import { BlogTOCSidebar } from '@/components/blog/BlogTOCSidebar';
import { BlogMarkdownRenderer } from '@/components/blog/BlogMarkdownRenderer';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogLeadForm } from '@/components/blog/BlogLeadForm';
import { Helmet } from 'react-helmet-async';
import { useMemo } from 'react';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug!)
        .eq('status', 'published')
        .single();
      if (error) throw error;

      // Increment views
      supabase.from('blog_posts').update({ views: (data.views || 0) + 1 }).eq('id', data.id).then();

      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedPosts } = useQuery({
    queryKey: ['related-posts', post?.category, post?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .eq('category', post!.category!)
        .neq('id', post!.id)
        .order('published_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!post,
  });

  // Extract FAQ items from content for structured data (must be before early returns)
  const faqItems = useMemo(() => {
    const content = post?.content || '';
    const faqSection = content.split('## Frequently Asked Questions');
    if (faqSection.length < 2) return [];
    const faqContent = faqSection[1];
    const items: { question: string; answer: string }[] = [];
    const matches = faqContent.matchAll(/### (.+?)\n\n([\s\S]*?)(?=\n### |\n---|\n## |$)/g);
    for (const m of matches) {
      items.push({ question: m[1].trim(), answer: m[2].trim() });
    }
    return items;
  }, [post?.content]);

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <SEO
          title="Post not found"
          description="The blog post you are looking for could not be found."
          noindex
        />
        <Navigation />
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <h1 className="text-2xl font-bold">Post not found</h1>
          <Link to="/blog" className="text-primary hover:underline">Back to Blog</Link>
        </div>
        <Footer />
      </>
    );
  }

  const publishDate = post.published_at || post.created_at;

  // JSON-LD structured data
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description || post.excerpt,
    author: { '@type': 'Organization', name: post.author || '24H Virtual' },
    publisher: {
      '@type': 'Organization',
      name: '24H Virtual',
      url: 'https://24hv.io',
    },
    datePublished: publishDate,
    dateModified: post.updated_at,
    mainEntityOfPage: `https://24hv.io/blog/${post.slug}`,
  };

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  const speakableSchema = createSpeakableSchema(`/blog/${post.slug}`, ['h1', '.speakable', 'article > p:first-of-type']);

  const schemas: object[] = [articleSchema, breadcrumbSchema, speakableSchema];
  if (faqItems.length > 0) {
    schemas.push(createFAQSchema(faqItems));
  }

  return (
    <>
      <SEO
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt || ''}
        canonical={`/blog/${post.slug}`}
        ogType="article"
        jsonLd={schemas}
      />
      <Helmet>
        <meta property="article:published_time" content={publishDate} />
      </Helmet>

      <Navigation />

      <BlogPostHero
        title={post.title}
        excerpt={post.excerpt || undefined}
        category={post.category || 'Tips & Guides'}
        reading_time={post.reading_time || 5}
        author={post.author || undefined}
      />

      <section className="container-custom py-10">
        <div className="flex gap-10">
          {/* Sidebar */}
          <BlogTOCSidebar content={post.content || ''} />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <BlogMarkdownRenderer content={post.content || ''} category={post.category || undefined} />
          </div>
        </div>
      </section>

      {/* Related posts */}
      {relatedPosts && relatedPosts.length > 0 && (
        <section className="container-custom pb-12">
          <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedPosts.map(p => (
              <BlogCard key={p.id} {...p} published_at={p.published_at || p.created_at} />
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="container-custom pb-16 max-w-lg mx-auto">
        <BlogLeadForm />
      </section>

      <Footer />
    </>
  );
}
