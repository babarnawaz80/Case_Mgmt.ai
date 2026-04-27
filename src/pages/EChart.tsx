import {
  FileText,
  ClipboardList,
  ShieldCheck,
  ClipboardCheck,
  HeartPulse,
  StickyNote,
  Eye,
  Workflow,
  UserCircle,
  Notebook,
  Activity,
  Signature,
  Briefcase,
  IdCard,
  AlertTriangle,
  ArrowLeftRight,
  FolderOpen,
  PhoneCall,
  GraduationCap,
  HandHeart,
  ListChecks,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";

interface Tile {
  label: string;
  icon: LucideIcon;
  count?: number;
  updated?: string;
  to?: string;
}

const caseManagement: Tile[] = [
  { label: "Contact Note", icon: FileText, count: 14, updated: "2h ago", to: "/modules/contact-note" },
  { label: "Case Management", icon: ClipboardList, count: 8, updated: "1d ago" },
  { label: "Eligibility Verification", icon: ShieldCheck, count: 2, updated: "3d ago" },
  { label: "Monitoring / Review Form", icon: ClipboardCheck, count: 5, updated: "Today" },
  { label: "Care Plan (PCP/ISP)", icon: HeartPulse, count: 1, updated: "5d ago" },
  { label: "Progress Note", icon: StickyNote, count: 4, updated: "1h ago" },
  { label: "Visit Summary", icon: Eye, count: 2, updated: "Yesterday" },
  { label: "Workflow Manager", icon: Workflow, count: 3, updated: "Today" },
];

const individualRecord: Tile[] = [
  { label: "Assigned Staff", icon: UserCircle, count: 6, updated: "1w ago" },
  { label: "Care Notes", icon: Notebook, count: 22, updated: "Today" },
  { label: "Care Tracker", icon: Activity, count: 12, updated: "30m ago" },
  { label: "e-Signature", icon: Signature, count: 0, updated: "—" },
  { label: "Employment & Education", icon: Briefcase, count: 3, updated: "2w ago" },
  { label: "Face Sheet", icon: IdCard, count: 1, updated: "3d ago" },
  { label: "Incident Reporting", icon: AlertTriangle, count: 2, updated: "Yesterday" },
  { label: "Global Discharge & Transfer", icon: ArrowLeftRight, count: 0, updated: "—" },
  { label: "Managed Documents", icon: FolderOpen, count: 18, updated: "1d ago" },
  { label: "On Call Log", icon: PhoneCall, count: 4, updated: "2d ago" },
  { label: "Person Trainings", icon: GraduationCap, count: 7, updated: "1w ago" },
  { label: "Services", icon: HandHeart, count: 5, updated: "Today" },
  { label: "Service Plan", icon: ListChecks, count: 1, updated: "5d ago" },
  { label: "General Ledger", icon: Wallet, count: 11, updated: "1d ago" },
];

function ModuleSection({ title, tiles }: { title: string; tiles: Tile[] }) {
  const navigate = useNavigate();
  return (
    <section className="space-y-3">
      <h2 className="font-tight font-semibold text-[14px] text-icm-text-dim uppercase tracking-wide">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {tiles.map((t) => (
          <button
            key={t.label}
            onClick={() => t.to && navigate(t.to)}
            className="text-left rounded-[12px] border border-icm-border bg-icm-panel p-3 hover:border-icm-border-strong transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-lg bg-icm-bg flex items-center justify-center">
                <t.icon className="w-4 h-4 text-icm-text-dim" />
              </div>
              {typeof t.count === "number" && (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-icm-bg text-icm-text-dim">
                  {t.count}
                </span>
              )}
            </div>
            <p className="text-[13px] font-geist font-medium text-icm-text mt-3 leading-tight">{t.label}</p>
            <p className="text-[10px] font-mono text-icm-text-faint mt-1">Updated {t.updated}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

const EChart = () => {
  const { id } = useParams();
  // Mock person record by id
  const person = {
    name: "Daniel Okafor",
    age: 34,
    dob: "03/12/1991",
    location: "Cedar Court · Polk County",
    allergies: ["Peanuts", "Latex"],
    instructions: "Requires 1:1 supervision during meals.",
  };

  return (
    <ICMShell title={`e-Chart · ${person.name}`} showAIPanel={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-[12px] border border-icm-border bg-icm-panel p-5">
          <div className="flex flex-wrap items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-icm-bg border border-icm-border flex items-center justify-center text-icm-text-dim font-mono font-semibold text-lg shrink-0">
              {person.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-tight text-[24px] font-semibold text-icm-text leading-tight tracking-[-0.02em]">
                  {person.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold uppercase tracking-wide bg-icm-green-soft text-icm-green">
                  Active
                </span>
              </div>
              <p className="text-[12px] font-mono text-icm-text-dim mt-1">
                Age {person.age} · DOB {person.dob} · ID #{id ?? "00482"}
              </p>
              <p className="text-[13px] text-icm-text-dim mt-1">{person.location}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-[12px]">
                <div>
                  <span className="text-icm-text-faint uppercase tracking-wide text-[10px] font-geist font-semibold mr-2">Allergies</span>
                  <span className="text-icm-red font-medium">{person.allergies.join(", ")}</span>
                </div>
                <div>
                  <span className="text-icm-text-faint uppercase tracking-wide text-[10px] font-geist font-semibold mr-2">Special Instructions</span>
                  <span className="text-icm-text">{person.instructions}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button className="h-8 px-3 rounded-lg bg-icm-text text-icm-panel text-[12px] font-geist font-medium hover:opacity-90">
                eChart
              </button>
              <button className="h-8 px-3 rounded-lg border border-icm-border bg-icm-panel text-[12px] font-geist font-medium text-icm-text hover:border-icm-border-strong">
                Manage Programs
              </button>
            </div>
          </div>
        </div>

        <ModuleSection title="Case Management" tiles={caseManagement} />
        <ModuleSection title="Individual Record" tiles={individualRecord} />
      </div>
    </ICMShell>
  );
};

export default EChart;
