import {
  FileText,
  ClipboardList,
  ClipboardCheck,
  StickyNote,
  AlertTriangle,
  Users,
  Heart,
  Building2,
  Shield,
  Phone,
  GraduationCap,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Tile {
  label: string;
  icon: LucideIcon;
  count?: number;
  alert?: boolean;
  to?: string;
}

const tiles: Tile[] = [
  { label: "Contact Note", icon: FileText, count: 14, to: "/documentation/contact-notes" },
  { label: "Progress Note", icon: StickyNote, count: 4, to: "/documentation/progress-notes" },
  { label: "ISP Review", icon: ClipboardCheck, count: 5, to: "/documentation/care-plans" },
  { label: "Visit Summary", icon: ClipboardList, count: 2, to: "/documentation/visit-summaries" },
  { label: "Incidents", icon: AlertTriangle, count: 3, alert: true, to: "/incidents" },
  { label: "People", icon: Users, count: 48, to: "/people" },
  { label: "Care Tracker", icon: Heart, to: "/documentation" },
  { label: "Sites", icon: Building2, count: 4, to: "/settings/organization" },
  { label: "Plan of Correction", icon: Shield, count: 1, to: "/documentation" },
  { label: "Outreach", icon: Phone, to: "/documentation" },
  { label: "Training", icon: GraduationCap, to: "/settings" },
  { label: "All Modules", icon: LayoutGrid, to: "/documentation" },
];

export function ModuleGrid() {
  const navigate = useNavigate();
  return (
    <div className="rounded-[12px] border border-icm-border bg-icm-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-tight font-semibold text-[15px] text-icm-text">Quick access</h3>
        <span className="text-[11px] text-icm-text-faint font-geist">12 modules</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={() => t.to && navigate(t.to)}
            className="text-left rounded-[8px] border border-icm-border bg-icm-panel p-2.5 hover:border-icm-border-strong transition-colors relative"
          >
            <div className="flex items-start justify-between">
              <div className="w-6 h-6 rounded-md bg-icm-bg flex items-center justify-center">
                <t.icon className="w-3.5 h-3.5 text-icm-text-dim" />
              </div>
              {typeof t.count === "number" && (
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full ${
                    t.alert ? "bg-icm-red-soft text-icm-red" : "bg-icm-bg text-icm-text-dim"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </div>
            <p className="text-[12px] font-geist font-medium text-icm-text mt-2 leading-tight">{t.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
