import { useState, useEffect, useRef } from "react";
import { Phone } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { WebCallbackWidget } from "@/components/callback/WebCallbackWidget";
 
 const EXCLUDED_ROUTES = [
   "/login",
   "/signup",
   "/admin",
   "/client-dashboard",
   "/affiliate-dashboard",
   "/hr-portal",
   "/get-started",
   "/call-advisor",
   "/white-label-dashboard",
   "/staff",
 ];
 
export function StickyMobileCTA() {
    const [isVisible, setIsVisible] = useState(false);
    const [bottomOffset, setBottomOffset] = useState(0);
    const [callbackOpen, setCallbackOpen] = useState(false);
   const lastScrollY = useRef(0);
   const location = useLocation();
   const isMobile = useIsMobile();
 
   const isExcludedRoute = EXCLUDED_ROUTES.some((route) =>
     location.pathname.startsWith(route)
   );
 
   useEffect(() => {
     // Only show on mobile
     if (!isMobile || isExcludedRoute) {
       setIsVisible(false);
       return;
     }
 
     let rafId: number | null = null;
 
     const handleScroll = () => {
       if (rafId) return;
 
       rafId = requestAnimationFrame(() => {
         const scrollY = window.scrollY;
         const heroHeight = 500;
 
         // Show after scrolling past hero
         if (scrollY > heroHeight) {
           setIsVisible(true);
         } else {
           setIsVisible(false);
         }
 
         // Footer boundary detection
         const footer = document.querySelector("footer");
         if (footer) {
           const footerRect = footer.getBoundingClientRect();
           const viewportHeight = window.innerHeight;
           if (footerRect.top < viewportHeight) {
             setBottomOffset(Math.max(0, viewportHeight - footerRect.top));
           } else {
             setBottomOffset(0);
           }
         }
 
         lastScrollY.current = scrollY;
         rafId = null;
       });
     };
 
     window.addEventListener("scroll", handleScroll, { passive: true });
     handleScroll(); // Initial check
 
     return () => {
       window.removeEventListener("scroll", handleScroll);
       if (rafId) cancelAnimationFrame(rafId);
     };
   }, [isMobile, isExcludedRoute]);
 
   if (!isMobile || isExcludedRoute) return null;
 
    return (
      <>
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed left-0 right-0 z-50 px-3 pb-3"
              style={{ bottom: bottomOffset }}
            >
              <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-background/95 p-2 shadow-elevated backdrop-blur-xl">
                {/* Callback button */}
                <button
                  onClick={() => setCallbackOpen(true)}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  aria-label="Request a callback"
                >
                  <Phone className="h-5 w-5" />
                </button>

                {/* Primary CTA */}
                <Button
                  asChild
                  variant="cta"
                  className="h-12 flex-1 text-base font-semibold"
                >
                  <Link to="/get-started">Book Your FREE Consultation</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <WebCallbackWidget open={callbackOpen} onOpenChange={setCallbackOpen} />
      </>
    );
  }