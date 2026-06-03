import { cn } from "@/lib/utils";
import { type IntegrationMode } from "./types";
import { Zap, Mail } from "lucide-react";

interface IntegrationModeToggleProps {
  mode: IntegrationMode;
  onChange: (mode: IntegrationMode) => void;
}

export function IntegrationModeToggle({ mode, onChange }: IntegrationModeToggleProps) {
  return (
    <div className="flex items-center justify-center gap-2 p-1 bg-muted/50 rounded-full">
      <button
        onClick={() => onChange("integrated")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
          mode === "integrated"
            ? "bg-emerald-500 text-white shadow-lg"
            : "text-muted-foreground hover:text-heading"
        )}
      >
        <Zap className="w-4 h-4" />
        <span>CRM Integrated</span>
      </button>
      <button
        onClick={() => onChange("non-integrated")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
          mode === "non-integrated"
            ? "bg-amber-500 text-white shadow-lg"
            : "text-muted-foreground hover:text-heading"
        )}
      >
        <Mail className="w-4 h-4" />
        <span>Email Only</span>
      </button>
    </div>
  );
}
