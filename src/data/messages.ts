// Mock data for the internal staff messaging system.
// Conversations can be direct (2 users) or group (3+).
// Messages may include linked individual records or AI summaries.

export type StaffRole = "admin" | "supervisor" | "case_manager" | "billing";

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  role: StaffRole;
  title: string;
  online: boolean;
}

export type MessageKind = "text" | "linked_record" | "file" | "ai_summary" | "system";

export interface LinkedRecord {
  moduleIcon: "note" | "monitoring" | "isp" | "incident" | "assessment" | "referral";
  moduleLabel: string; // "Contact Note"
  individualName: string; // "Joseph Brown"
  detail: string; // "Quarterly visit completed 04/27/2026"
  href: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  authorId: string; // "you" for current user
  kind: MessageKind;
  text?: string;
  linkedRecord?: LinkedRecord;
  fileName?: string;
  fileSize?: string;
  aiTitle?: string;
  aiHref?: string;
  systemText?: string;
  timestamp: string; // "Today 9:15 AM"
  dayBucket: "today" | "yesterday" | "earlier";
  dayLabel: string; // "Today" / "Yesterday" / "Monday, April 21"
  // Read receipt status for messages you sent.
  receipt?: "delivered" | "seen" | "read";
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  // For direct: the other user. For group: undefined; use members instead.
  memberIds: string[]; // includes "you"
  groupName?: string;
  lastPreview: string;
  lastTimestamp: string;
  lastWasYou: boolean;
  unread: number;
  muted?: boolean;
}

// ----- Staff directory -----------------------------------------------------

export const CURRENT_USER_ID = "you";

export const staffById: Record<string, StaffMember> = {
  you: {
    id: "you",
    name: "Kathy Adams",
    initials: "KA",
    role: "case_manager",
    title: "Case Manager",
    online: true,
  },
  jennie: {
    id: "jennie",
    name: "Jennie Thollander",
    initials: "JT",
    role: "supervisor",
    title: "Supervisor",
    online: true,
  },
  babar: {
    id: "babar",
    name: "Babar Nawaz",
    initials: "BN",
    role: "admin",
    title: "Admin",
    online: false,
  },
  marcy: {
    id: "marcy",
    name: "Marcy Bennett",
    initials: "MB",
    role: "case_manager",
    title: "Case Manager",
    online: false,
  },
  demo: {
    id: "demo",
    name: "Demo Case Manager",
    initials: "DC",
    role: "case_manager",
    title: "Case Manager",
    online: false,
  },
};

export const allStaff: StaffMember[] = Object.values(staffById).filter(
  (s) => s.id !== CURRENT_USER_ID
);

// ----- Seed conversations --------------------------------------------------

export const seedConversations: Conversation[] = [
  {
    id: "c-jennie",
    type: "direct",
    memberIds: ["you", "jennie"],
    lastPreview:
      "Can you review Joseph's monitoring form before you submit? I want to double check the behavioral section.",
    lastTimestamp: "Yesterday, 3:45 PM",
    lastWasYou: false,
    unread: 1,
  },
  {
    id: "c-babar",
    type: "direct",
    memberIds: ["you", "babar"],
    lastPreview:
      "The compliance agent found some issues with Joseph's ISP. Can you take a look?",
    lastTimestamp: "Tue, 11:18 AM",
    lastWasYou: false,
    unread: 0,
  },
  {
    id: "c-team",
    type: "group",
    memberIds: ["you", "jennie", "babar"],
    groupName: "Case Management Team",
    lastPreview:
      "Team — reminder that IPMG demo is next week. Let's make sure all demo individuals have complete records.",
    lastTimestamp: "Mon, 8:02 AM",
    lastWasYou: false,
    unread: 0,
  },
];

// ----- Seed messages -------------------------------------------------------

