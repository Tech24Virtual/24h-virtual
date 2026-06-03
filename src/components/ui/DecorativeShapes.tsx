import { motion } from "framer-motion";

import React from "react";

interface DecorativeShapesProps {
  variant?: "hero" | "section" | "subtle";
}

export const DecorativeShapes = React.forwardRef<HTMLDivElement, DecorativeShapesProps>(
  function DecorativeShapes({ variant = "section" }, _ref) {
  if (variant === "hero") {
    return (
      <>
        {/* Large gradient blur - top right */}
        <motion.div
          className="absolute top-10 right-[10%] w-72 h-72 rounded-full bg-gradient-to-br from-secondary/30 to-brand-rose/40 blur-3xl pointer-events-none"
          animate={{ 
            scale: [1, 1.15, 1], 
            rotate: [0, 45, 0],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Medium blur - bottom left */}
        <motion.div
          className="absolute bottom-[20%] left-[5%] w-48 h-48 rounded-full bg-primary/15 blur-3xl pointer-events-none"
          animate={{ 
            y: [0, 20, 0], 
            x: [0, 10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Small accent circles */}
        <motion.div
          className="absolute top-[40%] left-[15%] w-4 h-4 rounded-full bg-secondary/60 pointer-events-none"
          animate={{ y: [-8, 8, -8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-[25%] right-[25%] w-3 h-3 rounded-full bg-primary/50 pointer-events-none"
          animate={{ y: [5, -5, 5], x: [-3, 3, -3] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-[30%] right-[15%] w-5 h-5 rounded-full bg-brand-rose/70 pointer-events-none"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </>
    );
  }

  if (variant === "subtle") {
    return (
      <>
        <motion.div
          className="absolute top-10 right-10 w-24 h-24 rounded-full bg-primary/5 blur-2xl pointer-events-none"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-10 left-10 w-20 h-20 rounded-full bg-secondary/5 blur-2xl pointer-events-none"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </>
    );
  }

  // Default section variant
  return (
    <>
      <motion.div
        className="absolute top-20 right-[5%] w-40 h-40 rounded-full bg-secondary/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-20 left-[5%] w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      
      {/* Small floating dots */}
      <motion.div
        className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-brand-rose/80 pointer-events-none"
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 rounded-full bg-secondary/50 pointer-events-none"
        animate={{ y: [4, -4, 4], x: [-2, 2, -2] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </>
  );
});
DecorativeShapes.displayName = "DecorativeShapes";
