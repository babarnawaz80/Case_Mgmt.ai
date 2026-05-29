import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  /**
   * @deprecated No longer used. The trail itself provides all navigation.
   * Kept for backward-compat so existing call-sites don't break at compile time.
   */
  backTo?: string;
  /** @deprecated See backTo */
  backLabel?: string;
  className?: string;
}

/**
 * Consistent breadcrumb trail used across iCM pages.
 *
 * Renders a clean  Root > Parent > Current  trail.
 * Non-last items with a `to` prop are rendered as links.
 * The last item is always plain text (current page).
 *
 * Usage:
 *   <Breadcrumbs
 *     items={[
 *       { label: "People Supported", to: "/people" },
 *       { label: personName, to: `/people/${id}/echart` },
 *       { label: "Care Plan" },
 *     ]}
 *   />
 */
export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1.5 flex-wrap text-[13.5px] font-geist font-semibold text-icm-text-dim ${className}`}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
            {idx > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-icm-text-faint shrink-0" />
            )}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="font-semibold hover:text-icm-text transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? "text-icm-text font-bold"
                    : "text-icm-text-dim font-semibold"
                }
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
