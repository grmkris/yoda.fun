import { DollarSign, Globe, Trophy } from "lucide-react";
import type { ResolutionMethodType } from "@/lib/orpc-types";
import { cn } from "@/lib/utils";

interface MethodBadgeProps {
  type: ResolutionMethodType;
  tools?: string[];
  className?: string;
}

const methodConfig: Record<
  string,
  { label: string; icon: typeof Globe; color: string }
> = {
  PRICE: {
    label: "Price",
    icon: DollarSign,
    color: "bg-blue-500/10 text-blue-500",
  },
  SPORTS: {
    label: "Sports",
    icon: Trophy,
    color: "bg-green-500/10 text-green-500",
  },
  WEB_SEARCH: {
    label: "Web Search",
    icon: Globe,
    color: "bg-purple-500/10 text-purple-500",
  },
};

const defaultConfig = {
  label: "Unknown",
  icon: Globe,
  color: "bg-gray-500/10 text-gray-500",
};

export function MethodBadge({ type, tools, className }: MethodBadgeProps) {
  const config = methodConfig[type] ?? defaultConfig;
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs",
          config.color
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
      {tools && tools.length > 0 && (
        <span className="text-muted-foreground text-xs">
          ({tools.join(", ")})
        </span>
      )}
    </div>
  );
}
