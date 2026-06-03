import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  featured_image_url?: string;
  published_at: string;
  reading_time: number;
  featured?: boolean;
}

export function BlogCard({ slug, title, excerpt, category, reading_time, featured }: BlogCardProps) {
  if (featured) {
    return (
      <Link to={`/blog/${slug}`} className="group block">
        <div className="bg-card rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow p-6 md:p-8">
          <Badge variant="secondary" className="w-fit mb-3">{category}</Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">{title}</h2>
          <p className="text-muted-foreground mb-4 line-clamp-3">{excerpt}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{reading_time} min read</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${slug}`} className="group block bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        <Badge variant="secondary" className="mb-2">{category}</Badge>
        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{excerpt}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{reading_time} min read</span>
          <span className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">Read more <ArrowRight className="w-3 h-3" /></span>
        </div>
      </div>
    </Link>
  );
}
