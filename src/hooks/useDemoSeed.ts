/**
 * useDemoSeed.ts
 * CaseManagement.AI — Auto Demo Seeder
 *
 * Exports seedDemoIfEmpty(), called once on login by AuthContext.
 * Ensures:
 *   1. users/{uid} document exists (required by Cloud Functions)
 *   2. organizations/{orgId} document exists (required by Cloud Functions)
 *   3. If no individuals exist, seeds 3 demo participants with progress notes
 *
 * Fully idempotent — safe to call on every login.
 * All errors are swallowed; this function never throws.
 */

import {
  collection,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  setDoc,
  getDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Date helpers ───────────────────────────────────────────────────────────

function pastDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function futureDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

function pastTimestamp(daysAgo: number): Timestamp {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return Timestamp.fromDate(d);
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Ensures user profile + org exist, then seeds demo individuals if empty.
 * Called by AuthContext after successful login.
 */
export async function seedDemoIfEmpty(
  organizationId: string,
  userId: string,
  userName: string,
): Promise<void> {
  try {
    // ── 1. Ensure organizations/{orgId} exists ──────────────────────────────
    const orgRef = doc(db, 'organizations', organizationId);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) {
      await setDoc(orgRef, {
        id: organizationId,
        name: 'CaseManagement Demo Org',
        primaryState: 'IN',
        programs: ['HCBS Waiver — Community Integration', 'HCBS Waiver — Supported Living', 'HCBS Waiver — Personal Care'],
        aiEnabled: true,
        aiPaused: false,
        creditBalance: 50000,
        lowAlertThresholdPct: 20,
        dailyLimit: 0,
        perUserLimit: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('[DemoSeed] ✅ Created organization doc:', organizationId);
    }

    // ── 2. Ensure users/{uid} exists with organizationId ───────────────────
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const nameParts = userName.trim().split(' ');
      const firstName = nameParts[0] ?? 'Demo';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      await setDoc(userRef, {
        uid: userId,
        email: '',            // will be filled by Firebase Auth
        displayName: userName || 'Demo User',
        firstName,
        lastName,
        role: 'admin',        // demo users get admin role so all features work
        organizationId,
        caseload: [],
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: new Date().toISOString(),
      }, { merge: true }); // merge so existing platform_admin role is never clobbered
      console.log('[DemoSeed] ✅ Created user doc:', userId);
    } else {
      // Ensure organizationId and role fields are present even on existing docs
      const existingData = userSnap.data();
      const needsUpdate = !existingData.organizationId || !existingData.role;
      // NEVER downgrade a platform_admin role
      const safeRole = existingData.role === 'platform_admin' ? 'platform_admin'
                     : (existingData.role || 'admin');
      if (needsUpdate) {
        await setDoc(userRef, {
          organizationId: existingData.organizationId || organizationId,
          role: safeRole,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        console.log('[DemoSeed] ✅ Updated user doc with missing fields:', userId);
      }
    }

    // ── 3. Guard: skip seeding individuals if they already exist ────────────
    const checkQ = query(
      collection(db, 'individuals'),
      where('organizationId', '==', organizationId),
      limit(1),
    );
    const existing = await getDocs(checkQ);
    if (!existing.empty) return; // already seeded

    console.log('[DemoSeed] No individuals found — seeding demo data…');

    // ── 4. Seed 3 individuals ────────────────────────────────────────────────
    const individualsData = [
      {
        organizationId,
        first_name: 'Marcus',
        last_name: 'Williams',
        preferred_name: 'Marcus',
        dob: '1978-04-12',
        gender: 'Male',
        county: 'Marion',
        program: 'HCBS Waiver — Community Integration',
        risk_score: 74,
        risk_level: 'high',
        enrollment_status: 'active' as const,
        medicaid_id: 'IN8847231',
        level_of_care: 'Level 3',
        assigned_case_manager: userId,
        assigned_case_manager_uid: userId,
        assigned_case_manager_name: userName,
        phone: '(317) 555-0142',
        address: '4821 N. College Ave, Indianapolis, IN 46205',
        emergency_contact_name: 'Diane Williams (Sister)',
        emergency_contact_phone: '(317) 555-0198',
        diagnosis: 'Intellectual Disability (F70), Hypertension',
        open_tasks: 3,
        open_incidents: 1,
        monitoring_compliance_pct: 78,
        last_visit_date: pastDateStr(8),
        next_visit_date: futureDateStr(6),
        pcp_due_date: futureDateStr(45),
        companion_link_active: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        organizationId,
        first_name: 'Darlene',
        last_name: 'Thompson',
        preferred_name: 'Darlene',
        dob: '1985-09-30',
        gender: 'Female',
        county: 'Marion',
        program: 'HCBS Waiver — Supported Living',
        risk_score: 48,
        risk_level: 'medium',
        enrollment_status: 'active' as const,
        medicaid_id: 'IN7712984',
        level_of_care: 'Level 2',
        assigned_case_manager: userId,
        assigned_case_manager_uid: userId,
        assigned_case_manager_name: userName,
        phone: '(317) 555-0277',
        address: '2210 W. Washington St, Indianapolis, IN 46222',
        emergency_contact_name: 'Roy Thompson (Brother)',
        emergency_contact_phone: '(317) 555-0311',
        diagnosis: 'Intellectual Disability (F70), Muscular Dystrophy (G71.00)',
        open_tasks: 2,
        open_incidents: 0,
        monitoring_compliance_pct: 91,
        last_visit_date: pastDateStr(5),
        next_visit_date: futureDateStr(3),
        pcp_due_date: futureDateStr(120),
        companion_link_active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        organizationId,
        first_name: 'Robert',
        last_name: 'Castillo',
        preferred_name: 'Bobby',
        dob: '1991-02-14',
        gender: 'Male',
        county: 'Hamilton',
        program: 'HCBS Waiver — Personal Care',
        risk_score: 22,
        risk_level: 'low',
        enrollment_status: 'active' as const,
        medicaid_id: 'IN9023417',
        level_of_care: 'Level 1',
        assigned_case_manager: userId,
        assigned_case_manager_uid: userId,
        assigned_case_manager_name: userName,
        phone: '(317) 555-0389',
        address: '833 Carmel Dr, Carmel, IN 46032',
        emergency_contact_name: 'Maria Castillo (Mother)',
        emergency_contact_phone: '(317) 555-0412',
        diagnosis: 'Multiple Sclerosis (G35), Mobility Impairment (Z74.01)',
        open_tasks: 1,
        open_incidents: 0,
        monitoring_compliance_pct: 100,
        last_visit_date: pastDateStr(12),
        next_visit_date: futureDateStr(18),
        pcp_due_date: futureDateStr(200),
        companion_link_active: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ];

    // ── 5. Write individuals and collect their IDs ────────────────────────────
    type IndRow = { id?: string; indId: string; firstName: string; fullName: string };
    const seededInds: IndRow[] = [];

    for (const indData of individualsData) {
      const ref = await addDoc(collection(db, 'individuals'), indData);
      seededInds.push({
        indId: ref.id,
        firstName: indData.first_name,
        fullName: `${indData.first_name} ${indData.last_name}`,
      });
    }

    // ── 6. Seed 2 progress notes per individual ───────────────────────────────
    for (const { indId, firstName, fullName } of seededInds) {
      const notes = [
        {
          organizationId,
          individualId: indId,
          authorId: userId,
          authorName: userName,
          activityType: 'Case Management',
          contactType: 'Home Visit',
          progressDate: pastDateStr(7),
          startTime: '10:00',
          endTime: '10:45',
          isBillable: true,
          purposeOfActivity: `Conducted scheduled home visit with ${firstName} to review current status, assess needs, and coordinate services. Discussed progress toward individualized support plan goals.`,
          goalsProgress: [
            {
              goalId: 'goal_1',
              goalText: 'Increase community integration and independence',
              progressStatus: 'progressing',
              narrative: `${firstName} is making gradual progress toward increased independence with daily living skills. No new barriers identified.`,
            },
          ],
          additionalObservations: `${fullName} was engaged and cooperative during the home visit. Current support plan appears to be meeting immediate needs.`,
          nextSteps: `Schedule next home visit within 30 days. Follow up on any outstanding referrals or service coordination items.`,
          status: 'signed',
          aiDrafted: false,
          signedAt: pastTimestamp(7),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        {
          organizationId,
          individualId: indId,
          authorId: userId,
          authorName: userName,
          activityType: 'Provider Coordination',
          contactType: 'Telephone',
          progressDate: pastDateStr(21),
          startTime: '14:00',
          endTime: '14:30',
          isBillable: true,
          purposeOfActivity: `Telephone check-in with ${firstName} to follow up on previous visit action items and confirm upcoming appointments.`,
          goalsProgress: [
            {
              goalId: 'goal_1',
              goalText: 'Increase community integration and independence',
              progressStatus: 'no_change',
              narrative: `No significant changes reported since last visit. ${firstName} confirmed all services are running as scheduled.`,
            },
          ],
          additionalObservations: `${fullName} reported no new concerns. Confirmed receipt of updated service schedule.`,
          nextSteps: `Continue with current service plan. Next in-person visit scheduled as planned.`,
          status: 'signed',
          aiDrafted: false,
          signedAt: pastTimestamp(21),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ];

      for (const note of notes) {
        await addDoc(collection(db, 'progress_notes'), note);
      }
    }

    console.log(
      `[DemoSeed] ✅ Seeded ${seededInds.length} individuals and ${seededInds.length * 2} progress notes.`,
    );

    // ── 5. Seed demo tasks ────────────────────────────────────────────────────
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = pastDateStr(1);
      const tomorrow = futureDateStr(1);
      const nextWeek = futureDateStr(7);
      const demoTasks = [
        {
          title: 'Progress Note Due — Williams, Marcus',
          description: 'Monthly progress note for Marcus Williams is overdue. Complete and sign.',
          individualId: seededInds[0]?.indId,
          individualName: 'Marcus Williams',
          dueDate: yesterday,
          status: 'open',
          priority: 'high',
          type: 'Progress Note Due',
          assignedTo: userId,
          organizationId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        {
          title: 'Care Plan Review — Thompson, Darlene',
          description: 'Annual Person-Centered Plan review is due. Schedule with IDT team.',
          individualId: seededInds[1]?.id,
          individualName: 'Darlene Thompson',
          dueDate: today,
          status: 'in_progress',
          priority: 'high',
          type: 'Care Plan Review',
          assignedTo: userId,
          organizationId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        {
          title: 'Eligibility Verification — Castillo, Robert',
          description: 'Medicaid eligibility expires next month — initiate renewal process.',
          individualId: seededInds[2]?.id,
          individualName: 'Robert Castillo',
          dueDate: tomorrow,
          status: 'open',
          priority: 'medium',
          type: 'Eligibility Verification',
          assignedTo: userId,
          organizationId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        {
          title: 'Monitoring Form — Williams, Marcus',
          description: 'Monthly monitoring form for behavioral support plan.',
          individualId: seededInds[0]?.id,
          individualName: 'Marcus Williams',
          dueDate: nextWeek,
          status: 'open',
          priority: 'low',
          type: 'Monitoring Form',
          assignedTo: userId,
          organizationId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      ];
      for (const task of demoTasks) {
        await addDoc(collection(db, 'tasks'), task);
      }
      console.log('[DemoSeed] ✅ Seeded demo tasks');
    } catch (taskErr) {
      console.warn('[DemoSeed] Task seeding failed:', taskErr);
    }

    // ── 6. Seed demo conversation + messages ─────────────────────────────────
    try {
      const supervisorUid = `supervisor-${organizationId}`;
      const supervisorName = 'Supervisor Account';
      const convRef = await addDoc(collection(db, 'conversations'), {
        members: [userId, supervisorUid],
        memberNames: { [userId]: userName, [supervisorUid]: supervisorName },
        type: 'direct',
        lastMessage: 'Let me know when the Williams care plan review is done.',
        lastMessageAt: serverTimestamp(),
        lastMessageBy: supervisorUid,
        unreadCounts: { [userId]: 1, [supervisorUid]: 0 },
        organizationId,
        createdAt: serverTimestamp(),
        createdBy: supervisorUid,
      });
      // Seed initial messages
      const messagesData = [
        {
          body: 'Hi! Just wanted to check in — the Williams care plan review is due this week.',
          senderId: supervisorUid,
          senderName: supervisorName,
          type: 'text',
          createdAt: pastTimestamp(1),
          readBy: [supervisorUid],
        },
        {
          body: 'Thanks for the heads up, I\'ll get started on it today.',
          senderId: userId,
          senderName: userName,
          type: 'text',
          createdAt: Timestamp.fromDate(new Date(Date.now() - 20 * 60000)),
          readBy: [userId],
        },
        {
          body: 'Let me know when the Williams care plan review is done.',
          senderId: supervisorUid,
          senderName: supervisorName,
          type: 'text',
          createdAt: Timestamp.fromDate(new Date(Date.now() - 5 * 60000)),
          readBy: [supervisorUid],
        },
      ];
      for (const msg of messagesData) {
        await addDoc(collection(db, 'conversations', convRef.id, 'messages'), msg);
      }
      console.log('[DemoSeed] ✅ Seeded demo conversation');
    } catch (convErr) {
      console.warn('[DemoSeed] Conversation seeding failed:', convErr);
    }

  } catch (err) {
    // Never throw — log quietly and move on
    console.warn('[DemoSeed] Seeding skipped or failed silently:', err);
  }
}

// ─── Demo Scheduled Visits ─────────────────────────────────────────────────

/**
 * Seeds 3 demo scheduled visits if no scheduled_visits exist for the org.
 * Uses the first active individuals found in the org to populate the visits
 * (tries Smith/Brown/Walker by name, falls back to first available).
 * Safe to call on every login — fully idempotent.
 */
export async function seedScheduledVisitsIfEmpty(
  organizationId: string,
  userId: string,
  userName: string,
): Promise<void> {
  try {
    // Guard: skip if any scheduled_visits already exist for this org
    const existing = await getDocs(
      query(
        collection(db, 'scheduled_visits'),
        where('organizationId', '==', organizationId),
        limit(1),
      )
    );
    if (!existing.empty) return;

    // Fetch active individuals
    const indsSnap = await getDocs(
      query(
        collection(db, 'individuals'),
        where('organizationId', '==', organizationId),
        limit(40),
      )
    );
    if (indsSnap.empty) return;

    const inds = indsSnap.docs.map((d) => ({
      id: d.id,
      first_name: d.data().first_name ?? '',
      last_name: d.data().last_name ?? '',
    }));

    // Helper: find by last name or fall back to index
    const find = (lastName: string, fallback: number) => {
      const match = inds.find((p) =>
        p.last_name.toLowerCase() === lastName.toLowerCase()
      );
      return match ?? inds[fallback] ?? inds[0];
    };

    const ind1 = find('Smith', 0);
    const ind2 = find('Brown', 1);
    const ind3 = find('Walker', 2);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = futureDateStr(1);

    const visits = [
      {
        organizationId,
        individual_id: ind1.id,
        individual_name: `${ind1.last_name}, ${ind1.first_name}`,
        visit_type: 'In-Home Visit',
        visit_date: today,
        start_time: '14:00',
        end_time: '15:00',
        location: 'Carroll County residence',
        assigned_to: userId,
        assigned_to_name: userName,
        linked_goal_text: 'Community Integration',
        notes: 'Quarterly in-home monitoring visit. Review community integration progress.',
        reminder: true,
        reminder_timing: '1h',
        reminder_sent: false,
        status: 'scheduled',
        created_by: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      {
        organizationId,
        individual_id: ind2.id,
        individual_name: `${ind2.last_name}, ${ind2.first_name}`,
        visit_type: 'In-Home Visit',
        visit_date: tomorrow,
        start_time: '10:00',
        end_time: '11:00',
        location: 'Individual home',
        assigned_to: userId,
        assigned_to_name: userName,
        notes: 'Quarterly in-home visit per monitoring schedule.',
        reminder: true,
        reminder_timing: '1d',
        reminder_sent: false,
        status: 'scheduled',
        created_by: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      {
        organizationId,
        individual_id: ind3.id,
        individual_name: `${ind3.last_name}, ${ind3.first_name}`,
        visit_type: 'Phone Contact',
        visit_date: today,
        start_time: '16:00',
        end_time: '16:30',
        location: 'Phone',
        assigned_to: userId,
        assigned_to_name: userName,
        notes: 'Scheduled phone check-in.',
        reminder: false,
        reminder_sent: false,
        status: 'scheduled',
        created_by: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
    ];

    for (const v of visits) {
      await addDoc(collection(db, 'scheduled_visits'), v);
    }

    console.log('[DemoSeed] ✅ Seeded 3 demo scheduled visits');
  } catch (err) {
    console.warn('[DemoSeed] Scheduled visits seeding failed silently:', err);
  }
}

/**
 * Seeds 3 demo approval workflow documents:
 * 1. A progress note pending review (52h ago)
 * 2. A contact note returned for correction
 * 3. A visit summary approved with exception
 *
 * Idempotent — skips if any doc with approvalStatus already exists for this org.
 */
export async function seedApprovalDemoData(
  organizationId: string,
  userId: string,
): Promise<void> {
  try {
    // Guard: skip if approval demo data already seeded
    const guardQ = query(
      collection(db, 'progress_notes'),
      where('organizationId', '==', organizationId),
      where('approvalStatus', '==', 'pending_review'),
      limit(1),
    );
    const guardSnap = await getDocs(guardQ);
    if (!guardSnap.empty) return; // already seeded

    // Find first individual in org
    const indsQ = query(
      collection(db, 'individuals'),
      where('organizationId', '==', organizationId),
      limit(3),
    );
    const indsSnap = await getDocs(indsQ);
    if (indsSnap.empty) return; // no individuals yet

    const inds = indsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    const ind0 = inds[0];
    const ind1 = inds[1] ?? ind0;
    const ind2 = inds[2] ?? ind0;

    const now = new Date();
    const hoursAgoTs = (h: number) => Timestamp.fromDate(new Date(now.getTime() - h * 3600 * 1000));

    // 1. Progress note — pending_review (52 hours ago)
    await addDoc(collection(db, 'progress_notes'), {
      organizationId,
      individualId: ind0.id,
      individualName: `${ind0.first_name} ${ind0.last_name}`,
      authorId: userId,
      authorName: 'Sarah Coordinator',
      activityType: 'Case Management',
      contactType: 'Home Visit',
      progressDate: '2026-05-28',
      startTime: '10:00',
      endTime: '11:00',
      isBillable: true,
      serviceCode: 'T2022',
      units: 3,
      purposeOfActivity: 'Quarterly check-in and service review with individual and family.',
      goalsProgress: [],
      additionalObservations: '',
      nextSteps: 'Schedule follow-up in 30 days.',
      status: 'pending_signature',
      aiDrafted: false,
      approvalStatus: 'pending_review',
      isBillingReady: false,
      submittedForReviewAt: hoursAgoTs(52),
      submittedForReviewBy: userId,
      submittedByName: 'Sarah Coordinator',
      returnReasons: [],
      createdAt: hoursAgoTs(52),
      updatedAt: hoursAgoTs(52),
    });

    // 2. Contact note — returned_for_correction
    await addDoc(collection(db, 'contact_notes'), {
      organizationId,
      individualId: ind1.id,
      individualName: `${ind1.first_name} ${ind1.last_name}`,
      authorId: userId,
      authorName: 'Sarah Coordinator',
      contactType: 'Phone',
      date: '2026-05-26',
      progressDate: '2026-05-26',
      status: 'pending_signature',
      purposeOfActivity: 'Phone check-in regarding medication management.',
      goalsProgress: [],
      additionalObservations: '',
      nextSteps: '',
      isBillable: false,
      aiDrafted: false,
      approvalStatus: 'returned_for_correction',
      isBillingReady: false,
      submittedForReviewAt: hoursAgoTs(24),
      submittedForReviewBy: userId,
      submittedByName: 'Sarah Coordinator',
      returnedAt: hoursAgoTs(8),
      returnedBy: 'supervisor-demo',
      returnedByName: 'Sam Supervisor',
      returnReasons: [{
        returnedAt: new Date(now.getTime() - 8 * 3600 * 1000).toISOString(),
        returnedBy: 'supervisor-demo',
        returnedByName: 'Sam Supervisor',
        reason: 'Narrative insufficient',
        comment: 'Please provide more detail about the specific topics discussed during the call.',
      }],
      createdAt: hoursAgoTs(24),
      updatedAt: hoursAgoTs(8),
    });

    // 3. Visit summary — approved_with_exception
    await addDoc(collection(db, 'visit_summaries'), {
      organizationId,
      individual_id: ind2.id,
      individualId: ind2.id,
      individualName: `${ind2.first_name} ${ind2.last_name}`,
      individual_name: `${ind2.first_name} ${ind2.last_name}`,
      author_uid: userId,
      authorId: userId,
      authorName: 'Sarah Coordinator',
      visit_date: '2026-05-22',
      visitDate: '2026-05-22',
      start_time: '14:00',
      end_time: '15:00',
      location: '123 Main St, Indianapolis, IN',
      purpose_of_support: 'Monthly home visit to review support plan and assess current needs.',
      what_went_well: 'Individual was engaged and participated actively in the discussion.',
      what_is_not_working: '',
      next_steps: 'Coordinate with day program provider.',
      status: 'submitted',
      approvalStatus: 'approved_with_exception',
      isBillingReady: true,
      exceptionReason: 'Note submitted 3 days after visit date. Approved as content is complete and accurate.',
      reviewedAt: hoursAgoTs(2),
      reviewedBy: 'supervisor-demo',
      reviewedByName: 'Sam Supervisor',
      submittedForReviewAt: hoursAgoTs(10),
      submittedForReviewBy: userId,
      submittedByName: 'Sarah Coordinator',
      returnReasons: [],
      author_name: 'Sarah Coordinator',
      updated_by: 'Sarah Coordinator',
      updated_on: new Date().toLocaleDateString(),
      createdAt: hoursAgoTs(72),
      updatedAt: hoursAgoTs(2),
    });

    console.log('[DemoSeed] ✅ Seeded approval workflow demo data');
  } catch (err) {
    console.warn('[DemoSeed] Approval demo seeding failed silently:', err);
  }
}
