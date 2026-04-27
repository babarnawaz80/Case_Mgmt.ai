import { Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AiBadgeProps {
  tooltip?: string;
  className?: string;
}

const AiBadge = ({ tooltip, className = '' }: AiBadgeProps) => {
  const badge = (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-billing-warning/15 text-billing-warning border border-billing-warning/30 ${className}`}>
      <Sparkles className="h-3 w-3" />
      AI
    </span>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent><p className="text-xs">{tooltip}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};

export default AiBadge;
