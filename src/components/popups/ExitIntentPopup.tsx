 import { useState, useEffect, useRef } from "react";
 import { Gift, BookOpen, Calendar, CheckCircle, Sparkles, ArrowRight, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
 import { Link, useLocation, useNavigate } from "react-router-dom";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { useIsMobile } from "@/hooks/use-mobile";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const POPUP_STORAGE_KEY = "exit_intent_shown";
const POPUP_COOLDOWN_HOURS = 24;

const EXCLUDED_ROUTES = [
  "/login",
  "/signup",
  "/admin",
  "/client-dashboard",
  "/affiliate-dashboard",
  "/affiliate",
  "/staff",
  "/hr-portal",
  "/get-started",
  "/call-advisor",
  "/white-label-dashboard",
  "/portal",
  "/c/",
  "/p/",
];

 // A/B Test Variants
 const OFFER_VARIANTS = [
   {
     id: "10_off",
     type: "email_capture" as const,
     icon: Gift,
     headline: "Wait! Here's 10% Off",
     description: "Get 10% off your first 3 months when you sign up today",
     urgencyText: "Limited time offer",
     buttonText: "Claim My Discount",
     source: "exit_intent_10_off",
     iconBg: "bg-cta/10",
     iconColor: "text-cta",
   },
   {
     id: "consultation",
     type: "link" as const,
     icon: Calendar,
     headline: "Get Expert Advice",
     description: "Book your FREE consultation with our team and discover how much you could save",
     urgencyText: null,
     buttonText: "Book Now",
     ctaLink: "/get-started",
     source: "exit_intent_consultation",
     iconBg: "bg-primary/10",
     iconColor: "text-primary",
   },
   {
     id: "guide",
     type: "email_capture" as const,
     icon: BookOpen,
     headline: "Free Guide",
     subheadline: "5 Signs You Need a Virtual Receptionist",
     description: "Enter your email to download instantly",
     urgencyText: null,
     buttonText: "Get Free Guide",
     source: "exit_intent_guide",
     iconBg: "bg-secondary/10",
     iconColor: "text-secondary",
   },
   {
     id: "calculator",
     type: "link" as const,
     icon: Sparkles,
     headline: "Still Wondering What Missed Calls Cost You?",
     description: "Use our free calculator to see exactly how much you could save — and download a personalized savings report",
     urgencyText: null,
     buttonText: "Calculate My Savings",
     ctaLink: "/cost-calculator",
     source: "exit_intent_calculator",
     iconBg: "bg-secondary/10",
     iconColor: "text-secondary",
   },
 ];

const trustElements = [
  { text: "1000+ businesses" },
  { text: "99.9% uptime" },
  { text: "24/7 support" },
];

export function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false);
   const [email, setEmail] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isSubmitted, setIsSubmitted] = useState(false);
   const lastScrollY = useRef(0);
   const hasTriggered = useRef(false);
  const location = useLocation();
   const navigate = useNavigate();
   const isMobile = useIsMobile();
 
   // Random variant selection on mount
   const [activeVariant] = useState(() => {
     const index = Math.floor(Math.random() * OFFER_VARIANTS.length);
     return OFFER_VARIANTS[index];
   });

  const isExcludedRoute = EXCLUDED_ROUTES.some((route) =>
    location.pathname.startsWith(route)
  );

   // Check cooldown
   const checkCooldown = () => {
     const lastShown = localStorage.getItem(POPUP_STORAGE_KEY);
     if (lastShown) {
       const hoursSinceShown =
         (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60);
       return hoursSinceShown < POPUP_COOLDOWN_HOURS;
     }
     return false;
   };
 
   const triggerPopup = () => {
     if (hasTriggered.current || checkCooldown()) return;
     hasTriggered.current = true;
     setIsOpen(true);
     localStorage.setItem(POPUP_STORAGE_KEY, Date.now().toString());
   };
 
   // Desktop: Mouse leave detection
  useEffect(() => {
     if (isExcludedRoute || isMobile) return;

    const handleMouseLeave = (e: MouseEvent) => {
       if (e.clientY <= 0) {
         triggerPopup();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
   }, [isExcludedRoute, isMobile]);
 
   // Mobile: Scroll-up detection near top
   useEffect(() => {
     if (isExcludedRoute || !isMobile) return;
 
     const handleScroll = () => {
       const currentY = window.scrollY;
       const isScrollingUp = currentY < lastScrollY.current - 10; // 10px threshold
       const nearTop = currentY < 200;
 
       if (isScrollingUp && nearTop) {
         triggerPopup();
       }
 
       lastScrollY.current = currentY;
     };
 
     // Wait 5 seconds before enabling
     const timer = setTimeout(() => {
       window.addEventListener("scroll", handleScroll, { passive: true });
     }, 5000);
 
     return () => {
       clearTimeout(timer);
       window.removeEventListener("scroll", handleScroll);
     };
   }, [isExcludedRoute, isMobile]);

  if (isExcludedRoute) return null;

   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!email.trim() || isSubmitting) return;
 
     setIsSubmitting(true);
 
     try {
      const { data: insertedLead, error } = await supabase.from("leads").insert({
         name: "Exit Intent Lead",
         email: email.trim(),
         source: activeVariant.source,
         notes: JSON.stringify({
           variant: activeVariant.id,
           page: location.pathname,
           timestamp: new Date().toISOString(),
         }),
      }).select("id").single();
 
       if (error) throw error;
 
      // Send confirmation email (fire and forget - don't block UI)
      if (insertedLead?.id && (activeVariant.id === "10_off" || activeVariant.id === "guide")) {
        supabase.functions.invoke("send-exit-intent-email", {
          body: { leadId: insertedLead.id, variant: activeVariant.id },
        }).catch(err => console.warn("Exit intent email failed:", err));
      }

       setIsSubmitted(true);
       toast.success("Thanks! Check your email for details.");
 
       // Close after 2 seconds
       setTimeout(() => {
         setIsOpen(false);
       }, 2000);
     } catch (error) {
       console.error("Error submitting lead:", error);
       toast.error("Something went wrong. Please try again.");
     } finally {
       setIsSubmitting(false);
     }
   };
 
   const handleLinkClick = () => {
    setIsOpen(false);
     if (activeVariant.type === "link" && "ctaLink" in activeVariant) {
       navigate(activeVariant.ctaLink as string);
     }
  };

   const IconComponent = activeVariant.icon;
 
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-xl">
        <DialogTitle className="sr-only">{activeVariant.headline}</DialogTitle>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
               {/* Urgency Banner */}
               {activeVariant.urgencyText && (
                 <motion.div
                   initial={{ opacity: 0, y: -10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mb-4 flex items-center justify-center gap-2 rounded-full bg-cta/10 px-4 py-2 text-sm font-medium text-cta"
                 >
                   <Clock className="h-4 w-4" />
                   {activeVariant.urgencyText}
                 </motion.div>
               )}
 
              {/* Animated Header */}
              <div className="text-center space-y-3 mb-6">
                <motion.div
                   className={`w-20 h-20 mx-auto rounded-full ${activeVariant.iconBg} flex items-center justify-center`}
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <motion.div
                    animate={{
                      y: [0, -3, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                     <IconComponent className={`w-10 h-10 ${activeVariant.iconColor}`} />
                  </motion.div>
                </motion.div>

                <h2 className="text-2xl font-bold text-heading">
                   {activeVariant.headline}
                </h2>
                 {"subheadline" in activeVariant && activeVariant.subheadline && (
                   <p className="text-lg font-medium text-secondary">
                     {activeVariant.subheadline}
                   </p>
                 )}
                <p className="text-muted-foreground">
                   {activeVariant.description}
                </p>
              </div>

               {/* Email Capture or Link CTA */}
               {isSubmitted ? (
                 <motion.div
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="rounded-xl bg-primary/10 p-6 text-center"
                 >
                   <CheckCircle className="mx-auto h-12 w-12 text-primary" />
                   <p className="mt-3 font-semibold text-heading">You're all set!</p>
                   <p className="mt-1 text-sm text-muted-foreground">
                     Check your inbox for details.
                   </p>
                 </motion.div>
               ) : activeVariant.type === "email_capture" ? (
                 <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="space-y-2">
                     <Label htmlFor="exit-email" className="sr-only">
                       Email address
                     </Label>
                     <Input
                       id="exit-email"
                       type="email"
                       placeholder="Enter your email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       required
                       className="h-12 text-base"
                     />
                   </div>
                   <Button
                     type="submit"
                     variant="cta"
                     className="w-full h-12 text-base font-semibold"
                     disabled={isSubmitting}
                   >
                     {isSubmitting ? "Submitting..." : activeVariant.buttonText}
                     {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                   </Button>
                 </form>
               ) : (
                 <Button
                   variant="cta"
                   className="w-full h-12 text-base font-semibold"
                   onClick={handleLinkClick}
                 >
                   {activeVariant.buttonText}
                   <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
               )}

              {/* Trust Elements */}
               {!isSubmitted && (
                 <motion.div
                   className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-border/50"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.4 }}
                 >
                   {trustElements.map((item, index) => (
                     <div
                       key={index}
                       className="flex items-center gap-1.5 text-sm text-muted-foreground"
                     >
                       <CheckCircle className="w-4 h-4 text-primary" />
                       <span>{item.text}</span>
                     </div>
                   ))}
                 </motion.div>
               )}

              {/* Dismiss Button */}
               {!isSubmitted && (
                 <motion.div
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: 0.5 }}
                >
                   <Button
                     variant="ghost"
                     size="sm"
                     className="w-full mt-4 text-muted-foreground hover:text-foreground"
                     onClick={() => setIsOpen(false)}
                   >
                     Maybe later
                   </Button>
                 </motion.div>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
