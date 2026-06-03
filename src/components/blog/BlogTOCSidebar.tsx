import { useState, useEffect } from 'react';
import { BlogCTACard } from './BlogCTACard';
import { BlogLeadForm } from './BlogLeadForm';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

interface BlogTOCSidebarProps {
  content: string;
}

export function BlogTOCSidebar({ content }: BlogTOCSidebarProps) {
  const [activeId, setActiveId] = useState('');
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);

  useEffect(() => {
    const headingRegex = /^(#{2,3})\s+(.+)$/gm;
    const items: TOCItem[] = [];
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      items.push({ id, text, level });
    }
    setTocItems(items);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -70% 0px' }
    );

    tocItems.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [tocItems]);

  if (tocItems.length === 0) return null;

  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="sticky top-24 space-y-6">
        {/* TOC */}
        <div className="p-4 rounded-xl border bg-card">
          <h4 className="font-bold text-sm mb-3 text-muted-foreground uppercase tracking-wide">In This Article</h4>
          <nav className="space-y-1">
            {tocItems.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`block text-sm py-1 transition-colors ${
                  item.level === 3 ? 'pl-4' : ''
                } ${
                  activeId === item.id
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.text}
              </a>
            ))}
          </nav>
        </div>

        {/* Sidebar CTA */}
        <BlogCTACard variant="sidebar" />

        {/* Newsletter */}
        <BlogLeadForm />
      </div>
    </aside>
  );
}
