// AI Care Assistant — demo data layer
// Stores check-in sessions in localStorage so the bot page (public route)
// and the staff My Work / Communications Log views share state.

export type CheckInRole = "bot" | "individual";

export interface CheckInMessage {
  id: string;
  role: CheckInRole;
  text: string;
  ts: number;
}

export type TopicKey =
  | "health"
  | "service"
  | "employment"
  | "satisfaction"
  | "funding"
  | "medical"
  | "crisis";

export interface AICheckInTask {
  id: string;
  name: string;
  dueDate: string; // MM/DD/YYYY
  priority: "Low" | "Medium" | "High" | "Critical";
  topic: TopicKey;
}

export interface AICheckInSession {
  id: string;
  individualId: string;
  individualName: string;
  caseManager: string;
  county: string;
  startedAt: number;
  endedAt: number;
  durationLabel: string;
  contactType: "AI Care Assistant Check-In";
  transcript: CheckInMessage[];
  summary: string;
  detectedTopics: { key: TopicKey; label: string }[];
  tasks: AICheckInTask[];
  urgent: boolean;
  status: "Pending Review" | "Reviewed";
  firstName: string;
}

export const TOKEN_MAP: Record<
  string,
  { individualId: string; individualName: string; firstName: string; caseManager: string; county: string; phone: string }
> = {
  "joseph-brown-001": {
    individualId: "1",
    individualName: "Joseph Brown",
    firstName: "Joseph",
    caseManager: "Kathy Adams",
    county: "Carroll County",
    phone: "(410) 555-0101",
  },
  "joseph-brown-001b": {
    individualId: "1",
    individualName: "Joseph Brown",
    firstName: "Joseph",
    caseManager: "Kathy Adams",
    county: "Carroll County",
    phone: "(410) 555-0101",
  },
  "travis-langston-002": {
    individualId: "2",
    individualName: "Travis Langston",
    firstName: "Travis",
    caseManager: "Babar Nawaz CM",
    county: "Howard County",
    phone: "(410) 555-0202",
  },
  "ashley-walker-003": {
    individualId: "3",
    individualName: "Ashley Walker",
    firstName: "Ashley",
    caseManager: "Babar Nawaz CM",
    county: "Howard County",
    phone: "(410) 555-0303",
  },
};

export function tokenForIndividual(id: string): string {
  if (id === "1") return "joseph-brown-001";
  if (id === "2") return "travis-langston-002";
  if (id === "3") return "ashley-walker-003";
  return `person-${id}-001`;
}

export function openingMessage(firstName: string): string {
  if (firstName === "Joseph")
    return "Hi Joseph! I'm your Care Assistant. I'm here to check in with you and make sure you have everything you need. You can talk to me or type — whatever feels easier. How are you doing today?";
  if (firstName === "Travis")
    return "Hi Travis! I'm your Care Assistant. I'm here to check in with you today. How are you feeling?";
  if (firstName === "Ashley")
    return "Hi Ashley! I'm your Care Assistant. It's good to hear from you. How are you doing today?";
  return `Hi ${firstName}! I'm your Care Assistant. How are you doing today?`;
}

const KEYWORDS: Record<TopicKey, string[]> = {
  crisis: ["emergency", "crisis", "hurt myself", "danger", "unsafe", "scared", "suicide", "kill"],
  health: ["not good", "bad", "sick", "not feeling", "tired", "pain", "hurt", "ill", "unwell"],
  service: ["service", "program", "change", "different", "stop", "cancel", "switch"],
  funding: ["money", "funding", "hours", "more hours", "not enough", "authorization"],
  employment: ["job", "work", "employment", "career", "working"],
  satisfaction: ["happy", "satisfied", "love it", "great services", "doing well"],
  medical: ["doctor", "appointment", "medical", "medication", "prescription"],
};

const GOODBYE = ["done", "finished", "bye", "goodbye", "that's all", "nothing else", "thank you"];
const GOOD = ["good", "fine", "okay", "ok ", "great", "well"];
const HELP = ["help"];

export interface BotMatch {
  reply: string;
  topic?: TopicKey;
  end?: boolean;
}

