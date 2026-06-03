import { ReactNode } from 'react';
import { WLPortalSidebar } from './WLPortalSidebar';
import { WLPortalHeader } from './WLPortalHeader';
import { useWLPortal } from '@/contexts/WLPortalContext';
import { AdminDashboardSwitcher } from '@/components/admin/AdminDashboardSwitcher';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';

interface WLPortalLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function WLPortalLayout({ children, title, description }: WLPortalLayoutProps) {
  const { branding } = useWLPortal();
  const headingFont = branding?.font_heading;

  return (
    <div className="min-h-screen bg-background flex" style={branding?.font_body ? { fontFamily: `'${branding.font_body}', sans-serif` } : undefined}>
      <WLPortalSidebar />
      <div className="flex-1 flex flex-col">
        <WLPortalHeader />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1
              className="text-2xl lg:text-3xl font-bold text-heading"
              style={headingFont ? { fontFamily: `'${headingFont}', sans-serif` } : undefined}
            >
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {children}
        </main>
      </div>
      <AdminDashboardSwitcher />
      <FeedbackWidget />
    </div>
  );
}
