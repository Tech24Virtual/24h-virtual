import { StaffLayout } from "@/components/staff/StaffLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, FileText, MessageSquareWarning, GraduationCap } from "lucide-react";

/**
 * Agent Campaign OS placeholder (Phase 3).
 *
 * Real data wiring lands in Phase 5 (Agent runtime surfaces). This stub keeps
 * the route and nav entry live so no module is orphaned per the
 * Campaign OS dashboard wiring governance.
 */
export default function AgentCampaigns() {
  return (
    <StaffLayout role="agent">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">My Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Assigned departments, live scripts, and quick FAQ/policy access.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                <CardTitle>Campaigns</CardTitle>
              </div>
              <Badge variant="secondary">Coming in Phase 5</Badge>
            </div>
            <CardDescription>
              Your assigned campaigns will appear here once Phase 5 wiring ships.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" /> Live Script Access
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quick links into the active script for each campaign you handle.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquareWarning className="h-4 w-4" /> FAQ &amp; Policy Lookup
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Effective FAQ and policy snippets for the call you are on right now.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GraduationCap className="h-4 w-4" /> Training Status
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Per campaign certification and acknowledgement state.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Megaphone className="h-4 w-4" /> Assigned Departments
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  The departments you are currently scheduled to handle.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
