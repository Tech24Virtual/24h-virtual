import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Button } from "./button";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(24);

  // RAF-throttled scroll handler for visibility + footer position
  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return; // Already scheduled

      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercentage = documentHeight > 0 ? (scrollY / documentHeight) * 100 : 0;

        // Show when past 30%, hide only when back above 25%
        if (scrollPercentage >= 30) {
          setIsVisible(true);
        } else if (scrollPercentage < 25) {
          setIsVisible(false);
        }

        // Footer boundary
        const footer = document.querySelector("footer");
        if (footer) {
          const footerRect = footer.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          if (footerRect.top < viewportHeight) {
            setBottomOffset(Math.max(24, viewportHeight - footerRect.top + 24));
          } else {
            setBottomOffset(24);
          }
        }

        rafId = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed left-6 z-40 transition-all duration-300 hidden md:block"
          style={{ bottom: bottomOffset }}
        >
          <Button
            onClick={scrollToTop}
            size="icon"
            className="w-12 h-12 rounded-full shadow-elevated bg-primary/90 hover:bg-primary text-primary-foreground"
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
