import { cn } from "@/lib/utils";
import { type ScenarioType, type Scenario } from "./types";

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  selected: ScenarioType;
  onSelect: (scenario: ScenarioType) => void;
}

export function ScenarioSelector({ scenarios, selected, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {scenarios.map((scenario) => {
        const Icon = scenario.icon;
        const isSelected = selected === scenario.id;
        
        return (
          <button
            key={scenario.id}
            onClick={() => onSelect(scenario.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              isSelected
                ? "bg-primary text-primary-foreground shadow-lg scale-105"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-heading"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{scenario.name}</span>
          </button>
        );
      })}
    </div>
  );
}
