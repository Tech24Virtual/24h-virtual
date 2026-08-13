import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CoverageDays = "mf" | "ss" | "247";
type CoverageHours = "business" | "afterhours" | "both";
type CoverageType = "fulltime" | "overflow";

interface ClientCoverageCardProps {
  wlClientId?: string;
  leadId?: string;
  partnerId?: string;
  readOnly?: boolean;
}

interface CoverageFormState {
  coverage_days: CoverageDays;
  coverage_hours: CoverageHours;
  coverage_type: CoverageType;
  start_time: string;
  end_time: string;
  timezone: string;
}

const TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Edmonton",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
];

const daysLabels: Record<CoverageDays, string> = { mf: "M-F Only", ss: "S-S Only", "247": "24/7" };
const hoursLabels: Record<CoverageHours, string> = { business: "Business Hours", afterhours: "After Hours", both: "Both" };
const typeLabels: Record<CoverageType, string> = { fulltime: "Full Time", overflow: "Overflow" };

const emptyForm: CoverageFormState = {
  coverage_days: "mf",
  coverage_hours: "business",
  coverage_type: "fulltime",
  start_time: "09:00",
  end_time: "17:00",
  timezone: "America/Toronto",
};

export function ClientCoverageCard({ wlClientId, leadId, partnerId, readOnly }: ClientCoverageCardProps) {
  const [form, setForm] = useState<CoverageFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCoverage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wlClientId, leadId]);

  const fetchCoverage = async () => {
    if (!wlClientId && !leadId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      let query = supabase.from("client_coverage").select("*");
      query = wlClientId ? query.eq("wl_client_id", wlClientId) : query.eq("lead_id", leadId!);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (data) {
        setForm({
          coverage_days: data.coverage_days as CoverageDays,
          coverage_hours: data.coverage_hours as CoverageHours,
          coverage_type: data.coverage_type as CoverageType,
          start_time: data.start_time ?? "09:00",
          end_time: data.end_time ?? "17:00",
          timezone: data.timezone ?? "America/Toronto",
        });
      } else {
        setForm(emptyForm);
      }
    } catch (error) {
      console.error("Error fetching coverage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!wlClientId && !leadId) return;
    setIsSaving(true);
    try {
      const is247 = form.coverage_days === "247";
      const payload = {
        wl_client_id: wlClientId ?? null,
        lead_id: leadId ?? null,
        partner_id: partnerId ?? null,
        coverage_days: form.coverage_days,
        coverage_hours: form.coverage_hours,
        coverage_type: form.coverage_type,
        start_time: is247 ? null : form.start_time,
        end_time: is247 ? null : form.end_time,
        timezone: form.timezone,
      };
      const onConflict = wlClientId ? "wl_client_id" : "lead_id";
      const { error } = await supabase.from("client_coverage").upsert(payload, { onConflict });
      if (error) throw error;
      toast.success("Coverage saved");
      fetchCoverage();
    } catch (error) {
      console.error("Error saving coverage:", error);
      toast.error("Failed to save coverage", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSaving(false);
    }
  };

  if (!wlClientId && !leadId) return null;

  const is247 = form.coverage_days === "247";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : readOnly ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Coverage Days</span>
              <Badge variant="secondary">{daysLabels[form.coverage_days]}</Badge>
            </div>
            {!is247 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Coverage Hours</span>
                <Badge variant="secondary">{hoursLabels[form.coverage_hours]}</Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Coverage Type</span>
              <Badge variant="secondary">{typeLabels[form.coverage_type]}</Badge>
            </div>
            {!is247 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Hours</span>
                  <span className="font-medium">{form.start_time} – {form.end_time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timezone</span>
                  <span className="font-medium">{form.timezone}</span>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Coverage Days</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={form.coverage_days}
                onValueChange={(v) => v && setForm((p) => ({ ...p, coverage_days: v as CoverageDays }))}
              >
                <ToggleGroupItem value="mf">M-F Only</ToggleGroupItem>
                <ToggleGroupItem value="ss">S-S Only</ToggleGroupItem>
                <ToggleGroupItem value="247">24/7</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {!is247 && (
              <div className="space-y-2">
                <Label>Coverage Hours</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={form.coverage_hours}
                  onValueChange={(v) => v && setForm((p) => ({ ...p, coverage_hours: v as CoverageHours }))}
                >
                  <ToggleGroupItem value="business">Business Hours</ToggleGroupItem>
                  <ToggleGroupItem value="afterhours">After Hours</ToggleGroupItem>
                  <ToggleGroupItem value="both">Both</ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label>Coverage Type</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={form.coverage_type}
                onValueChange={(v) => v && setForm((p) => ({ ...p, coverage_type: v as CoverageType }))}
              >
                <ToggleGroupItem value="fulltime">Full Time</ToggleGroupItem>
                <ToggleGroupItem value="overflow">Overflow</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {!is247 && (
              <div className="space-y-2">
                <Label>Time &amp; Timezone</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                  />
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                  />
                </div>
                <Select value={form.timezone} onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Coverage"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
