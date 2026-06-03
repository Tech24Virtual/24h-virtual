import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ChatProgressProps {
  stages: string[];
  currentStage: number;
}

export function ChatProgress({ stages, currentStage }: ChatProgressProps) {
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {stages.map((stage, index) => {
        const isCompleted = index < currentStage;
        const isCurrent = index === currentStage;

        return (
          <div key={stage} className="flex items-center">
            <motion.div
              initial={false}
              animate={{
                scale: isCurrent ? 1.1 : 1,
                backgroundColor: isCompleted
                  ? "hsl(var(--primary))"
                  : isCurrent
                  ? "hsl(var(--primary) / 0.2)"
                  : "hsl(var(--muted))",
              }}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                isCompleted && "text-primary-foreground",
                isCurrent && "text-primary border-2 border-primary",
                !isCompleted && !isCurrent && "text-muted-foreground"
              )}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
            </motion.div>
            {index < stages.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 transition-colors",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