function hasAny(text: string, words: string[]): boolean {
  const t = ` ${text.toLowerCase()} `;
  return words.some((w) => t.includes(w.toLowerCase()));
}

export function matchBotReply(input: string, firstName: string): BotMatch {
  const text = input.trim();
  if (hasAny(text, KEYWORDS.crisis) || hasAny(text, HELP)) {
    if (hasAny(text, KEYWORDS.crisis)) {
      return {
        reply:
          "I hear you and I want to make sure you're safe. If you are in immediate danger, please call 911 right now. I am also sending an urgent alert to your case manager immediately. You are not alone — someone will reach out to you very soon. Are you in a safe place right now?",
        topic: "crisis",
      };
    }
  }
  if (hasAny(text, GOODBYE)) {
    return {
      reply: `Thank you so much for checking in today, ${firstName}. I've noted everything you shared and your case manager will follow up with you soon. You can always come back here anytime you need to reach out. Take care! 😊`,
      end: true,
    };
  }
  if (hasAny(text, KEYWORDS.health)) {
    return {
      reply:
        "I'm sorry to hear that. Your health is really important. Can you tell me a little more about what's going on? Is this something that just started, or have you been feeling this way for a while?",
      topic: "health",
    };
  }
  if (hasAny(text, KEYWORDS.funding)) {
    return {
      reply:
        "I understand — funding and service hours are really important. I'm going to make a note of this for your case manager so they can review your current authorization and see what options are available. Is there anything specific you'd like them to know?",
      topic: "funding",
    };
  }
  if (hasAny(text, KEYWORDS.service)) {
    return {
      reply:
        "Got it — it sounds like you may want to make a change to one of your services. Your case manager will definitely look into that for you. Can you tell me which service you're thinking about and what kind of change you'd like?",
      topic: "service",
    };
  }
  if (hasAny(text, KEYWORDS.employment)) {
    return {
      reply:
        "That's exciting! Exploring employment is something your care team can definitely help with. I'll let your case manager know you're interested. Have you thought about what kind of work you might enjoy?",
      topic: "employment",
    };
  }
  if (hasAny(text, KEYWORDS.medical)) {
    return {
      reply:
        "Thanks for letting me know. Staying on top of medical care is really important. I'll add a note for your case manager to follow up with you about this. Do you need help scheduling an appointment, or is there something specific going on with your medication?",
      topic: "medical",
    };
  }
  if (hasAny(text, KEYWORDS.satisfaction)) {
    return {
      reply:
        "That's wonderful to hear! I'll make sure your case manager knows things are going well. Is there anything at all you'd want to change or improve, even a small thing?",
      topic: "satisfaction",
    };
  }
  if (hasAny(text, GOOD)) {
    return {
      reply:
        "That's great to hear! I want to make sure things are going smoothly for you. Are you happy with the services you're receiving right now — like your day program or any in-home support?",
    };
  }
  return {
    reply:
      "Thank you for sharing that. I want to make sure your case manager has all the details. Can you tell me a little more so I can pass along the right information?",
  };
}

const TOPIC_LABELS: Record<TopicKey, string> = {
  health: "Health Concern",
  service: "Service Change Request",
  employment: "Employment Interest",
  satisfaction: "Satisfaction Check",
  funding: "Authorization / Funding Question",
  medical: "Medical / Appointment",
  crisis: "⚠️ Safety Flag",
};

export function topicLabel(k: TopicKey): string {
  return TOPIC_LABELS[k];
}

