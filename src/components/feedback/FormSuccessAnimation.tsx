 import { motion, AnimatePresence } from "framer-motion";
 import { CheckCircle, Sparkles, PartyPopper } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { cn } from "@/lib/utils";
 
 interface FormSuccessAnimationProps {
   title?: string;
   description?: string;
   onReset?: () => void;
   resetButtonText?: string;
   showResetButton?: boolean;
   variant?: "default" | "dark" | "celebration";
   autoHide?: boolean;
   autoHideDelay?: number;
   isVisible: boolean;
   onHide?: () => void;
 }
 
 export function FormSuccessAnimation({
   title = "Success!",
   description = "Your submission has been received.",
   onReset,
   resetButtonText = "Submit another",
   showResetButton = false,
   variant = "default",
   autoHide = false,
   autoHideDelay = 3000,
   isVisible,
   onHide,
 }: FormSuccessAnimationProps) {
   // Auto-hide effect
   if (autoHide && isVisible && onHide) {
     setTimeout(() => {
       onHide();
     }, autoHideDelay);
   }
 
   const variantStyles = {
     default: "bg-background border-border",
     dark: "bg-foreground/95 text-background border-foreground",
     celebration: "bg-gradient-to-br from-primary/10 via-secondary/10 to-cta/10 border-primary/30",
   };
 
   const iconStyles = {
     default: "text-primary",
     dark: "text-background",
     celebration: "text-cta",
   };
 
   return (
     <AnimatePresence>
       {isVisible && (
         <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.9 }}
           transition={{ duration: 0.3, ease: "easeOut" }}
           className={cn(
             "rounded-2xl border p-6 text-center shadow-soft backdrop-blur-sm",
             variantStyles[variant]
           )}
         >
           {/* Celebration sparkles */}
           {variant === "celebration" && (
             <>
               <motion.div
                 className="absolute -top-2 -left-2"
                 animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                 transition={{ duration: 2, repeat: Infinity }}
               >
                 <Sparkles className="h-6 w-6 text-secondary" />
               </motion.div>
               <motion.div
                 className="absolute -top-2 -right-2"
                 animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }}
                 transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
               >
                 <Sparkles className="h-6 w-6 text-cta" />
               </motion.div>
               <motion.div
                 className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                 animate={{ y: [0, -5, 0], rotate: [0, 10, -10, 0] }}
                 transition={{ duration: 1.5, repeat: Infinity }}
               >
                 <PartyPopper className="h-5 w-5 text-primary" />
               </motion.div>
             </>
           )}
 
           {/* Success icon */}
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
             className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
           >
             <CheckCircle className={cn("h-8 w-8", iconStyles[variant])} />
           </motion.div>
 
           {/* Title */}
           <motion.h3
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className={cn(
               "text-xl font-bold",
               variant === "dark" ? "text-background" : "text-heading"
             )}
           >
             {title}
           </motion.h3>
 
           {/* Description */}
           <motion.p
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className={cn(
               "mt-2 text-sm",
               variant === "dark" ? "text-background/70" : "text-muted-foreground"
             )}
           >
             {description}
           </motion.p>
 
           {/* Reset button */}
           {showResetButton && onReset && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.5 }}
               className="mt-4"
             >
               <Button
                 variant={variant === "dark" ? "outline" : "ghost"}
                 size="sm"
                 onClick={onReset}
                 className={variant === "dark" ? "border-background/30 text-background hover:bg-background/10" : ""}
               >
                 {resetButtonText}
               </Button>
             </motion.div>
           )}
         </motion.div>
       )}
     </AnimatePresence>
   );
 }