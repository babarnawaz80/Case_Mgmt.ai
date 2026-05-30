import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCDjSN6OIu-VODP7mcqz8IPRk43NRKphE",
  authDomain: "casemanagement-ai.firebaseapp.com",
  projectId: "casemanagement-ai",
  storageBucket: "casemanagement-ai.firebasestorage.app",
  messagingSenderId: "366290080097",
  appId: "1:366290080097:web:d2985cd7323ae04d447520"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const MD_HARD_STOPS = [
  {
    id: 'hs-001',
    rule_text: 'HRST must be reviewed and approved within 90 days of PCP expiration date. For scores of 3 or higher, clinical review by RN is required before PCP can be submitted.',
    source_page: 10,
    source_section: 'Pre-Planning',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Case Manager', 'RN'],
  },
  {
    id: 'hs-002',
    rule_text: 'Employment Focus Area Exploration (FAE) must be completed annually for all individuals regardless of employment status.',
    source_page: 9,
    source_section: 'Pre-Planning Tools',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Case Manager'],
  },
  {
    id: 'hs-003',
    rule_text: 'Person-Centered Plan must be submitted to DDA via LTSSMaryland prior to the Annual Plan Date. Expired plans result in Auto-Extend status.',
    source_page: 3,
    source_section: 'Introduction',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Case Manager', 'Supervisor'],
  },
  {
    id: 'hs-004',
    rule_text: 'CCS cannot be billed for the same 15-minute increment as Targeted Case Management (TCM).',
    source_page: 15,
    source_section: 'Billing Conflicts',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Billing Staff', 'Case Manager'],
  },
  {
    id: 'hs-005',
    rule_text: 'Service authorization must be in effect for the date(s) of service. Billing prior to or after the auth window is not allowed.',
    source_page: 18,
    source_section: 'Service Authorization',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Billing Staff'],
  },
  {
    id: 'hs-006',
    rule_text: 'Individual must have a current DDA eligibility determination on file (not expired) to receive any waiver services.',
    source_page: 5,
    source_section: 'Eligibility',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Case Manager'],
  },
  {
    id: 'hs-007',
    rule_text: 'All risks identified in the HRST must have documented mitigation strategies in the Health & Safety section.',
    source_page: 22,
    source_section: 'Health and Safety',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Case Manager', 'Clinical Staff'],
  },
  {
    id: 'hs-008',
    rule_text: 'Day Habilitation cannot be billed on the same day as Hospitalization or any 24-hour residential service.',
    source_page: 16,
    source_section: 'Service Conflicts',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Billing Staff'],
  },
  {
    id: 'hs-009',
    rule_text: 'Maximum of 30 hours per individual per week for Day Habilitation. Hours above this threshold are not billable.',
    source_page: 14,
    source_section: 'Service Limits',
    category: 'hard_stop',
    severity: 'hard_stop',
    applies_to: ['Billing Staff', 'Case Manager'],
  },
];

const MD_WARNINGS = [
  {
    id: 'w-001',
    rule_text: 'Personally Defined Good Life section must be written in the individual\'s own words and reflect their personal vision, not clinical language.',
    source_page: 25,
    source_section: 'PCP Content Requirements',
    category: 'warning',
    severity: 'warning',
    applies_to: ['Case Manager'],
  },
  {
    id: 'w-002',
    rule_text: 'PCP must be reviewed and signed annually. Reviews more than 365 days old are out of compliance.',
    source_page: 7,
    source_section: 'Annual Review',
    category: 'warning',
    severity: 'warning',
    applies_to: ['Case Manager', 'Supervisor'],
  },
  {
    id: 'w-003',
    rule_text: 'Quarterly face-to-face visit required. Missing the quarterly visit window triggers a corrective action.',
    source_page: 20,
    source_section: 'Monitoring Requirements',
    category: 'warning',
    severity: 'warning',
    applies_to: ['Case Manager'],
  },
  {
    id: 'w-004',
    rule_text: 'Maximum of 40 units (10 hours) per individual per month under the Community Pathways waiver for CCS services.',
    source_page: 13,
    source_section: 'Service Limits',
    category: 'warning',
    severity: 'warning',
    applies_to: ['Billing Staff', 'Case Manager'],
  },
  {
    id: 'w-005',
    rule_text: 'Active Medicaid (MA) eligibility must be verified within the past 12 months.',
    source_page: 6,
    source_section: 'Eligibility Verification',
    category: 'warning',
    severity: 'warning',
    applies_to: ['Case Manager'],
  },
  {
    id: 'w-006',
    rule_text: 'Annual authorization required. Re-authorization must be submitted no later than 30 days prior to expiration.',
    source_page: 19,
    source_section: 'Reauthorization',
    category: 'warning',
    severity: 'warning',
    applies_to: ['Case Manager', 'Supervisor'],
  },
  {
    id: 'w-007',
    rule_text: 'Monthly progress note tied to PCP goals must be authored and signed by the case manager.',
    source_page: 21,
    source_section: 'Documentation Requirements',
    category: 'warning',
    severity: 'warning',
    applies_to: ['Case Manager'],
  },
  {
    id: 'w-008',
    rule_text: 'Referral to DORS (Division of Rehabilitation Services) must be documented prior to long-term Supported Employment funding.',
    source_page: 11,
    source_section: 'Supported Employment',
    category: 'warning',
    severity: 'warning',
    applies_to: ['Case Manager'],
  },
];

