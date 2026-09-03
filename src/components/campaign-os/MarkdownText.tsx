import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/** Renders short markdown content (FAQ answers, policy bodies) — bold,
 * lists, links — without the heavy per-element overrides BlogMarkdownRenderer
 * uses for full articles. */
export function MarkdownText({ children, className }: MarkdownTextProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
