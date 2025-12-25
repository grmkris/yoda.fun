import { cn } from "@/lib/utils";

interface ConfidenceBarProps {
  value: number;
  className?: string;
}

export function ConfidenceBar({ value, className }: ConfidenceBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const getColor = () => {
    if (clampedValue >= 80) {
      return "bg-green-500";
    }
    if (clampedValue >= 60) {
      return "bg-yellow-500";
    }
    if (clampedValue >= 40) {
      return "bg-orange-500";
    }
    return "bg-red-500";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", getColor())}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className="min-w-[3ch] text-right font-medium text-muted-foreground text-xs">
        {clampedValue}%
      </span>
    </div>
  );
}
