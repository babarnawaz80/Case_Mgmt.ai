import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  FileText, DollarSign, ClipboardList, Search, StickyNote, FileCheck, Workflow,
  Bell, Calendar, FolderOpen, Heart, Users, AlertTriangle,
  Building2, GraduationCap, Send, Tag, Shield, ArrowRight, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { people, initials, riskAvatarClass, type Person } from "@/data/people";

type FormRoute = (personId: string) => string;

const quickActions: Array<{
  title: string;
  icon: typeof FileText;
  category: "documentation" | "operations" | "care";
  route?: FormRoute;
}> = [
  { title: "Activity Note", icon: FileText, category: "documentation", route: (id) => `/people/${id}/contact-note` },
  { title: "Billable Note", icon: DollarSign, category: "operations" },
  { title: "Assessment", icon: ClipboardList, category: "documentation" },
  { title: "Monitoring", icon: Search, category: "operations", route: (id) => `/people/${id}/monitoring-form/new` },
  { title: "Progress Note", icon: StickyNote, category: "documentation", route: (id) => `/people/${id}/progress-note/new` },
  { title: "Visit Summary", icon: FileCheck, category: "operations", route: (id) => `/people/${id}/visit-summary/new` },
  { title: "Workflow", icon: Workflow, category: "documentation" },
];

const modules = [
  { title: "Announcements", icon: Bell, url: "", category: "care" },
  { title: "Attendance", icon: Calendar, url: "", category: "operations" },
  { title: "Documents", icon: FolderOpen, url: "", category: "documentation" },
  { title: "Care Tracker", icon: Heart, url: "", category: "care" },
  { title: "Custom Forms", icon: ClipboardList, url: "", category: "documentation" },
  { title: "Incidents", icon: AlertTriangle, url: "", category: "operations" },
  { title: "My Sites", icon: Building2, url: "", category: "operations" },
  { title: "People Supported", icon: Users, url: "/people", category: "care" },
  { title: "Authorizations", icon: Send, url: "/billing", category: "operations" },
  { title: "Training", icon: GraduationCap, url: "", category: "operations" },
  { title: "Plan of Correction", icon: Shield, url: "", category: "operations" },
  { title: "SnapTag", icon: Tag, url: "", category: "care" },
];

export function QuickActions() {
  const navigate = useNavigate();
  const [picker, setPicker] = useState<{ title: string; route: FormRoute } | null>(null);

  const handleQuickAction = (action: typeof quickActions[number]) => {
    if (action.route) {
      setPicker({ title: action.title, route: action.route });
    } else {
      toast({
        title: action.title,
        description: `Opening ${action.title} form. This connects to the iCM ${action.title} module.`,
      });
    }
  };

  const handleModuleClick = (mod: typeof modules[0]) => {
    if (mod.url) {
      navigate(mod.url);
    } else {
      toast({
        title: mod.title,
        description: `Opening ${mod.title} module. This connects to iCM.`,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.04 }}
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleQuickAction(action)}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-4 flex flex-col items-center gap-2.5 text-white shadow-sm hover:shadow-lg transition-all duration-300",
                action.bg
              )}
            >
              <div className="p-2.5 rounded-xl bg-white/20">
                <action.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-center leading-tight">{action.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* All Modules */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide">All Modules</h3>
          <button
            onClick={() => toast({ title: "All Modules", description: "Showing complete module list. Each module connects to the corresponding iCM feature." })}
            className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {modules.map((mod, i) => (
            <motion.button
              key={mod.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.03 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleModuleClick(mod)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-white font-semibold text-xs shadow-sm hover:shadow-lg transition-all duration-300",
                mod.bg
              )}
            >
              <mod.icon className="w-4 h-4 shrink-0 opacity-90" />
              <span className="leading-tight text-left">{mod.title}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {picker && (
        <IndividualPickerModal
          title={picker.title}
          onClose={() => setPicker(null)}
          onSelect={(personId) => {
            const target = picker.route(personId);
            setPicker(null);
            navigate(target);
          }}
        />
      )}
    </div>
  );
}

function IndividualPickerModal({
  title,
  onClose,
  onSelect,
}: {
  title: string;
  onClose: () => void;
  onSelect: (personId: string) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const active = people.filter((p) => p.status === "Active");
    const fullName = (p: Person) => `${p.firstName} ${p.lastName}`;
    if (!term) return active.slice(0, 60);
    return active
      .filter((p) => fullName(p).toLowerCase().includes(term) || p.id.toLowerCase().includes(term))
      .slice(0, 60);
  }, [q]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-[15px] text-foreground">Start {title}</h2>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Select the individual this {title.toLowerCase()} is for
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search individuals…"
              className="w-full h-9 pl-8 pr-2 rounded-lg border border-border bg-background text-[12px] text-foreground"
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
          {list.length === 0 && (
            <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
              No individuals found
            </div>
          )}
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold",
                  riskAvatarClass(p.riskScore)
                )}
              >
                {initials(p)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-foreground truncate">
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-[10.5px] font-mono text-muted-foreground truncate">{p.id}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
