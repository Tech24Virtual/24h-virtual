import { useState } from "react";
import { Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generatePlaybookPDF } from "@/lib/playbook-pdf";

export function PlaybookCTA() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await supabase.rpc("submit_lead" as any, {
        p_name: "Playbook Download",
        p_email: email,
        p_source: "lead_magnet_playbook",
        p_notes: "Downloaded 7-Day Campaign Launch Playbook",
      });
      const doc = generatePlaybookPDF();
      doc.save("7-Day-Campaign-Launch-Playbook.pdf");
      setDone(true);
      toast.success("Your playbook is downloading!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium text-primary">✓ Playbook downloaded!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <Rocket className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-heading text-sm">Free Download</h4>
        </div>
        <p className="text-sm text-heading font-medium mb-1">7-Day Campaign Launch Playbook</p>
        <p className="text-xs text-muted-foreground mb-4">
          Go from script to live calls in one week.
        </p>
        <form onSubmit={handleDownload} className="flex gap-2">
          <Input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="text-sm h-9"
          />
          <Button type="submit" size="sm" variant="cta" disabled={loading} className="flex-shrink-0">
            {loading ? "..." : <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
