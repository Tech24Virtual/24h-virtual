import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { User, Sparkles, CheckCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  timestamp?: Date;
}

export function ChatBubble({ role, content, isTyping, timestamp }: ChatBubbleProps) {
  const isAssistant = role === "assistant";

  const formatTime = (date?: Date) => {
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex gap-2", isAssistant ? "justify-start" : "justify-end")}
    >
      {isAssistant && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-primary" />
        </motion.div>
      )}
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
            isAssistant
              ? "bg-muted text-foreground rounded-tl-md"
              : "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-md"
          )}
        >
          {isTyping ? (
            <div className="flex items-center gap-1 py-1">
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-current rounded-full"
              />
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-current rounded-full"
              />
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-current rounded-full"
              />
            </div>
          ) : isAssistant ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  a: ({ href, children }) => (
                    <Link to={href || '#'} className="text-primary hover:underline font-medium">
                      {children}
                    </Link>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            content
          )}
        </div>
        {/* Timestamp and read receipt */}
        {!isTyping && timestamp && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] text-muted-foreground",
            isAssistant ? "ml-1" : "mr-1 justify-end"
          )}>
            <span>{formatTime(timestamp)}</span>
            {!isAssistant && <CheckCheck className="w-3 h-3 text-primary" />}
          </div>
        )}
      </div>
      {!isAssistant && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm"
        >
          <User className="w-4 h-4 text-primary-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
}
