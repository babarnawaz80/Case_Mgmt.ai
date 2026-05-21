import { Sparkles } from "lucide-react";

interface AiBadgeProps {
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Subtle "AI" pill — inspired by the IDDBilling design language.
 * Warm amber/accent gradient signals an AI-generated or AI-assisted element.
 */
export function AiBadge({ label = "AI", className = "", size = "sm" }: AiBadgeProps) {
  const sizing =
    size === "md"
      ? "px-2 py-0.5 text-[11px] gap-1.5"
      : "px-1.5 py-0.5 text-[10px] gap-1";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold font-geist bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/30 ${sizing} ${className}`}
    >
      <Sparkles className={size === "md" ? "w-3 h-3" : "w-2.5 h-2.5"} />
      {label}
    </span>
  );
}
