import ReactMarkdown from 'react-markdown';
import { BlogCTACard } from './BlogCTACard';

interface BlogMarkdownRendererProps {
  content: string;
  category?: string;
}

export function BlogMarkdownRenderer({ content, category }: BlogMarkdownRendererProps) {
  // Split content by H2 to inject CTAs at strategic points
  const sections = content.split(/(?=^## )/m);
  const totalSections = sections.length;
  const inlineCTAIndex = Math.min(2, Math.floor(totalSections * 0.25)); // After ~25%
  const midCTAIndex = Math.min(totalSections - 2, Math.floor(totalSections * 0.55)); // After ~55%

  return (
    <div className="max-w-[800px]">
      {sections.map((section, i) => (
        <div key={i}>
          <ReactMarkdown
            components={{
              h2: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return <h2 id={id} className="text-2xl md:text-3xl font-bold font-heading mt-14 mb-6 scroll-mt-24">{children}</h2>;
              },
              h3: ({ children }) => {
                const text = String(children);
                const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return <h3 id={id} className="text-xl font-bold font-heading mt-10 mb-4 scroll-mt-24">{children}</h3>;
              },
              p: ({ children }) => <p className="text-base md:text-lg leading-relaxed mb-6">{children}</p>,
              ul: ({ children }) => <ul className="space-y-3 mb-6 list-none">{children}</ul>,
              ol: ({ children }) => <ol className="space-y-3 mb-6 list-decimal list-inside">{children}</ol>,
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-base md:text-lg leading-relaxed">
                  <span className="text-primary mt-1.5 shrink-0">✓</span>
                  <span>{children}</span>
                </li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="pl-6 border-l-4 border-primary/30 italic text-lg text-muted-foreground my-8">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => {
                const isExternal = href?.startsWith('http');
                return (
                  <a
                    href={href}
                    className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                    {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {children}
                  </a>
                );
              },
              img: () => null,
              table: ({ children }) => (
                <div className="overflow-x-auto my-8">
                  <table className="w-full border-collapse border border-border rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => <th className="border border-border bg-muted px-4 py-2 text-left font-semibold text-sm">{children}</th>,
              td: ({ children }) => <td className="border border-border px-4 py-2 text-sm">{children}</td>,
              strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
              code: ({ children, className }) => {
                if (className) {
                  return (
                    <pre className="bg-muted rounded-lg p-4 overflow-auto my-8 text-sm font-mono">
                      <code>{children}</code>
                    </pre>
                  );
                }
                return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
              },
              hr: () => <hr className="my-10 border-border" />,
            }}
          >
            {section}
          </ReactMarkdown>

          {/* Inject CTAs at strategic points */}
          {i === inlineCTAIndex && <BlogCTACard variant="inline" category={category} />}
          {i === midCTAIndex && <BlogCTACard variant="mid-article" category={category} />}
        </div>
      ))}

      {/* Pre-footer CTA */}
      <BlogCTACard variant="pre-footer" category={category} />
    </div>
  );
}
