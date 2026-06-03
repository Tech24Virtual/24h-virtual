import { Star, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface ClutchReviewsBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

import React from "react";

export const ClutchReviewsBadge = React.forwardRef<HTMLAnchorElement, ClutchReviewsBadgeProps>(
  function ClutchReviewsBadge({ className = "", size = "md" }, _ref) {
  const sizeClasses = {
    sm: "px-3 py-2",
    md: "px-4 py-2.5",
    lg: "px-5 py-3",
  };

  const starSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const subtitleSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
  };

  return (
    <motion.a 
      href="https://clutch.co/profile/24h-virtual"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-full ${sizeClasses[size]} shadow-soft border border-border/30 hover:shadow-md transition-shadow ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      whileHover={{ scale: 1.03, y: -2 }}
      aria-label="View our verified reviews on Clutch"
    >
      {/* Clutch logo text */}
      <div className="flex items-center">
        <span className={`font-bold ${textSizes[size]}`} style={{ color: "#17313B" }}>
          clutch
        </span>
        <span className={`font-bold ${textSizes[size]}`} style={{ color: "#EF4335" }}>
          .
        </span>
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`${starSizes[size]} fill-[#EF4335] text-[#EF4335]`}
              />
            ))}
          </div>
          <span className={`font-semibold ${subtitleSizes[size]}`} style={{ color: "#17313B" }}>
            5.0
          </span>
        </div>
      </div>

      <ExternalLink className="w-3 h-3 text-muted-foreground" />
    </motion.a>
  );
});
ClutchReviewsBadge.displayName = "ClutchReviewsBadge";
