import { useState, useEffect } from "react";
import { FileText, CheckCircle, Clock, Download } from "lucide-react";
import jsPDF from "jspdf";
import { WhiteLabelLayout } from "@/components/white-label/WhiteLabelLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function WLAgreements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingAgreement, setViewingAgreement] = useState<any>(null);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: partner } = await supabase.from("white_label_partners").select("id").eq("user_id", user.id).maybeSingle();
      if (!partner) return;
      setPartnerId(partner.id);

      const { data } = await supabase.from("wl_terms_agreements").select("*")
        .eq("partner_id", partner.id).order("created_at", { ascending: false });
      setAgreements(data || []);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleSign = async (agreementId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("wl_terms_agreements").update({
        signed_at: new Date().toISOString(),
        signed_by: user.id,
      }).eq("id", agreementId);
      if (error) throw error;
      toast({ title: "Agreement Signed", description: "Thank you for signing the agreement." });
      fetchData();
    } catch (err) {
      console.error("Error signing agreement:", err);
      toast({ title: "Signing failed", description: "Your signature could not be saved. Please try again or contact support.", variant: "destructive" });
    }
  };

  const handleDownloadPDF = (agreement: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Agreement v${agreement.agreement_version}`, margin, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Version: ${agreement.agreement_version}`, margin, y);
    y += 7;
    doc.text(
      `Signed: ${agreement.signed_at ? format(new Date(agreement.signed_at), "MMMM d, yyyy") : "Not signed"}`,
      margin,
      y
    );
    y += 10;

    doc.setFontSize(10);
    const lines: string[] = doc.splitTextToSize(agreement.agreement_content || "", pageWidth - margin * 2);
    const lineHeight = 6;
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }

    doc.save(`agreement-${agreement.agreement_version}.pdf`);
  };

  const currentAgreement = agreements.find(a => a.is_current);
  const pastAgreements = agreements.filter(a => !a.is_current);

  return (
    <WhiteLabelLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Agreements</h1>
          <p className="text-muted-foreground mt-1">View and sign your partnership agreements</p>
        </div>

        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : agreements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="text-lg font-medium">No agreements yet</p>
              <p className="text-muted-foreground">Your partnership agreement will appear here once prepared by the admin team.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Current Agreement */}
            {currentAgreement && (
              <Card className="border-primary/20">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Current Agreement v{currentAgreement.agreement_version}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {currentAgreement.signed_at
                          ? `Signed on ${format(new Date(currentAgreement.signed_at), "MMMM d, yyyy")}`
                          : "Awaiting your signature"}
                      </CardDescription>
                    </div>
                    {currentAgreement.signed_at ? (
                      <Badge className="bg-cta/10 text-cta">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentAgreement.wholesale_pricing_snapshot && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium mb-2">Pricing Snapshot at Signing</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(currentAgreement.wholesale_pricing_snapshot as Record<string, any>).slice(0, 8).map(([key, val]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                            <span className="font-medium">{typeof val === "number" ? `$${val}` : String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setViewingAgreement(currentAgreement)}>
                      View Full Agreement
                    </Button>
                    {currentAgreement.signed_at && (
                      <Button variant="outline" onClick={() => handleDownloadPDF(currentAgreement)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                    {!currentAgreement.signed_at && (
                      <Button onClick={() => handleSign(currentAgreement.id)}>
                        Sign Agreement
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Past Agreements */}
            {pastAgreements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Past Agreements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pastAgreements.map(a => (
                      <div key={a.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">Version {a.agreement_version}</p>
                          <p className="text-sm text-muted-foreground">
                            {a.signed_at ? `Signed ${format(new Date(a.signed_at), "MMM d, yyyy")}` : "Not signed"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setViewingAgreement(a)}>View</Button>
                          {a.signed_at && (
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(a)}>
                              <Download className="w-4 h-4 mr-1" />
                              PDF
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* View Agreement Dialog */}
        <Dialog open={!!viewingAgreement} onOpenChange={() => setViewingAgreement(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agreement v{viewingAgreement?.agreement_version}</DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none mt-4">
              <div className="whitespace-pre-wrap text-sm">{viewingAgreement?.agreement_content}</div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </WhiteLabelLayout>
  );
}
