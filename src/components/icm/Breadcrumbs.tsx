import { ChevronRight, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  /** Optional explicit "Back" target. When omitted, no back chevron is rendered. */
  backTo?: string;
  backLabel?: string;
  className?: string;
}

/**
 * Consistent module-level breadcrumb + back link used across iCM pages.
 *
 * Usage:
 *   <Breadcrumbs
 *     backTo={`/people/${id}/echart`}
 *     backLabel="eChart"
 *     items={[
 *       { label: "People", to: "/people" },
 *       { label: personName, to: `/people/${id}/echart` },
 *       { label: "Care Plan" },
 *     ]}
 *   />
 */
export function Breadcrumbs({
  items,
  backTo,
  backLabel = "Back",
  className = "",
}: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <div
      className={`flex items-center gap-3 flex-wrap text-[11.5px] font-geist text-icm-text-dim ${className}`}
    >
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-1 px-2 py-1 -ml-2 rounded-md hover:bg-icm-bg hover:text-icm-text transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="font-medium">{backLabel}</span>
        </button>
      )}
      {backTo && items.length > 0 && (
        <span className="w-px h-3.5 bg-icm-border" />
      )}
      <nav className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <span key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight className="w-3 h-3 text-icm-text-faint" />
              )}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="hover:text-icm-text transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast ? "text-icm-text font-medium" : "text-icm-text-dim"
                  }
                >
                  {item.label}
                </span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
