import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ConversationBubbleProps {
  speaker: "ai" | "caller";
  text: string;
  isTyping?: boolean;
  typingSpeed?: number;
}

export function ConversationBubble({ speaker, text, isTyping = true, typingSpeed = 20 }: ConversationBubbleProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(!isTyping);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [text, isTyping, typingSpeed]);

  const isAI = speaker === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex",
        isAI ? "justify-start" : "justify-end"
      )}
    >
      <div className="flex items-end gap-2 max-w-[85%]">
        {isAI && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
            24H
          </div>
        )}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm leading-relaxed",
            isAI
              ? "bg-zinc-800 text-zinc-100 rounded-bl-md"
              : "bg-primary text-primary-foreground rounded-br-md"
          )}
        >
          {displayedText}
          {!isComplete && (
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block ml-0.5 w-1.5 h-4 bg-current align-text-bottom"
            />
          )}
        </div>
        {!isAI && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
            C
          </div>
        )}
      </div>
    </motion.div>
  );
}
