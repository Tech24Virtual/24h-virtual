import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { AdminDashboardSwitcher } from '@/components/admin/AdminDashboardSwitcher';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { OnboardingResumeNudge } from './OnboardingResumeNudge';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <Helmet>
        <title>Client Portal — 24H Virtual</title>
      </Helmet>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-heading">{title}</h1>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {children}
        </main>
      </div>
      <AdminDashboardSwitcher />
      <FeedbackWidget />
      {/* Dashboard-native onboarding resume nudge (NOT a public ExitIntentPopup).
          Auto-shows only for direct clients with an incomplete onboarding_checklist. */}
      <OnboardingResumeNudge />
    </div>
  );
}
