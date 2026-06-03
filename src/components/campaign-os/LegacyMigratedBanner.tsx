import { Link } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  /** Count of legacy script rows that have been migrated to a campaign. */
  migratedCount: number;
  /** Total legacy rows shown on this page. */
  totalCount: number;
  /**
   * Where the "Open in Campaign OS" button should send the user.
   * Admins/staff: `/admin/campaign-os/campaigns`. Clients/WL: omit and show informational copy only.
   */
  campaignOsHref?: string;
  /** Optional override for the surface label, e.g. "Client Dashboard". */
  surfaceLabel?: string;
}

/**
 * Read-only notice rendered on legacy script list pages once a tenant's legacy
 * `client_scripts` / `wl_client_scripts` rows have been pointed at a Campaign OS
 * campaign. Legacy data is preserved (reversible cutover); authoring now happens
 * in the new Script Builder.
 */
export function LegacyMigratedBanner({
  migratedCount,
  totalCount,
  campaignOsHref,
  surfaceLabel,
}: Props) {
  if (migratedCount === 0) return null;
  const partial = migratedCount < totalCount;

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <Info className="h-4 w-4" />
      <AlertTitle className="text-sm font-semibold">
        {partial
          ? `${migratedCount} of ${totalCount} legacy scripts migrated to Campaigns`
          : "Migrated to Campaigns"}
      </AlertTitle>
      <AlertDescription className="mt-1 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          {surfaceLabel ? `${surfaceLabel}: ` : ""}
          These scripts are now authored in the new Script Builder. Legacy entries remain visible here
          for reference and can be reversed from the campaign detail page.
        </span>
        {campaignOsHref && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to={campaignOsHref}>
              Open in Campaigns <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
