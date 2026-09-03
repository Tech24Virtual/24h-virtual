 import { useState, useEffect, useRef } from "react";
 import { Lightbulb, X, ArrowRight } from "lucide-react";
 import { Link, useLocation } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { motion, AnimatePresence } from "framer-motion";
 import { useIsMobile } from "@/hooks/use-mobile";
 
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
   "/portal",
   "/c/",
   "/p/",
 ];
 
 const STORAGE_KEY = "floating_cta_dismissed";
 const COOLDOWN_HOURS = 24;
 
 export function FloatingCTA() {
   const [isVisible, setIsVisible] = useState(false);
   const [isExpanded, setIsExpanded] = useState(false);
   const [isDismissed, setIsDismissed] = useState(false);
   const [bottomOffset, setBottomOffset] = useState(168); // Stack above search + scroll-to-top
   const lastScrollY = useRef(0);
   const location = useLocation();
   const isMobile = useIsMobile();
 
   const isExcludedRoute = EXCLUDED_ROUTES.some((route) =>
     location.pathname.startsWith(route)
   );
 
   // Check cooldown on mount
   useEffect(() => {
     const dismissedAt = localStorage.getItem(STORAGE_KEY);
     if (dismissedAt) {
       const hoursSinceDismissed =
         (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
       if (hoursSinceDismissed < COOLDOWN_HOURS) {
         setIsDismissed(true);
       }
     }
   }, []);
 
   useEffect(() => {
     // Only show on desktop
     if (isMobile || isExcludedRoute || isDismissed) {
       setIsVisible(false);
       return;
     }
 
     let rafId: number | null = null;
 
     const handleScroll = () => {
       if (rafId) return;
 
       rafId = requestAnimationFrame(() => {
         const scrollY = window.scrollY;
         const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
         const scrollPercentage = documentHeight > 0 ? (scrollY / documentHeight) * 100 : 0;
         const scrollDelta = scrollY - lastScrollY.current;
         const isScrollingUp = scrollDelta < -5;
 
         // Show after 800px scroll and not scrolling up
         if (scrollY > 800 && scrollPercentage >= 30 && !isScrollingUp) {
           setIsVisible(true);
         } else if (isScrollingUp || scrollPercentage < 25) {
           setIsVisible(false);
         }
 
         // Footer boundary detection - stack above other floating elements
         const footer = document.querySelector("footer");
         const baseOffset = 168; // 24px + 72px (scroll-to-top) + 72px (search)
         if (footer) {
           const footerRect = footer.getBoundingClientRect();
           const viewportHeight = window.innerHeight;
           if (footerRect.top < viewportHeight) {
             setBottomOffset(Math.max(baseOffset, viewportHeight - footerRect.top + 24));
           } else {
             setBottomOffset(baseOffset);
           }
         }
 
         lastScrollY.current = scrollY;
         rafId = null;
       });
     };
 
     window.addEventListener("scroll", handleScroll, { passive: true });
     handleScroll();
 
     return () => {
       window.removeEventListener("scroll", handleScroll);
       if (rafId) cancelAnimationFrame(rafId);
     };
   }, [isMobile, isExcludedRoute, isDismissed]);
 
   const handleDismiss = () => {
     setIsExpanded(false);
     setIsDismissed(true);
     localStorage.setItem(STORAGE_KEY, Date.now().toString());
   };
 
   if (isMobile || isExcludedRoute || isDismissed) return null;
 
   return (
     <AnimatePresence>
       {isVisible && (
         <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.3 }}
           className="fixed left-6 z-40"
           style={{ bottom: bottomOffset }}
         >
           <AnimatePresence mode="wait">
             {isExpanded ? (
               <motion.div
                 key="expanded"
                 initial={{ opacity: 0, scale: 0.9, x: -10 }}
                 animate={{ opacity: 1, scale: 1, x: 0 }}
                 exit={{ opacity: 0, scale: 0.9, x: -10 }}
                 transition={{ duration: 0.2 }}
                 className="relative w-64 rounded-2xl border border-border/50 bg-background/95 p-4 shadow-elevated backdrop-blur-xl"
               >
                 {/* Dismiss button */}
                 <button
                   onClick={handleDismiss}
                   className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                   aria-label="Dismiss"
                 >
                   <X className="h-4 w-4" />
                 </button>
 
                 {/* Content */}
                 <div className="flex items-start gap-3">
                   <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                     <Lightbulb className="h-5 w-5 text-primary" />
                   </div>
                   <div className="flex-1 pt-0.5">
                     <h4 className="font-semibold text-heading">Ready to save?</h4>
                     <p className="mt-0.5 text-xs text-muted-foreground">
                       Get your free consultation today
                     </p>
                   </div>
                 </div>
 
                 {/* CTA Button */}
                 <Button
                   asChild
                   variant="cta"
                   size="sm"
                   className="mt-3 w-full"
                 >
                   <Link to="/get-started">
                     Book Consultation
                     <ArrowRight className="ml-1 h-4 w-4" />
                   </Link>
                 </Button>
               </motion.div>
             ) : (
               <motion.button
                 key="collapsed"
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 transition={{ duration: 0.2 }}
                 onClick={() => setIsExpanded(true)}
                 className="group flex h-12 w-12 items-center justify-center rounded-2xl border border-border/50 bg-background/95 shadow-elevated backdrop-blur-xl transition-all hover:border-primary/50 hover:shadow-xl"
                 aria-label="Open consultation offer"
               >
                 <motion.div
                   animate={{ scale: [1, 1.1, 1] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                 >
                   <Lightbulb className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
                 </motion.div>
               </motion.button>
             )}
           </AnimatePresence>
         </motion.div>
       )}
     </AnimatePresence>
   );
 }