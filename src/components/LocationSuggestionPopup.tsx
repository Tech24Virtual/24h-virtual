import { useState, useEffect } from "react";
import { MapPin, X, ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getIndustryBySlug } from "@/data/industries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LocationSuggestionPopup() {
  const { city, isLoading, isDismissed, dismiss } = useGeoLocation();
  const location = useLocation();
  const [showPopup, setShowPopup] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  
  // Scroll detection - trigger at 30% scroll with 2s delay
  useEffect(() => {
    if (isLoading || isDismissed || !city || hasTriggered || location.pathname.startsWith("/locations")) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent >= 30 && !hasTriggered) {
        setHasTriggered(true);
        timeoutId = setTimeout(() => {
          setShowPopup(true);
        }, 2000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading, isDismissed, city, hasTriggered, location.pathname]);

  // Don't render if conditions aren't met
  if (isLoading || isDismissed || !city) {
    return null;
  }
  
  // Determine the target link based on current page
  let targetUrl = `/locations`;
  let industryName = "services";
  
  // Check if user is on an industry page
  const industryMatch = location.pathname.match(/^\/industries\/([^/]+)/);
  if (industryMatch) {
    const industrySlug = industryMatch[1];
    const industry = getIndustryBySlug(industrySlug);
    if (industry) {
      targetUrl = `/locations/${city.slug}/${industry.slug}`;
      industryName = industry.shortName;
    }
  }
  
  const cityDisplay = `${city.name}, ${city.stateCode}`;

  const handleDismiss = () => {
    setShowPopup(false);
    dismiss();
  };

  const handleViewServices = () => {
    setShowPopup(false);
    dismiss();
  };
  
  return (
    <Dialog open={showPopup} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-heading">
            Services Near You
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-6 py-4">
          <p className="text-muted-foreground">
            We detected you're browsing from
          </p>
          
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent border border-border">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-lg font-semibold text-heading">{cityDisplay}</span>
          </div>
          
          <p className="text-muted-foreground">
            View local virtual receptionist {industryName !== "services" ? industryName : ""} services tailored for your area.
          </p>
          
          <div className="space-y-3 pt-2">
            <Button 
              variant="cta" 
              className="w-full h-12 text-base rounded-full" 
              asChild
              onClick={handleViewServices}
            >
              <Link to={targetUrl}>
                View Services in {city.name}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            
            <button
              onClick={handleDismiss}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
