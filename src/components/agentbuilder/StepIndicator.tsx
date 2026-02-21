import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  steps: { label: string; description: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 w-full">
      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isComplete = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all",
                  isComplete && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground shadow-md",
                  !isComplete && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : stepNum}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className={cn("text-xs font-medium truncate", isCurrent ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{step.description}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-px mx-2", isComplete ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