const MD_PCP_REQUIREMENTS = [
  {
    id: 'pcp-001',
    rule_text: 'CCS must be listed in the Person-Centered Plan with documented frequency, duration, and outcome.',
    source_page: 8,
    source_section: 'PCP Requirements',
    category: 'pcp_requirement',
    severity: 'hard_stop',
    applies_to: ['Case Manager'],
  },
  {
    id: 'pcp-002',
    rule_text: 'PCP must include at least one community-integration goal directly served by Day Habilitation.',
    source_page: 12,
    source_section: 'Goals and Outcomes',
    category: 'pcp_requirement',
    severity: 'hard_stop',
    applies_to: ['Case Manager'],
  },
  {
    id: 'pcp-003',
    rule_text: 'Employment outcome must be documented in the PCP with measurable hours-per-week target.',
    source_page: 11,
    source_section: 'Employment Goals',
    category: 'pcp_requirement',
    severity: 'hard_stop',
    applies_to: ['Case Manager'],
  },
  {
    id: 'pcp-004',
    rule_text: 'Individual must have a documented vocational assessment within the past 12 months for Supported Employment services.',
    source_page: 9,
    source_section: 'Supported Employment',
    category: 'pcp_requirement',
    severity: 'hard_stop',
    applies_to: ['Case Manager', 'Vocational Specialist'],
  },
];

