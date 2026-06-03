import { Link } from 'react-router-dom';
import { Clock, ArrowRight, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface BlogPostHeroProps {
  title: string;
  excerpt?: string;
  category: string;
  reading_time: number;
  author?: string;
}

export function BlogPostHero({ title, excerpt, category, reading_time, author }: BlogPostHeroProps) {
  return (
    <section className="relative">
      <div className="container-custom py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground truncate">{title}</span>
        </nav>

        <Badge variant="secondary" className="mb-4">{category}</Badge>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-heading mb-4 max-w-4xl">{title}</h1>
        {excerpt && <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-3xl">{excerpt}</p>}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          <span>By {author || '24H Virtual'}</span>
          <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{reading_time} min read</span>
        </div>

        <Button asChild variant="cta" className="rounded-full">
          <Link to="/get-started">
            Book Your FREE Consultation
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
