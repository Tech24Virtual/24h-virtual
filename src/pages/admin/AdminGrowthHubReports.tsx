import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { BarChart3, FileText, Search, TrendingUp, Download, Printer, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

export default function AdminGrowthHubReports() {
  const queryClient = useQueryClient();
  const monthOptions = getMonthOptions();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || "");

  const { data: report, isLoading: loadingReport } = useQuery({
    queryKey: ["admin-seo-report", selectedMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_seo_reports")
        .select("*")
        .eq("report_month", selectedMonth + "-01")
        .maybeSingle();
      return data;
    },
    enabled: !!selectedMonth,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-generate-seo-report", {
        body: { report_month: selectedMonth },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seo-report", selectedMonth] });
      toast({ title: "Report generated!", description: "Your SEO report is ready." });
    },
    onError: (e: Error) => {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    },
  });

  const reportData = report?.report_data as any;
  const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const downloadPDF = () => {
    if (!report || !reportData) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("24H Virtual - SEO Report", 20, 25);
    doc.setFontSize(12);
    doc.text(monthLabel, 20, 35);
    doc.setFontSize(14);
    doc.text("Performance Summary", 20, 50);
    doc.setFontSize(11);
    doc.text(`Posts Created: ${reportData.posts_created || 0}`, 25, 60);
    doc.text(`Posts Published: ${reportData.posts_published || 0}`, 25, 68);
    doc.text(`Keywords Tracked: ${reportData.keywords_tracked || 0}`, 25, 76);
    doc.text(`Keywords with Content: ${reportData.keywords_with_content || 0}`, 25, 84);
    doc.text(`Coverage Rate: ${reportData.coverage_rate || 0}%`, 25, 92);
    if (report.narrative) {
      doc.setFontSize(14);
      doc.text("Executive Summary", 20, 108);
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(report.narrative, 170);
      doc.text(lines, 20, 118);
    }
    doc.save(`24H-Virtual-SEO-Report-${selectedMonth}.pdf`);
  };

  const statCards = [
    { label: "Posts Created", value: reportData?.posts_created ?? "—", icon: FileText },
    { label: "Posts Published", value: reportData?.posts_published ?? "—", icon: TrendingUp },
    { label: "Keywords Tracked", value: reportData?.keywords_tracked ?? "—", icon: Search },
    { label: "Coverage Rate", value: reportData ? `${reportData.coverage_rate}%` : "—", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/growth-hub"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-heading">Monthly SEO Report</h1>
          <p className="text-muted-foreground text-sm">Generate content marketing reports.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Select Month</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            {generateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><BarChart3 className="w-4 h-4 mr-2" /> Generate Report</>
            )}
          </Button>
        </CardContent>
      </Card>

      {report && reportData && (
        <>
          <div className="grid sm:grid-cols-4 gap-4">
            {statCards.map(s => (
              <Card key={s.label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {report.narrative && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Executive Summary</CardTitle>
                <CardDescription>{monthLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.narrative}</p>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-3">
            <Button onClick={downloadPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
          </div>
        </>
      )}

      {loadingReport && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
