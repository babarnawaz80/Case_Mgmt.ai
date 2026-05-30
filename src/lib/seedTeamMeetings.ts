import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function seedTeamMeetingsIfEmpty(orgId: string, userId: string): Promise<void> {
  try {
    // Check if team_meetings already exist for this org
    const existingSnap = await getDocs(
      query(collection(db, "team_meetings"), where("organizationId", "==", orgId))
    );
    if (!existingSnap.empty) return;

    // Find first individual in the org
    const individualsSnap = await getDocs(
      query(collection(db, "individuals"), where("organizationId", "==", orgId))
    );
    if (individualsSnap.empty) return;

    const firstInd = individualsSnap.docs[0];
    const indData = firstInd.data();
    const individualId = firstInd.id;
    const individualName = `${indData.first_name ?? "Unknown"} ${indData.last_name ?? ""}`.trim();

    // Meeting 1: Annual PCP, status: minutes_draft, 05/28/2026
    await addDoc(collection(db, "team_meetings"), {
      organizationId: orgId,
      individualId,
      individualName,
      meetingType: "annual_pcp",
      meetingDate: Timestamp.fromDate(new Date("2026-05-28T10:00:00")),
      startTime: "10:00",
      endTime: "11:30",
      location: "in_person",
      locationDetail: "Agency Conference Room B",
      status: "minutes_draft",
      transcriptSource: "file_upload",
      transcriptText: "Meeting transcript content for the Annual PCP Review...",
      consentAcknowledged: true,
      consentAcknowledgedBy: userId,
      consentAcknowledgedAt: Timestamp.fromDate(new Date("2026-05-28T09:55:00")),
      attendees: [
        { name: individualName, role: "Individual Supported", organization: "Self" },
        { name: "Margaret Thompson", role: "Guardian/Parent", organization: "Family" },
        { name: "Kathy Martinez", role: "Case Manager", organization: "Demo Agency" },
        { name: "Dr. Sarah Patel", role: "Behavioral Support Specialist", organization: "BH Partners" },
        { name: "James Wilson", role: "Supervisor", organization: "Demo Agency" },
      ],
      agendaItemsCovered: [
        "Review of annual goals and progress",
        "Employment exploration update",
        "Day program concerns from guardian",
        "MA redetermination upcoming deadline",
        "Next steps and action items",
      ],
      decisions: [
        { decision: "Employment exploration goal will be added to care plan", madeBy: "Kathy Martinez" },
        { decision: "Day program change request will be submitted within 30 days", madeBy: "James Wilson" },
      ],
      actionItems: [
        {
          description: "Add employment exploration goal to care plan",
          assignedTo: "Kathy Martinez",
          assignedToRole: "Case Manager",
          dueDate: "2026-06-14",
          priority: "high",
          relatedGoal: "Employment",
        },
        {
          description: "Submit day program change request form",
          assignedTo: "Kathy Martinez",
          assignedToRole: "Case Manager",
          dueDate: "2026-06-28",
          priority: "high",
          relatedGoal: "Day Services",
        },
        {
          description: "Submit MA redetermination paperwork",
          assignedTo: "Kathy Martinez",
          assignedToRole: "Case Manager",
          dueDate: "2026-06-01",
          priority: "high",
          relatedGoal: "Medicaid",
        },
      ],
      planChangesDiscussed: [
        {
          changeType: "new_goal",
          description: "Employment exploration goal — 10 hrs/week community-integrated work",
          requiresAmendment: true,
        },
      ],
      complianceFlags: [
        {
          flag: "Employment goal mentioned in meeting but not currently in care plan",
          severity: "warning",
          suggestedAction: "Add employment exploration goal to active care plan within 14 days",
        },
        {
          flag: "Day program concern raised — may require provider change authorization",
          severity: "info",
          suggestedAction: "Obtain prior authorization before initiating provider change",
        },
      ],
      minutesNarrative: `The Annual Person-Centered Planning (PCP) meeting was held on May 28, 2026, at the agency conference room with five attendees including the individual, their guardian Margaret Thompson, the case manager, behavioral support specialist, and supervisor. The meeting reviewed progress toward all active care plan goals and addressed new priorities identified by the team.

The most significant discussion centered on employment exploration, with the team agreeing to add a new goal targeting 10 hours per week of community-integrated employment. The guardian also raised concerns about the current day program's fit, prompting a decision to submit a provider change request within 30 days.

An urgent action item was identified regarding the upcoming MA redetermination deadline on June 1st. The case manager was assigned responsibility for submitting all required paperwork immediately. Two compliance flags were raised: the employment goal must be added to the formal care plan, and a prior authorization will be required before any day program provider change can be initiated.

The next annual PCP review is tentatively scheduled for May 2027, with a quarterly check-in planned for August 2026.`,
      nextMeetingDate: Timestamp.fromDate(new Date("2026-08-15T10:00:00")),
      nextMeetingType: "quarterly_review",
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
    });

    // Meeting 2: Quarterly Review, status: published, 02/14/2026
    await addDoc(collection(db, "team_meetings"), {
      organizationId: orgId,
      individualId,
      individualName,
      meetingType: "quarterly_review",
      meetingDate: Timestamp.fromDate(new Date("2026-02-14T14:00:00")),
      startTime: "14:00",
      endTime: "15:00",
      location: "zoom",
      locationDetail: "https://zoom.us/j/example",
      status: "published",
      transcriptSource: "ambient",
      consentAcknowledged: true,
      consentAcknowledgedBy: userId,
      consentAcknowledgedAt: Timestamp.fromDate(new Date("2026-02-14T13:55:00")),
      attendees: [
        { name: individualName, role: "Individual Supported", organization: "Self" },
        { name: "Kathy Martinez", role: "Case Manager", organization: "Demo Agency" },
        { name: "Margaret Thompson", role: "Guardian/Parent", organization: "Family" },
      ],
      agendaItemsCovered: [
        "Q4 goal progress review",
        "Community integration activities",
        "Health and wellness check-in",
      ],
      decisions: [
        { decision: "Continue current service plan through end of quarter", madeBy: "Kathy Martinez" },
      ],
      actionItems: [
        {
          description: "Schedule health and wellness appointment",
          assignedTo: "Kathy Martinez",
          assignedToRole: "Case Manager",
          dueDate: "2026-03-01",
          priority: "medium",
          relatedGoal: "Health",
        },
      ],
      planChangesDiscussed: [],
      complianceFlags: [],
      minutesNarrative: `The quarterly review meeting was held virtually via Zoom on February 14, 2026, with three attendees. The team reviewed progress toward all active Q4 goals and found that the individual is meeting or exceeding expectations in community integration activities.

Health and wellness was discussed, with the team agreeing to schedule a routine appointment in the coming weeks. No plan amendments were required at this time. The current service plan will continue through the end of the quarter, with the next review scheduled for May 2026.`,
      minutesPublishedAt: Timestamp.fromDate(new Date("2026-02-14T16:00:00")),
      minutesPublishedBy: userId,
      minutesPublishedByName: "Kathy Martinez",
      tasksCreated: [],
      nextMeetingDate: Timestamp.fromDate(new Date("2026-05-28T10:00:00")),
      nextMeetingType: "annual_pcp",
      createdAt: Timestamp.fromDate(new Date("2026-02-14T14:00:00")),
      createdBy: userId,
      updatedAt: Timestamp.fromDate(new Date("2026-02-14T16:00:00")),
    });
  } catch (err) {
    console.warn("[seedTeamMeetings] Non-fatal seed error:", err);
  }
}
