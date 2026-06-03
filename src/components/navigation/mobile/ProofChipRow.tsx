import type { LucideIcon } from "lucide-react";

interface ProofChip {
  label: string;
  icon: LucideIcon;
}

interface ProofChipRowProps {
  chips: ProofChip[];
}

export function ProofChipRow({ chips }: ProofChipRowProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {chips.map(({ label, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2"
        >
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">{label}</span>
        </div>
      ))}
    </div>
  );
}