export const seedMessages: ChatMessage[] = [
  // -- Kathy <-> Jennie ----------------------------------------------------
  {
    id: "m-j-1",
    conversationId: "c-jennie",
    authorId: "you",
    kind: "text",
    text: "Hey @Jennie, I'm about to start Joseph's quarterly monitoring form. Any updates from your end I should know about?",
    timestamp: "Today, 9:15 AM",
    dayBucket: "today",
    dayLabel: "Today",
    receipt: "seen",
  },
  {
    id: "m-j-2",
    conversationId: "c-jennie",
    authorId: "jennie",
    kind: "text",
    text: "Can you review Joseph's monitoring form before you submit? I want to double check the behavioral section.",
    timestamp: "Yesterday, 3:45 PM",
    dayBucket: "yesterday",
    dayLabel: "Yesterday",
  },
  {
    id: "m-j-3",
    conversationId: "c-jennie",
    authorId: "jennie",
    kind: "linked_record",
    linkedRecord: {
      moduleIcon: "monitoring",
      moduleLabel: "Monitoring Form",
      individualName: "Joseph Brown",
      detail: "Due 04/09/2026",
      href: "/people/1/monitoring-form",
    },
    timestamp: "Yesterday, 3:45 PM",
    dayBucket: "yesterday",
    dayLabel: "Yesterday",
  },

  // -- Kathy <-> Babar -----------------------------------------------------
  {
    id: "m-b-1",
    conversationId: "c-babar",
    authorId: "babar",
    kind: "text",
    text: "The compliance agent found some issues with Joseph's ISP. Can you take a look?",
    timestamp: "Tue, 11:18 AM",
    dayBucket: "earlier",
    dayLabel: "Tuesday, April 21",
  },
  {
    id: "m-b-2",
    conversationId: "c-babar",
    authorId: "babar",
    kind: "ai_summary",
    aiTitle:
      "Compliance Agent flagged 2 issues on Joseph Brown's ISP: missing transportation goal and outdated emergency contact.",
    aiHref: "/people/1/care-plan",
    timestamp: "Tue, 11:19 AM",
    dayBucket: "earlier",
    dayLabel: "Tuesday, April 21",
  },
  {
    id: "m-b-3",
    conversationId: "c-babar",
    authorId: "you",
    kind: "text",
    text: "Got it — I'll review this morning and circle back.",
    timestamp: "Tue, 11:42 AM",
    dayBucket: "earlier",
    dayLabel: "Tuesday, April 21",
    receipt: "read",
  },

  // -- Group: Case Management Team ----------------------------------------
  {
    id: "m-g-1",
    conversationId: "c-team",
    authorId: "babar",
    kind: "text",
    text: "Team — reminder that IPMG demo is next week. Let's make sure all demo individuals have complete records.",
    timestamp: "Mon, 8:02 AM",
    dayBucket: "earlier",
    dayLabel: "Monday, April 20",
  },
  {
    id: "m-g-2",
    conversationId: "c-team",
    authorId: "jennie",
    kind: "text",
    text: "Will do. @Kathy can you confirm Joseph's documents are uploaded?",
    timestamp: "Mon, 8:14 AM",
    dayBucket: "earlier",
    dayLabel: "Monday, April 20",
  },
  {
    id: "m-g-3",
    conversationId: "c-team",
    authorId: "you",
    kind: "text",
    text: "All set — uploaded the latest insurance card and consent forms last week.",
    timestamp: "Mon, 8:30 AM",
    dayBucket: "earlier",
    dayLabel: "Monday, April 20",
    receipt: "read",
  },
];

// ----- Helpers -------------------------------------------------------------

export function conversationDisplayName(c: Conversation): string {
  if (c.type === "group") {
    if (c.groupName) return c.groupName;
    const others = c.memberIds
      .filter((id) => id !== CURRENT_USER_ID)
      .map((id) => staffById[id]?.name.split(" ")[0])
      .filter(Boolean);
    return others.join(", ");
  }
  const otherId = c.memberIds.find((id) => id !== CURRENT_USER_ID);
  return otherId ? staffById[otherId].name : "Unknown";
}

export function conversationOtherMember(c: Conversation): StaffMember | null {
  if (c.type !== "direct") return null;
  const otherId = c.memberIds.find((id) => id !== CURRENT_USER_ID);
  return otherId ? staffById[otherId] : null;
}

export function roleAvatarTone(r: StaffRole): string {
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

export function roleLabel(r: StaffRole): string {
  return r === "admin"
    ? "Admin"
    : r === "supervisor"
      ? "Supervisor"
      : r === "case_manager"
        ? "Case Manager"
        : "Billing";
}
