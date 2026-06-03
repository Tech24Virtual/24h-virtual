import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Building2, FileText, Eye } from "lucide-react";

/**
 * White Label Partner — Campaign OS placeholder (Phase 3).
 *
 * Real data wiring lands in Phase 7 (WL Partner Campaign OS surfaces).
 * Strictly partner-scoped via tenantWhere/resolveTenant. Never queries
 * other partners' tenants or 24H direct-client data.
 */
export default function WLCampaignOs() {
  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Active accounts and their approved campaigns. Read-through view; authoring lands in a
            future phase.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle>Campaign Operations</CardTitle>
              </div>
              <Badge variant="secondary">Coming in Phase 7</Badge>
            </div>
            <CardDescription>
              Partner-scoped campaign operations will surface here. Only your tenant data is ever shown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4" /> Clients &amp; Departments
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Roll up of your clients, their departments, and current campaign status.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" /> Effective Configuration
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Resolved fields, FAQs, policies, and Five9 mappings for each department.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Eye className="h-4 w-4" /> Branded Preview
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  See exactly what your end clients will see when Phase 8 enables it.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Megaphone className="h-4 w-4" /> Change &amp; Approval
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submit and approve changes within your tenant boundary.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </WhiteLabelLayout>
  );
}