function fmtDateMDY(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}/${d.getFullYear()}`;
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return fmtDateMDY(d);
}

export function buildSummary(firstName: string, topics: TopicKey[]): string {
  if (topics.includes("crisis"))
    return `⚠️ URGENT: ${firstName} used language that may indicate a safety concern. Immediate follow-up required.`;
  const parts: string[] = [];
  if (topics.includes("health"))
    parts.push(`${firstName} reported not feeling well and described a health concern.`);
  if (topics.includes("service"))
    parts.push(`${firstName} expressed interest in changing or discussing current services.`);
  if (topics.includes("employment"))
    parts.push(`${firstName} expressed interest in exploring employment opportunities.`);
  if (topics.includes("satisfaction"))
    parts.push(`${firstName} reported satisfaction with current services and supports.`);
  if (topics.includes("funding"))
    parts.push(`${firstName} raised questions about service authorization or funding hours.`);
  if (topics.includes("medical"))
    parts.push(`${firstName} mentioned a medical or appointment-related need.`);
  if (parts.length === 0)
    return `${firstName} completed a routine AI check-in. No specific concerns were flagged.`;
  return parts.join(" ");
}

export function buildTasks(firstName: string, topics: TopicKey[]): AICheckInTask[] {
  const out: AICheckInTask[] = [];
  const mk = (topic: TopicKey, name: string, days: number, priority: AICheckInTask["priority"]) =>
    out.push({ id: `AIT-${topic}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, dueDate: days === 0 ? fmtDateMDY(new Date()) : addDays(days), priority, topic });
  if (topics.includes("crisis"))
    mk("crisis", `⚠️ URGENT: Safety concern flagged in AI check-in — contact ${firstName} immediately`, 0, "Critical");
  if (topics.includes("health"))
    mk("health", `Follow up on health concern reported by ${firstName} — check if medical attention needed`, 2, "High");
  if (topics.includes("service"))
    mk("service", `Review service change request from ${firstName} — discuss in next contact`, 5, "Medium");
  if (topics.includes("employment"))
    mk("employment", `Explore employment referral options for ${firstName} — add goal to care plan if appropriate`, 7, "Medium");
  if (topics.includes("funding"))
    mk("funding", `Review service authorization for ${firstName} — individual flagged concern about hours/funding`, 3, "High");
  if (topics.includes("medical"))
    mk("medical", `Follow up on medical concern reported by ${firstName} — confirm appointment status`, 3, "High");
  return out;
}

const STORE_KEY = "cm_ai_checkins_v1";

export function loadCheckIns(): AICheckInSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return seedCheckIns();
    const arr = JSON.parse(raw) as AICheckInSession[];
    return Array.isArray(arr) ? arr : seedCheckIns();
  } catch {
    return seedCheckIns();
  }
}

export function saveCheckIns(list: AICheckInSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("cm_ai_checkins_changed"));
}

export function appendCheckIn(s: AICheckInSession): void {
  const list = loadCheckIns();
  saveCheckIns([s, ...list]);
}

export function updateCheckInStatus(id: string, status: AICheckInSession["status"]): void {
  const list = loadCheckIns().map((c) => (c.id === id ? { ...c, status } : c));
  saveCheckIns(list);
}

function seedCheckIns(): AICheckInSession[] {
  // Yesterday: Travis — service change, reviewed (supervisor view demo)
  const yesterday = Date.now() - 86400000;
  const travisTopics: TopicKey[] = ["service"];
  const seed: AICheckInSession = {
    id: `CHK-seed-travis`,
    individualId: "2",
    individualName: "Travis Langston",
    firstName: "Travis",
    caseManager: "Babar Nawaz CM",
    county: "Howard County",
    startedAt: yesterday,
    endedAt: yesterday + 240000,
    durationLabel: "4 min 00 sec",
    contactType: "AI Care Assistant Check-In",
    transcript: [
      { id: "m1", role: "bot", text: openingMessage("Travis"), ts: yesterday },
      { id: "m2", role: "individual", text: "I'd like to change my day program — it doesn't fit my schedule anymore.", ts: yesterday + 30000 },
      { id: "m3", role: "bot", text: matchBotReply("change my program", "Travis").reply, ts: yesterday + 60000 },
      { id: "m4", role: "individual", text: "Thank you, that's all for now.", ts: yesterday + 220000 },
      { id: "m5", role: "bot", text: matchBotReply("thank you", "Travis").reply, ts: yesterday + 240000 },
    ],
    summary: buildSummary("Travis", travisTopics),
    detectedTopics: travisTopics.map((k) => ({ key: k, label: topicLabel(k) })),
    tasks: buildTasks("Travis", travisTopics),
    urgent: false,
    status: "Reviewed",
  };
  const initial = [seed];
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(initial));
  } catch {
    /* ignore */
  }
  return initial;
}
