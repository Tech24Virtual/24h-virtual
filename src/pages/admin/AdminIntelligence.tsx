/**
 * Phase 9 — Reporting / Intelligence Layer
 * Phase 10 — Forecasting / Predictive Ops (Forecasts tab)
 *
 * Admin-only analytical surface. Distinct from /admin/mission-control:
 *   - Mission Control = operational readiness + actions (now)
 *   - Intelligence    = trends, executive summary, decision support (over time)
 *   - Forecasts       = explainable, advisory short-horizon projections (Phase 10)
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, BarChart3 } from "lucide-react";
import { ExecutiveSummaryGrid } from "@/components/admin/intelligence/ExecutiveSummaryGrid";
import { EventVolumeChart } from "@/components/admin/intelligence/EventVolumeChart";
import { DomainAnalyticsPanel } from "@/components/admin/intelligence/DomainAnalyticsPanel";
import { ForecastingPanel } from "@/components/admin/intelligence/ForecastingPanel";
import ExportsPanel from "@/components/admin/intelligence/ExportsPanel";
import GrowthIntelligencePanel from "@/components/admin/intelligence/GrowthIntelligencePanel";
import CommercialIntelligencePanel from "@/components/admin/intelligence/CommercialIntelligencePanel";
import ActivationFunnelPanel from "@/components/admin/intelligence/ActivationFunnelPanel";
import SuccessIntelligencePanel from "@/components/admin/intelligence/SuccessIntelligencePanel";
import SubscriptionIntelligencePanel from "@/components/admin/intelligence/SubscriptionIntelligencePanel";
import ExecutiveFinancePanel from "@/components/admin/intelligence/ExecutiveFinancePanel";
import UnitEconomicsPanel from "@/components/admin/intelligence/UnitEconomicsPanel";
import WLEconomicsPanel from "@/components/admin/intelligence/WLEconomicsPanel";
import ScenarioModelingPanel from "@/components/admin/intelligence/ScenarioModelingPanel";
import BoardPackPanel from "@/components/admin/intelligence/BoardPackPanel";
import PricingLabPanel from "@/components/admin/intelligence/PricingLabPanel";
import ExperimentOpsPanel from "@/components/admin/intelligence/ExperimentOpsPanel";
import OffersOpsPanel from "@/components/admin/intelligence/OffersOpsPanel";
import PartnerSuccessOpsPanel from "@/components/admin/intelligence/PartnerSuccessOpsPanel";
import DirectSuccessOpsPanel from "@/components/admin/intelligence/DirectSuccessOpsPanel";
import PlaybookAutomationPanel from "@/components/admin/intelligence/PlaybookAutomationPanel";
import SuccessCommsPanel from "@/components/admin/intelligence/SuccessCommsPanel";
import RenewalDealsOpsPanel from "@/components/admin/intelligence/RenewalDealsOpsPanel";
import CommercialApprovalsPanel from "@/components/admin/intelligence/CommercialApprovalsPanel";
import { RevenueForecastPanel } from "@/components/admin/intelligence/RevenueForecastPanel";
import { ForecastCalibrationPanel } from "@/components/admin/intelligence/ForecastCalibrationPanel";
import { CapacityPlanningPanel } from "@/components/admin/intelligence/CapacityPlanningPanel";
import RevopsSnapshotsPanel from "@/components/admin/intelligence/RevopsSnapshotsPanel";
// QAReadinessPanel relocated to /admin/settings/product-testing (see QA tab below).
import {
  fetchExecutiveSummary,
  buildExecutiveKpis,
  type ExecutiveSummary,
  type KpiTile,
} from "@/lib/governance/intelligence";

const intelligenceSections = [
  { value: "reporting", label: "Reporting" },
  { value: "executive", label: "Executive" },
  { value: "growth", label: "Growth" },
  { value: "commercial", label: "Commercial" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "economics", label: "Economics" },
  { value: "wl-economics", label: "WL Economics" },
  { value: "partner-success", label: "Partner Success" },
  { value: "direct-success", label: "Customer Success" },
  { value: "playbooks", label: "Playbooks" },
  { value: "success-comms", label: "Comms & Renewals" },
  { value: "deals", label: "Deals" },
  { value: "approvals", label: "Approvals" },
  { value: "scenarios", label: "Scenarios" },
  { value: "board-pack", label: "Board Pack" },
  { value: "pricing-lab", label: "Pricing Lab" },
  { value: "experiment-ops", label: "Experiment Ops" },
  { value: "offers", label: "Offers" },
  { value: "activation", label: "Activation" },
  { value: "success", label: "Success" },
  { value: "forecasts", label: "Forecasts" },
  { value: "revenue-forecast", label: "Revenue Forecast" },
  { value: "forecast-calibration", label: "Calibration" },
  { value: "planning", label: "Planning" },
  { value: "period-close", label: "Period Close" },
  { value: "qa-readiness", label: "QA Readiness" },
  { value: "exports", label: "Exports" },
] as const;

type IntelligenceSection = (typeof intelligenceSections)[number]["value"];

export default function AdminIntelligence() {
  const [summary, setSummary] = useState<ExecutiveSummary | null | undefined>(undefined);
  const [selectedSection, setSelectedSection] = useState<IntelligenceSection>("reporting");

  useEffect(() => {
    let cancelled = false;
    fetchExecutiveSummary()
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, []);

  const kpis: KpiTile[] = summary ? buildExecutiveKpis(summary) : [];
  const activeSectionLabel =
    intelligenceSections.find((section) => section.value === selectedSection)?.label ?? "Reporting";

  const renderActiveSection = () => {
    switch (selectedSection) {
      case "executive":
        return <ExecutiveFinancePanel />;
      case "growth":
        return <GrowthIntelligencePanel />;
      case "commercial":
        return <CommercialIntelligencePanel />;
      case "subscriptions":
        return <SubscriptionIntelligencePanel />;
      case "economics":
        return <UnitEconomicsPanel />;
      case "wl-economics":
        return <WLEconomicsPanel />;
      case "partner-success":
        return <PartnerSuccessOpsPanel />;
      case "direct-success":
        return <DirectSuccessOpsPanel />;
      case "playbooks":
        return <PlaybookAutomationPanel />;
      case "success-comms":
        return <SuccessCommsPanel />;
      case "deals":
        return <RenewalDealsOpsPanel />;
      case "approvals":
        return <CommercialApprovalsPanel />;
      case "scenarios":
        return <ScenarioModelingPanel />;
      case "board-pack":
        return <BoardPackPanel />;
      case "pricing-lab":
        return <PricingLabPanel />;
      case "experiment-ops":
        return <ExperimentOpsPanel />;
      case "offers":
        return <OffersOpsPanel />;
      case "activation":
        return <ActivationFunnelPanel />;
      case "success":
        return <SuccessIntelligencePanel />;
      case "forecasts":
        return <ForecastingPanel />;
      case "revenue-forecast":
        return <RevenueForecastPanel />;
      case "forecast-calibration":
        return <ForecastCalibrationPanel />;
      case "planning":
        return <CapacityPlanningPanel />;
      case "period-close":
        return <RevopsSnapshotsPanel />;
      case "qa-readiness":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">QA Readiness & Test Harness moved</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                The QA Readiness panel, Seed QA State action, and the Test Harness now live in their
                canonical home under <strong>Admin → System → Product Testing</strong>.
              </p>
              <a
                href="/admin/settings/product-testing#qa-readiness"
                className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                Open QA Readiness in Product Testing
              </a>
            </CardContent>
          </Card>
        );
      case "exports":
        return <ExportsPanel />;
      case "reporting":
      default:
        return (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {summary === undefined ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <ExecutiveSummaryGrid tiles={kpis} />
                )}
              </CardContent>
            </Card>

            <EventVolumeChart />

            <div>
              <h2 className="text-lg font-semibold mb-3">Domain Analytics</h2>
              <DomainAnalyticsPanel />
            </div>
          </>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Intelligence
          </h1>
          <p className="text-muted-foreground">
            Time-aware reporting, growth intelligence, and short-horizon forecasts across Growth, Revenue, Delivery, AI Voice, White Label, and Automation. Read-only · admin scope.
          </p>
        </div>
        {summary?.computed_at && (
          <p className="text-xs text-muted-foreground hidden md:block">
            Computed {new Date(summary.computed_at).toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:w-80">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Intelligence View
        </span>
        <Select
          value={selectedSection}
          onValueChange={(value) => setSelectedSection(value as IntelligenceSection)}
        >
          <SelectTrigger aria-label="Select intelligence view">
            <SelectValue>{activeSectionLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {intelligenceSections.map((section) => (
              <SelectItem key={section.value} value={section.value}>
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">{renderActiveSection()}</div>
    </div>
  );
}
