"use strict";
// seedValentinaDemoData — One-time HTTPS Callable
// Seeds Valentina Cruz's chart with realistic demo data for PCP AI generation testing.
// Call once from browser console: httpsCallable(getFunctions(), 'seedValentinaDemoData')()
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedValentinaDemoData = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.seedValentinaDemoData = (0, https_1.onCall)({ cors: true, memory: "512MiB", timeoutSeconds: 120 }, async (request) => {
    var _a;
    const db = admin.firestore();
    // ── Find Valentina Cruz ────────────────────────────────────────────────────
    let valentinaId = null;
    // Try by name first
    const nameSnap = await db.collection("individuals")
        .where("first_name", "==", "Valentina")
        .where("last_name", "==", "Cruz")
        .limit(1)
        .get();
    if (!nameSnap.empty) {
        valentinaId = nameSnap.docs[0].id;
    }
    else {
        // Try alternate field names
        const altSnap = await db.collection("individuals")
            .where("firstName", "==", "Valentina")
            .limit(1)
            .get();
        if (!altSnap.empty)
            valentinaId = altSnap.docs[0].id;
    }
    if (!valentinaId) {
        return { success: false, error: "Valentina Cruz not found in Firestore. Check individual records." };
    }
    console.log(`[seedValentina] Found Valentina Cruz: ${valentinaId}`);
    // ── Clear existing subcollection data to avoid duplicates ─────────────────
    const collections = ["contact_notes", "visit_summaries", "monitoring_forms", "authorizations", "assessments", "eligibility_verifications"];
    for (const col of collections) {
        const existing = await db.collection("individuals").doc(valentinaId).collection(col).get();
        const batch = db.batch();
        existing.docs.forEach(d => batch.delete(d.ref));
        if (!existing.empty)
            await batch.commit();
    }
    // ── Update individual profile ─────────────────────────────────────────────
    await db.collection("individuals").doc(valentinaId).update({
        first_name: "Valentina",
        last_name: "Cruz",
        preferred_name: "Val",
        date_of_birth: "1990-03-15",
        gender: "Female",
        county: "Pima",
        state: "Arizona",
        medicaid_id: "MA-7842301",
        program: "HCBS Waiver — Personal Care",
        waiver_type: "DD Waiver",
        primary_diagnosis: "Intellectual Disability, Mild; Anxiety Disorder",
        level_of_care: "Level 3 — High",
        risk_score: 70,
        assigned_case_manager_name: "Kathy Adams",
        enrollment_status: "active",
        ma_redetermination_date: "2026-05-30",
    });
    // ── Seed contact notes ────────────────────────────────────────────────────
    const contactNotes = [
        {
            date: admin.firestore.Timestamp.fromDate(new Date("2026-04-27")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-04-27")),
            contactType: "In-person visit",
            individualId: valentinaId,
            purposeOfActivity: "Quarterly check-in and service review",
            narrative: "Conducted quarterly in-home visit. Valentina was engaged and communicative. Mother Linda reported behavioral changes at home including increased anxiety and withdrawal in the evenings. Valentina expressed strong interest in pursuing part-time employment, specifically warehouse or retail work with structured tasks. She mentioned wanting to take the bus independently to a job. Reviewed current day program participation — attending 4 days per week, satisfied with activities but wants more community outings. Discussed YMCA membership as potential community integration opportunity.",
            issuesConcernsChallenges: "Behavioral changes noted by mother. Employment interest not yet reflected in current ISP. Transportation barriers to employment.",
            nextSteps: "Follow up with behavioral support team. Explore employment support services. Add employment goal to upcoming ISP renewal.",
            isCompleted: true,
            isBillable: true,
            serviceCode: "T2022",
            createdBy: "Kathy Adams",
        },
        {
            date: admin.firestore.Timestamp.fromDate(new Date("2026-02-15")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-02-15")),
            contactType: "Phone call",
            individualId: valentinaId,
            purposeOfActivity: "Monthly check-in",
            narrative: "Monthly phone contact. Valentina reported doing well at day program. Attended YMCA twice this month with support staff. Medication schedule adherence improving. No incidents to report. Valentina mentioned wanting to learn to cook simple meals independently.",
            issuesConcernsChallenges: "Medication schedule adherence needs monitoring. Interest in independent living skills.",
            nextSteps: "Check in on medication adherence next visit. Explore cooking skills as ISP goal.",
            isCompleted: true,
            isBillable: true,
            createdBy: "Kathy Adams",
        },
        {
            date: admin.firestore.Timestamp.fromDate(new Date("2026-01-10")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-01-10")),
            contactType: "In-person visit",
            individualId: valentinaId,
            purposeOfActivity: "Annual ISP review planning meeting",
            narrative: "In-home visit to begin annual ISP renewal planning. Reviewed goals from prior year. Community Integration goal on track — attended 3 community events per month consistently. Employment goal was deferred last year — Valentina re-expressed strong interest this year. Discussed vocational assessment as next step. Reviewed health status — no new diagnoses. HRST assessment due in February.",
            nextSteps: "Schedule vocational assessment. Begin ISP renewal documentation.",
            isCompleted: true,
            isBillable: true,
            createdBy: "Kathy Adams",
        },
        {
            date: admin.firestore.Timestamp.fromDate(new Date("2025-10-22")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2025-10-22")),
            contactType: "In-person visit",
            individualId: valentinaId,
            purposeOfActivity: "Semi-annual plan review",
            narrative: "Semi-annual meeting held at day program facility. Day program coordinator reported excellent attendance and participation. Valentina has been helping with kitchen cleanup — shows interest in food service work. Mother expressed concern about elopement risk when Valentina is anxious — has occurred twice this year. Behavioral support plan updated. Reviewed service authorizations — all current through August 2026.",
            issuesConcernsChallenges: "Elopement risk during anxiety episodes. Behavioral support plan needs update.",
            isCompleted: true,
            isBillable: true,
            createdBy: "Kathy Adams",
        },
        {
            date: admin.firestore.Timestamp.fromDate(new Date("2025-07-18")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2025-07-18")),
            contactType: "Phone call",
            individualId: valentinaId,
            purposeOfActivity: "Quarterly phone contact",
            narrative: "Quarterly phone check-in. Valentina in good spirits. Reported enjoying summer activities at day program. Mentioned she made a new friend named Maria at the program. No health concerns. MA renewal completed successfully — active through May 2026. Discussed upcoming community event at county fair — Valentina excited.",
            nextSteps: "Next in-person visit scheduled for October semi-annual review.",
            isCompleted: true,
            isBillable: false,
            createdBy: "Kathy Adams",
        },
    ];
    for (const note of contactNotes) {
        await db.collection("individuals").doc(valentinaId).collection("contact_notes").add(note);
    }
    // ── Seed visit summaries ──────────────────────────────────────────────────
    const visitSummaries = [
        {
            visitDate: admin.firestore.Timestamp.fromDate(new Date("2026-04-27")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-04-27")),
            individualId: valentinaId,
            location: "Pima County — Valentina's residence",
            othersPresent: "Linda Cruz (mother)",
            purposeOfSupport: "Quarterly check-in and service review",
            workingWell: "Valentina is satisfied with her current day program. Engagement with community events has been consistent — 3 events this quarter. Strong relationship with support staff. Mother Linda is very involved and supportive.",
            notWorking: "Mother reported behavioral changes at home including anxiety and withdrawal in the evenings. Valentina has not yet received employment support despite expressing interest for 2 consecutive years.",
            nextSteps: "Discussed quarterly service review. Valentina expressed continued satisfaction with day program. Employment exploration to be added to ISP. Behavioral changes at home to be monitored.",
            isCompleted: true,
            submittedBy: "Kathy Adams",
        },
        {
            visitDate: admin.firestore.Timestamp.fromDate(new Date("2026-01-10")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-01-10")),
            individualId: valentinaId,
            location: "Pima County — Valentina's residence",
            othersPresent: "Linda Cruz (mother)",
            purposeOfSupport: "Annual ISP renewal planning",
            workingWell: "Community Integration goal consistently on track. Valentina maintains 4-day attendance at day program. Positive relationships with staff and peers. YMCA membership has been beneficial.",
            notWorking: "Employment goal has been deferred two years in a row. Valentina's expressed interest is not being addressed. Vocational assessment has not been completed.",
            nextSteps: "Began ISP renewal planning. Priority for this cycle: employment goal must be included. Schedule vocational assessment.",
            isCompleted: true,
            submittedBy: "Kathy Adams",
        },
    ];
    for (const visit of visitSummaries) {
        await db.collection("individuals").doc(valentinaId).collection("visit_summaries").add(visit);
    }
    // ── Seed monitoring forms ─────────────────────────────────────────────────
    const monitoringForms = [
        {
            typeOfReview: "Quarterly",
            dueDate: admin.firestore.Timestamp.fromDate(new Date("2026-04-30")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-04-27")),
            individualId: valentinaId,
            status: "Submitted",
            healthStatusChanges: true,
            healthStatusExplanation: "Mother reported behavioral changes at home during 04/27 visit.",
            behavioralSupportChanges: true,
            behavioralSupportExplanation: "Behavioral changes noted by primary caregiver. Recommend behavioral support team consult.",
            servicesAppropriate: true,
            goalProgress: "Community Integration: On Track. Employment Exploration: Needs Attention — interest expressed but no action taken.",
            recommendedActions: "Follow up with behavioral support team. Explore employment support services. Complete MA redetermination by May 10.",
            submittedBy: "Kathy Adams",
        },
        {
            typeOfReview: "Quarterly",
            dueDate: admin.firestore.Timestamp.fromDate(new Date("2026-01-31")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-01-26")),
            individualId: valentinaId,
            status: "Submitted",
            goalProgress: "Community Integration: On Track — consistent YMCA and day program attendance. Employment: Not Started.",
            recommendedActions: "Begin ISP renewal planning. Schedule vocational assessment for employment goal.",
            submittedBy: "Kathy Adams",
        },
    ];
    for (const form of monitoringForms) {
        await db.collection("individuals").doc(valentinaId).collection("monitoring_forms").add(form);
    }
    // ── Seed service authorizations ───────────────────────────────────────────
    const authorizations = [
        {
            authorizationId: "AUTH-2026-123",
            serviceName: "Targeted Case Management",
            serviceCode: "T2022",
            serviceType: "TCM",
            provider: "Carroll County Case Management",
            authorizedUnits: 120,
            unitsUsed: 62,
            billingUnit: "15 min",
            effectiveDate: "2025-09-01",
            expirationDate: "2026-08-31",
            status: "Active",
            billable: true,
            individualId: valentinaId,
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-01-01")),
        },
        {
            authorizationId: "AUTH-2026-124",
            serviceName: "Community Habilitation",
            serviceCode: "H2015",
            serviceType: "Day Services",
            provider: "Pima County Day Services",
            authorizedUnits: 480,
            unitsUsed: 210,
            billingUnit: "15 min",
            effectiveDate: "2025-09-01",
            expirationDate: "2026-08-31",
            status: "Active",
            billable: true,
            individualId: valentinaId,
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-01-01")),
        },
        {
            authorizationId: "AUTH-2026-125",
            serviceName: "Supported Employment — Individual",
            serviceCode: "H2023",
            serviceType: "Employment Support",
            provider: "Pima Vocational Services",
            authorizedUnits: 96,
            unitsUsed: 0,
            billingUnit: "15 min",
            effectiveDate: "2026-05-01",
            expirationDate: "2026-08-31",
            status: "Active",
            billable: true,
            individualId: valentinaId,
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-05-01")),
        },
    ];
    for (const auth of authorizations) {
        await db.collection("individuals").doc(valentinaId).collection("authorizations").add(auth);
    }
    // ── Seed assessments ──────────────────────────────────────────────────────
    const assessments = [
        {
            assessmentType: "HRST — Health Risk Screening Tool",
            assessmentId: "A-2026-01",
            date: admin.firestore.Timestamp.fromDate(new Date("2026-01-12")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-01-12")),
            individualId: valentinaId,
            score: 3.2,
            levelOfCare: "Health Care Level 3 — High",
            clinicalReviewRequired: true,
            keyFindings: "Elevated scores in behavioral regulation domain. Medication management requires monitoring. Elopement risk noted during anxiety episodes. Fall risk during transfers documented.",
            assessor: "Dr. Sandra Reyes",
            status: "Completed",
        },
        {
            assessmentType: "Functional Assessment",
            assessmentId: "A-2026-02",
            date: admin.firestore.Timestamp.fromDate(new Date("2026-03-28")),
            createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-03-28")),
            individualId: valentinaId,
            score: 18,
            maxScore: 30,
            keyFindings: "Independent in self-care with minimal prompting. Requires support for medication management, financial decisions, and transportation. Communication skills strong — verbal with visual cue supports. Community navigation skills developing. Shows interest in food service and retail work environments.",
            assessor: "Kathy Adams CM",
            status: "Completed",
        },
    ];
    for (const assessment of assessments) {
        await db.collection("individuals").doc(valentinaId).collection("assessments").add(assessment);
    }
    // ── Seed eligibility verification ─────────────────────────────────────────
    await db.collection("individuals").doc(valentinaId).collection("eligibility_verifications").add({
        individualId: valentinaId,
        maStatus: "Active",
        maType: "Waiver Related",
        medicaidId: "MA-7842301",
        verificationDate: admin.firestore.Timestamp.fromDate(new Date("2026-04-27")),
        renewalDate: admin.firestore.Timestamp.fromDate(new Date("2026-05-30")),
        continuousCoverage: true,
        createdAt: admin.firestore.Timestamp.fromDate(new Date("2026-04-27")),
    });
    // ── Seed Indiana DDA guidelines engine if not present ────────────────────
    const existingIndiana = await db.collection("guidelines_engines")
        .where("state", "==", "Indiana")
        .where("status", "==", "published")
        .limit(1)
        .get();
    if (existingIndiana.empty) {
        const orgSnap = await db.collection("individuals").doc(valentinaId).get();
        const orgId = ((_a = orgSnap.data()) === null || _a === void 0 ? void 0 : _a.organizationId) || null;
        await db.collection("guidelines_engines").add({
            name: "Indiana DDA — HCBS Waiver v1.0",
            state: "Indiana",
            program: "HCBS Waiver",
            status: "published",
            version: "v1.0",
            effectiveDate: "2024-01-01",
            organizationId: orgId,
            serviceCount: 6,
            hardStopCount: 8,
            warningCount: 12,
            createdBy: "system-seed",
            publishedAt: admin.firestore.FieldValue.serverTimestamp(),
            visit_frequency_months: 3,
            monitoring_form_frequency_months: 3,
            contact_frequency_months: 1,
            annual_pcp_required: true,
            pcp_renewal_cycle_days: 365,
            medicaid_redetermination_cycle_days: 365,
            assessment_frequency_months: 12,
            supervisor_review_required: true,
            billing_authorization_required: true,
            description: "Indiana Division of Disability and Rehabilitative Services — Home and Community Based Services (HCBS) waiver compliance rules for case management agencies.",
            extracted_rules: {
                required_sections: [
                    { name: "Targeted Case Management", billing_unit: "15 min", hard_stops: ["Annual PCP required", "Prior authorization required"], warnings: ["Monthly contact required"] },
                    { name: "Community Habilitation", billing_unit: "15 min", hard_stops: ["Daily service notes required"], warnings: ["Monthly progress summary required"] },
                    { name: "Supported Employment", billing_unit: "15 min", hard_stops: ["Employment goal required in PCP"], warnings: ["Annual vocational assessment required"] },
                ],
            },
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log("[seedValentina] Indiana DDA engine created");
    }
    // Update Valentina's state to Indiana
    await db.collection("individuals").doc(valentinaId).update({
        state: "Indiana",
        address_state: "Indiana",
        program: "HCBS Waiver",
        waiver_type: "DD Waiver",
    });
    // ── Verify counts ─────────────────────────────────────────────────────────
    const subCollRef = (col) => db.collection("individuals").doc(valentinaId).collection(col);
    const [cn, vs, mf, au, as_] = await Promise.all([
        subCollRef("contact_notes").count().get(),
        subCollRef("visit_summaries").count().get(),
        subCollRef("monitoring_forms").count().get(),
        subCollRef("authorizations").count().get(),
        subCollRef("assessments").count().get(),
    ]);
    const counts = {
        contactNotes: cn.data().count,
        visitSummaries: vs.data().count,
        monitoringForms: mf.data().count,
        authorizations: au.data().count,
        assessments: as_.data().count,
    };
    console.log("[seedValentina] Seeded:", counts);
    return {
        success: true,
        individualId: valentinaId,
        counts,
        message: `Valentina Cruz demo data seeded successfully. ${JSON.stringify(counts)}`,
    };
});
//# sourceMappingURL=seedValentina.js.map