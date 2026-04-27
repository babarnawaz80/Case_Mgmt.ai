// Mock alerts and @mentions for the unified My Work view.
// Alerts are system-generated. Mentions come from @-tagging in comments/notes.

export type AlertSeverity = "critical" | "warning" | "info" | "good";
export type AlertCategory =
  | "compliance"
  | "billing"
  | "documents"
  | "clinical"
  | "system";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  sourceLabel: string; // "Joseph Brown · Care Plan / ISP"
  sourceModule: string; // "Care Plan / ISP"
  href: string; // route to navigate to
  timestamp: string; // human-readable
  bucket: "today" | "yesterday" | "thisWeek" | "earlier";
  read: boolean;
  dismissed?: boolean;
}

export interface MentionItem {
  id: string;
  authorName: string;
  authorInitials: string;
  authorRole: "admin" | "supervisor" | "case_manager" | "billing";
  contextLabel: string; // "a task comment — Schedule quarterly visit"
  contextModule: string; // "Case Management"
  excerpt: string; // raw text with @Mention token to render
  mentionToken: string; // exact @Name text to highlight
  href: string;
  timestamp: string;
  bucket: "today" | "yesterday" | "thisWeek" | "earlier";
  read: boolean;
  dismissed?: boolean;
}

// ----- Seed alerts for Kathy Adams ------------------------------------------

export const seedAlerts: AlertItem[] = [
  {
    id: "alt-001",
    severity: "critical",
    category: "compliance",
    title: "ISP overdue 25 days",
    description:
      "Joseph Brown's Person-Centered Plan is past its scheduled review date. Renewal required to maintain compliance.",
    sourceLabel: "Joseph Brown · Care Plan / ISP",
    sourceModule: "Care Plan / ISP",
    href: "/people/1/care-plan",
    timestamp: "Today, 8:14 AM",
    bucket: "today",
    read: false,
  },
  {
    id: "alt-002",
    severity: "warning",
    category: "compliance",
    title: "Monitoring form 17 days overdue",
    description:
      "Monthly monitoring form for Joseph Brown has not been submitted. Reach out to schedule a visit.",
    sourceLabel: "Joseph Brown · Case Management",
    sourceModule: "Case Management",
    href: "/people/1/monitoring-form",
    timestamp: "Today, 7:32 AM",
    bucket: "today",
    read: false,
  },
  {
    id: "alt-003",
    severity: "warning",
    category: "compliance",
    title: "MA status verification overdue",
    description:
      "Medicaid eligibility verification for Joseph Brown is 10 days past due. Verify status to prevent service interruption.",
    sourceLabel: "Joseph Brown · Eligibility Verification",
    sourceModule: "Eligibility Verification",
    href: "/people/1/eligibility-verification",
    timestamp: "Yesterday, 4:08 PM",
    bucket: "yesterday",
    read: true,
  },
  {
    id: "alt-004",
    severity: "critical",
    category: "billing",
    title: "Claim denied — T2022",
    description:
      "Claim for $87.00 was denied by payer due to missing prior authorization. Re-submit after correction.",
    sourceLabel: "Joseph Brown · Contact Notes",
    sourceModule: "Contact Notes",
    href: "/people/1/contact-note",
    timestamp: "Yesterday, 11:42 AM",
    bucket: "yesterday",
    read: false,
  },
  {
    id: "alt-005",
    severity: "good",
    category: "system",
    title: "PCP compliance up 6.2% this month",
    description:
      "Your caseload's Person-Centered Plan compliance rate improved from 88.4% to 94.6%.",
    sourceLabel: "Dashboard · Compliance Agent",
    sourceModule: "Dashboard",
    href: "/dashboard",
    timestamp: "Mon, 9:00 AM",
    bucket: "thisWeek",
    read: true,
  },
  {
    id: "alt-006",
    severity: "warning",
    category: "documents",
    title: "Document expiring in 30 days",
    description:
      "Joseph Brown's Insurance Card (Blue Cross 2026) is set to expire on 12/31/2026.",
    sourceLabel: "Joseph Brown · Documents",
    sourceModule: "Documents",
    href: "/people/1/documents",
    timestamp: "Mon, 8:00 AM",
    bucket: "thisWeek",
    read: true,
  },
];

// ----- Seed mentions for Kathy Adams ----------------------------------------

export const seedMentions: MentionItem[] = [
  {
    id: "men-001",
    authorName: "Jennie Thollander",
    authorInitials: "JT",
    authorRole: "supervisor",
    contextLabel: "a task comment — Complete monitoring form",
    contextModule: "Case Management",
    excerpt:
      "...@Kathy can you review this before submitting? The behavioral section needs your input before we can close it out...",
    mentionToken: "@Kathy",
    href: "/people/1/case-management",
    timestamp: "Today, 9:42 AM",
    bucket: "today",
    read: false,
  },
  {
    id: "men-002",
    authorName: "Babar Nawaz",
    authorInitials: "BN",
    authorRole: "admin",
    contextLabel: "an incident report — ID 99225",
    contextModule: "Incident Reporting",
    excerpt:
      "...assigning @Kathy as the follow-up coordinator for this incident. Please contact the family within 24 hours...",
    mentionToken: "@Kathy",
    href: "/people/1/incident-reporting",
    timestamp: "Yesterday, 2:15 PM",
    bucket: "yesterday",
    read: true,
  },
];

// ----- Helpers --------------------------------------------------------------

export function bucketLabel(b: AlertItem["bucket"]): string {
  return b === "today"
    ? "Today"
    : b === "yesterday"
      ? "Yesterday"
      : b === "thisWeek"
        ? "This week"
        : "Earlier";
}

export function severityTone(s: AlertSeverity) {
  switch (s) {
    case "critical":
      return {
        wrap: "bg-icm-red-soft text-icm-red ring-icm-red/20",
        border: "border-l-icm-red",
        label: "URGENT",
      };
    case "warning":
      return {
        wrap: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20",
        border: "border-l-icm-amber",
        label: "WARNING",
      };
    case "info":
      return {
        wrap: "bg-icm-accent-soft text-icm-accent ring-icm-accent/20",
        border: "border-l-icm-accent",
        label: "INFO",
      };
    case "good":
      return {
        wrap: "bg-icm-green-soft text-icm-green ring-icm-green/20",
        border: "border-l-icm-green",
        label: "GOOD NEWS",
      };
  }
}

export function categoryLabel(c: AlertCategory): string {
  return c === "compliance"
    ? "Compliance"
    : c === "billing"
      ? "Billing"
      : c === "documents"
        ? "Documents"
        : c === "clinical"
          ? "Clinical"
          : "System";
}

export function roleAvatarTone(r: MentionItem["authorRole"]): string {
  switch (r) {
    case "admin":
      return "bg-icm-accent-soft text-icm-accent ring-icm-accent/20";
    case "supervisor":
      return "bg-icm-green-soft text-icm-green ring-icm-green/20";
    case "case_manager":
      return "bg-purple-50 text-purple-600 ring-purple-200";
    case "billing":
      return "bg-icm-amber-soft text-icm-amber ring-icm-amber/20";
  }
}
