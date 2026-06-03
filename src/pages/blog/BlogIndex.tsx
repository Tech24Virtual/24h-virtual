import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { SEO } from '@/components/SEO';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogLeadForm } from '@/components/blog/BlogLeadForm';
import { BlogCTACard } from '@/components/blog/BlogCTACard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const CATEGORIES = ['All', 'Industry Insights', 'Tips & Guides', 'Case Studies', 'Comparisons'];
const PER_PAGE = 6;

export default function BlogIndex() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts', category, search, page],
    queryFn: async () => {
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (category !== 'All') query = query.eq('category', category);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, error } = await query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
      if (error) throw error;
      return data;
    },
  });

  const featuredPost = page === 1 && !search ? posts?.[0] : null;
  const gridPosts = featuredPost ? posts?.slice(1) : posts;

  return (
    <>
      <SEO
        title="Blog: Insights and Resources for Growing Your Business"
        description="Expert tips on virtual receptionist services, call management, customer service, and business growth. Updated weekly."
        canonical="/blog"
      />
      <Navigation />

      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">Insights & Resources</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Expert tips on call management, customer service, and growing your business with virtual receptionist solutions.
          </p>
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      <section className="container-custom py-8">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              className="rounded-full"
              onClick={() => { setCategory(cat); setPage(1); }}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-10">
          <div>
            {isLoading && <p className="text-muted-foreground py-12 text-center">Loading posts...</p>}

            {!isLoading && (!posts || posts.length === 0) && (
              <p className="text-muted-foreground py-12 text-center">No posts found. Check back soon!</p>
            )}

            {/* Featured post */}
            {featuredPost && (
              <div className="mb-8">
                <BlogCard {...featuredPost} published_at={featuredPost.published_at || featuredPost.created_at} featured />
              </div>
            )}

            {/* Grid */}
            <div className="grid sm:grid-cols-2 gap-6">
              {gridPosts?.map(post => (
                <BlogCard key={post.id} {...post} published_at={post.published_at || post.created_at} />
              ))}
            </div>

            {/* Pagination */}
            {posts && posts.length === PER_PAGE && (
              <div className="flex justify-center gap-2 mt-10">
                {page > 1 && <Button variant="outline" onClick={() => setPage(p => p - 1)}>Previous</Button>}
                <Button variant="outline" onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-6">
            <BlogCTACard variant="sidebar" />
            <BlogLeadForm />
          </aside>
        </div>
      </section>

      <Footer />
    </>
  );
}
