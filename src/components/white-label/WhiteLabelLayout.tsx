import { Outlet } from "react-router-dom";
import { WhiteLabelSidebar } from "./WhiteLabelSidebar";
import { WhiteLabelHeader } from "./WhiteLabelHeader";
import { AdminDashboardSwitcher } from "@/components/admin/AdminDashboardSwitcher";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";

export function WhiteLabelLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <WhiteLabelSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <WhiteLabelHeader />
        <main className="flex-1 p-6 lg:p-8">
          {children || <Outlet />}
        </main>
      </div>
      <AdminDashboardSwitcher />
      <FeedbackWidget />
    </div>
  );
}
