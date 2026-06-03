import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuickReplyOption {
  label: string;
  value: string;
}

interface QuickReplyButtonsProps {
  options: QuickReplyOption[];
  selected: string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  onContinue?: () => void;
}

export function QuickReplyButtons({
  options,
  selected,
  onSelect,
  multiSelect = false,
  onContinue,
}: QuickReplyButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex flex-wrap gap-2">
        {options.map((option, index) => {
          const isSelected = selected.includes(option.value);
          
          return (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelect(option.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                "border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary hover:text-primary"
              )}
            >
              {option.label}
            </motion.button>
          );
        })}
      </div>

      {multiSelect && selected.length > 0 && onContinue && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onContinue}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Continue ({selected.length} selected)
        </motion.button>
      )}
    </motion.div>
  );
}