const SEED_ENGINES = [
  {
    id: 'engine-maryland-dda-v2',
    name: 'Maryland DDA — DD Waiver',
    state: 'Maryland',
    state_code: 'MD',
    program: 'DD Waiver — Community Pathways',
    waiver_type: 'DD Waiver',
    effective_date: '2023-07-01',
    source_url: 'https://health.maryland.gov/dda/Pages/waiver.aspx',
    version: 'v2.0',
    status: 'published',
    created_by: 'system-seed',
    published_by: 'Babar Nawaz',
    extracted_rules: {
      pcp_requirements: MD_PCP_REQUIREMENTS,
      documentation_requirements: [],
      timeline_requirements: [],
      eligibility_rules: [],
      service_requirements: [],
      hard_stops: MD_HARD_STOPS,
      warnings: MD_WARNINGS,
      required_sections: [
        'Personally Defined Good Life', 'Important To/For',
        'Employment Focus Area', 'Community Integration', 'Health & Safety',
        'Goals & Outcomes', 'Services & Supports', 'Team & Signatures',
      ],
      required_assessments: ['HRST', 'FAE', 'DSAT'],
      submission_requirements: [],
    },
    rule_count: 24,
    hard_stop_count: 9,
    warning_count: 16,
    linked_agent_ids: ['agent-pcp-001', 'agent-alignment-001', 'agent-billing-001', 'agent-isp-001'],
    source_documents: [
      {
        file_name: 'MD-DDA-PCP-Manual-Feb2026.pdf',
        file_url: '',
        uploaded_at: null,
        pages: 47,
      },
    ],
    previous_version_id: null,
    is_frozen: true,
    builder_instructions: 'For CCS services, billing unit is 15 minutes. Ignore Part III. Treat any reference to Targeted Case Management as billing-conflict with CCS.',
    notes: 'Updated to Feb 2026 PCP Development and Authorization Manual.',
  },
  {
    id: 'engine-virginia-dbhds-v1',
    name: 'Virginia DBHDS — DD Waiver',
    state: 'Virginia',
    state_code: 'VA',
    program: 'DD Waiver — Community Living',
    waiver_type: 'DD Waiver',
    effective_date: '2024-01-01',
    source_url: 'https://dbhds.virginia.gov/developmental-services/',
    version: 'v1.0',
    status: 'published',
    created_by: 'system-seed',
    published_by: 'Babar Nawaz',
    extracted_rules: {
      pcp_requirements: [],
      documentation_requirements: [],
      timeline_requirements: [],
      eligibility_rules: [],
      service_requirements: [],
      hard_stops: [
        { id: 'va-hs-001', rule_text: 'Individual must be enrolled in the Virginia DD Waiver and have a current ISP.', source_page: 4, source_section: 'Eligibility', category: 'hard_stop', severity: 'hard_stop', applies_to: ['Case Manager'] },
        { id: 'va-hs-002', rule_text: 'Service authorization required prior to service delivery. No back-dating allowed.', source_page: 8, source_section: 'Authorization', category: 'hard_stop', severity: 'hard_stop', applies_to: ['Billing Staff'] },
        { id: 'va-hs-003', rule_text: 'Available only to individuals age 22 and older for Community Engagement services.', source_page: 12, source_section: 'Eligibility', category: 'hard_stop', severity: 'hard_stop', applies_to: ['Case Manager'] },
      ],
      warnings: [
        { id: 'va-w-001', rule_text: 'ISP must specify the activities of daily living to be supported and the desired outcomes.', source_page: 7, source_section: 'ISP Requirements', category: 'warning', severity: 'warning', applies_to: ['Case Manager'] },
        { id: 'va-w-002', rule_text: 'Cannot exceed authorized weekly hours. Overage requires service-authorization amendment.', source_page: 14, source_section: 'Service Limits', category: 'warning', severity: 'warning', applies_to: ['Billing Staff'] },
        { id: 'va-w-003', rule_text: 'Capped at 66 hours per individual per month for Community Engagement.', source_page: 15, source_section: 'Service Limits', category: 'warning', severity: 'warning', applies_to: ['Billing Staff'] },
        { id: 'va-w-004', rule_text: 'Cannot bill Community Engagement on the same day as Group Day Support for overlapping time.', source_page: 16, source_section: 'Conflicts', category: 'warning', severity: 'warning', applies_to: ['Billing Staff'] },
        { id: 'va-w-005', rule_text: 'ISP must include a community-integration outcome with measurable goals.', source_page: 9, source_section: 'ISP Requirements', category: 'warning', severity: 'warning', applies_to: ['Case Manager'] },
        { id: 'va-w-006', rule_text: 'Activity log with location, duration, and outcome required for each billable hour.', source_page: 20, source_section: 'Documentation', category: 'warning', severity: 'warning', applies_to: ['Case Manager'] },
        { id: 'va-w-007', rule_text: 'Daily progress notes required for each shift, signed by the direct support professional.', source_page: 22, source_section: 'Documentation', category: 'warning', severity: 'warning', applies_to: ['Direct Support Professional'] },
        { id: 'va-w-008', rule_text: 'Annual reauthorization must be submitted 45 days before expiration.', source_page: 18, source_section: 'Reauthorization', category: 'warning', severity: 'warning', applies_to: ['Case Manager'] },
      ],
      required_sections: ['Support Needs', 'Goals and Outcomes', 'Services', 'Team Contacts'],
      required_assessments: ['SIS-A', 'VIDES'],
      submission_requirements: [],
      timeline_requirements: [],
      eligibility_rules: [],
      service_requirements: [],
    },
    rule_count: 11,
    hard_stop_count: 3,
    warning_count: 8,
    linked_agent_ids: ['agent-monitoring-001'],
    source_documents: [],
    previous_version_id: null,
    is_frozen: true,
  },
  {
    id: 'engine-pennsylvania-odp-v1',
    name: 'Pennsylvania ODP — Consolidated Waiver',
    state: 'Pennsylvania',
    state_code: 'PA',
    program: 'Consolidated Waiver',
    waiver_type: 'Consolidated Waiver',
    effective_date: '2024-07-01',
    source_url: '',
    version: 'v1.0',
    status: 'draft',
    created_by: 'system-seed',
    published_by: null,
    extracted_rules: {
      pcp_requirements: [],
      documentation_requirements: [],
      timeline_requirements: [],
      eligibility_rules: [],
      service_requirements: [],
      hard_stops: [],
      warnings: [],
      required_sections: [],
      required_assessments: [],
      submission_requirements: [],
    },
    rule_count: 0,
    hard_stop_count: 0,
    warning_count: 0,
    linked_agent_ids: [],
    source_documents: [],
    previous_version_id: null,
    is_frozen: false,
  },
];

async function run() {
  await signInWithEmailAndPassword(auth, "kathy@demo.casemanagement.ai", "Demo1234!");
  console.log("Logged in as Kathy!");

  console.log("Checking if engines are already seeded...");
  const existing = await getDocs(
    query(collection(db, 'guidelines_engines'), where('created_by', '==', 'system-seed'))
  );

  if (!existing.empty) {
    console.log("Collection is already seeded! Docs count:", existing.size);
    existing.forEach(d => console.log(` - Engine id: ${d.id}, status: ${d.data().status}, name: ${d.data().name}`));
    return;
  }

  console.log("Seeding guidelines engines...");
  const batch = writeBatch(db);
  const now = Timestamp.now();
  const pastDate = Timestamp.fromDate(new Date('2026-02-10T09:14:00'));

  for (const engine of SEED_ENGINES) {
    const ref = doc(db, 'guidelines_engines', engine.id);
    batch.set(ref, {
      ...engine,
      created_at: now,
      published_at: engine.status === 'published' ? pastDate : null,
    });
  }

  await batch.commit();
  console.log("Seed successful!");
}

run().catch(console.error);
