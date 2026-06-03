import { useIsMobile } from "@/hooks/use-mobile";
import { QrCode, Phone } from "lucide-react";

const INBOUND_DID = "+18008252587";
const QR_API = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`tel:${INBOUND_DID}`)}`;

interface DesktopQRCodeProps {
  className?: string;
}

export function DesktopQRCode({ className }: DesktopQRCodeProps) {
  const isMobile = useIsMobile();

  // Only show on desktop
  if (isMobile) return null;

  return (
    <div className={`flex flex-col items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm ${className || ""}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Phone className="w-4 h-4 text-primary" />
        Prefer to call from your phone?
      </div>
      <img
        src={QR_API}
        alt="Scan to call 1.800.825.2587"
        width={120}
        height={120}
        className="rounded-lg"
        loading="lazy"
      />
      <p className="text-xs text-muted-foreground text-center">
        Scan this QR code to call us directly
      </p>
    </div>
  );
}
