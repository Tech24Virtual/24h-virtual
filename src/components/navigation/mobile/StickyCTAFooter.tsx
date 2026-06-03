import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StickyCTAFooterProps {
  onClose?: () => void;
}

export function StickyCTAFooter({ onClose }: StickyCTAFooterProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-border/60 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-2 shadow-[0_-8px_24px_-12px_hsl(var(--foreground)/0.1)]">
      <Button variant="cta" className="w-full h-11 text-sm font-semibold" asChild>
        <Link to="/get-started" onClick={onClose}>
          <Calendar className="h-4 w-4" />
          Book FREE Consultation
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="text-xs h-9" asChild>
          <Link to="/pricing" onClick={onClose}>See Pricing</Link>
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-9" asChild>
          <Link to="/demo" onClick={onClose}>Watch Demo</Link>
        </Button>
      </div>
    </div>
  );
}
