import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { Input } from "./input";
import { useNavigate } from "react-router-dom";

const SEARCH_SUGGESTIONS = [
  { label: "Pricing", href: "/pricing" },
  { label: "AI Receptionist", href: "/solutions/ai-receptionist" },
  { label: "FAQs", href: "/faqs" },
  { label: "How It Works", href: "/how-it-works" },
];

export function FloatingSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [bottomOffset, setBottomOffset] = useState(96);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // RAF-throttled scroll handler for visibility + footer position
  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId) return;

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
        const baseOffset = 96; // Stack above scroll-to-top button
        const footer = document.querySelector("footer");
        if (footer) {
          const footerRect = footer.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          if (footerRect.top < viewportHeight) {
            setBottomOffset(Math.max(baseOffset, viewportHeight - footerRect.top + 24));
          } else {
            setBottomOffset(baseOffset);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/faqs?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
      setQuery("");
    }
  };

  return (
    <>
      {/* Floating Button with scroll-based visibility */}
      <AnimatePresence>
        {isVisible && (
          <motion.button
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed left-6 z-40 w-12 h-12 rounded-full shadow-lg hidden md:flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            style={{ bottom: bottomOffset }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20 px-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg bg-background rounded-2xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for answers..."
                    className="pl-12 pr-12 h-14 text-lg"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </form>
              
              {/* Quick Links */}
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Quick links</p>
                <div className="flex flex-wrap gap-2">
                  {SEARCH_SUGGESTIONS.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        navigate(item.href);
                        setIsOpen(false);
                      }}
                      className="px-3 py-1.5 bg-accent/50 rounded-full text-sm hover:bg-accent transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
