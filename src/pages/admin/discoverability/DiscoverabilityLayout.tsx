import { Outlet } from "react-router-dom";
import { DiscoverabilitySidebar } from "@/components/admin/DiscoverabilitySidebar";
import { SEO } from "@/components/SEO";

export default function DiscoverabilityLayout() {
  return (
    <>
      <SEO
        title="Discoverability Engine | 24H Virtual Admin"
        description="Superadmin content operations for SEO, AEO, and GEO discoverability."
        noindex
      />
      <div>
        <DiscoverabilitySidebar />
        <Outlet />
      </div>
    </>
  );
}
