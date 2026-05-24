import {
  Heart,
  Users,
  Phone,
  Briefcase,
  GraduationCap,
  UserCheck,
  Archive,
  PhoneCall,
  BookOpen,
  Layout as LayoutIcon,
  CreditCard,
  PenTool,
  type LucideIcon,
} from "lucide-react";
import { PersonModulePlaceholder } from "@/components/icm/PersonModulePlaceholder";

interface Spec {
  name: string;
  icon: LucideIcon;
}

const SPECS: Record<string, Spec> = {
  "care-tracker": { name: "Care Tracker", icon: Heart },
  "meeting-notes": { name: "Team Meeting Notes", icon: Users },
  communications: { name: "Communications Log", icon: Phone },
  services: { name: "Services", icon: Briefcase },
  employment: { name: "Employment & Education", icon: GraduationCap },
  "assigned-staff": { name: "Assigned Staff", icon: UserCheck },
  "managed-documents": { name: "Managed Documents", icon: Archive },
  oncall: { name: "On Call Log", icon: PhoneCall },
  trainings: { name: "Person Trainings", icon: BookOpen },
  "service-plan": { name: "Service Plan", icon: LayoutIcon },
  billing: { name: "Billing Summary", icon: CreditCard },
  esignature: { name: "e-Signature", icon: PenTool },
};

export function makePersonPlaceholder(slug: keyof typeof SPECS) {
  return function PlaceholderPage() {
    const spec = SPECS[slug];
    return <PersonModulePlaceholder moduleName={spec.name} icon={spec.icon} />;
  };
}

export { default as PersonCareTracker } from "./PersonCareTracker";
export const PersonMeetingNotes = makePersonPlaceholder("meeting-notes");
export const PersonCommunications = makePersonPlaceholder("communications");
export const PersonServices = makePersonPlaceholder("services");
export { default as PersonEmployment } from "./PersonEmployment";
export const PersonAssignedStaff = makePersonPlaceholder("assigned-staff");
export { default as PersonManagedDocuments } from "./PersonManagedDocuments";
export const PersonOnCall = makePersonPlaceholder("oncall");
export { default as PersonTrainings } from "./PersonTrainings";
export { default as PersonServicePlan } from "./PersonServicePlan";
export const PersonBillingSummary = makePersonPlaceholder("billing");
export { default as PersonESignature } from "./PersonESignature";
