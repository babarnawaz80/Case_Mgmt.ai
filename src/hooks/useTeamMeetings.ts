import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type MeetingStatus = 'scheduled' | 'in_progress' | 'transcript_received' | 'minutes_draft' | 'published';
export type MeetingType = 'annual_pcp' | 'quarterly_review' | 'transition_planning' | 'crisis' | 'initial_plan' | 'other';
export type TranscriptSource = 'ambient' | 'file_upload' | 'manual_paste' | 'audio_upload';
export type MeetingLocation = 'in_person' | 'zoom' | 'meet' | 'phone' | 'televisit' | 'other';

export interface TeamMeeting {
  id: string;
  organizationId: string;
  individualId: string;
  individualName: string;
  meetingType: MeetingType;
  meetingDate: any;  // Timestamp
  startTime: string;
  endTime?: string;
  location: MeetingLocation;
  locationDetail?: string;
  status: MeetingStatus;
  transcriptSource?: TranscriptSource;
  transcriptText?: string;
  transcriptFileUrl?: string;
  transcriptProcessedAt?: any;
  consentAcknowledged: boolean;
  consentAcknowledgedBy?: string;
  consentAcknowledgedAt?: any;
  attendees?: any[];
  agendaItemsCovered?: string[];
  decisions?: any[];
  actionItems?: any[];
  planChangesDiscussed?: any[];
  complianceFlags?: any[];
  nextMeetingDate?: any;
  nextMeetingType?: string;
  minutesNarrative?: string;
  minutesPublishedAt?: any;
  minutesPublishedBy?: string;
  minutesPublishedByName?: string;
  tasksCreated?: string[];
  ambientSessionId?: string;
  linkedCarePlanId?: string;
  agenda?: string;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
}

export function useTeamMeetings(individualId?: string) {
  const { userProfile } = useAuth();
  const [meetings, setMeetings] = useState<TeamMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.organizationId) { setLoading(false); return; }

    const constraints: any[] = [where("organizationId", "==", userProfile.organizationId)];
    if (individualId) constraints.push(where("individualId", "==", individualId));

    const q = query(collection(db, "team_meetings"), ...constraints);
    const unsub = onSnapshot(q, snap => {
      setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamMeeting))
        .sort((a, b) => (b.meetingDate?.toMillis?.() ?? 0) - (a.meetingDate?.toMillis?.() ?? 0)));
      setLoading(false);
    }, () => { setLoading(false); });
    return unsub;
  }, [userProfile?.organizationId, individualId]);

  return { meetings, loading };
}

export async function createTeamMeeting(data: Omit<TeamMeeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, "team_meetings"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTeamMeeting(id: string, updates: Partial<TeamMeeting>): Promise<void> {
  await updateDoc(doc(db, "team_meetings", id), { ...updates, updatedAt: serverTimestamp() });
}

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  annual_pcp: "Annual PCP Review",
  quarterly_review: "Quarterly Review",
  transition_planning: "Transition Planning",
  crisis: "Crisis Meeting",
  initial_plan: "Initial Plan Meeting",
  other: "Other",
};

export const MEETING_LOCATION_LABELS: Record<MeetingLocation, string> = {
  in_person: "In-Person",
  zoom: "Virtual (Zoom)",
  meet: "Virtual (Google Meet)",
  phone: "Phone",
  televisit: "Our Televisit",
  other: "Other",
};
