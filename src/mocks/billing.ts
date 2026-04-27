import type {
  GuidelinesEngine, RuntimeAgent, IndividualBillingHealth,
  BillingRunRecord, Claim, AuditEntry, RulePack, StepResult, ClaimStatus, PipelineRun,
  ClaimDraft, ClaimDraftStatus, GenerationSource, ClaimTracking, TrackingStatus,
} from '@/types/billing';

export const mockEngines: GuidelinesEngine[] = [
  {
    id: 'eng-1', name: 'Maryland DDA Billing', state: 'Maryland', program: 'DDA Waiver',
    effectiveDate: '2025-07-01', version: '2.0', status: 'published',
    serviceCount: 8, ruleCount: 47, rateTableCount: 12, hardStopCount: 6, warningCount: 14,
    createdBy: 'Admin User', lastUpdated: '2025-12-15', publishedAt: '2025-12-15',
  },
  {
    id: 'eng-2', name: 'Texas HHSC Waiver Billing', state: 'Texas', program: 'HHSC CLASS/HCS',
    effectiveDate: '2025-09-01', version: '1.0', status: 'published',
    serviceCount: 6, ruleCount: 38, rateTableCount: 9, hardStopCount: 5, warningCount: 11,
    createdBy: 'Admin User', lastUpdated: '2025-11-20', publishedAt: '2025-11-20',
  },
  {
    id: 'eng-3', name: 'Ohio DODD Billing', state: 'Ohio', program: 'IO/Level 1 Waiver',
    effectiveDate: '2026-01-01', version: '0.1', status: 'draft',
    serviceCount: 4, ruleCount: 22, rateTableCount: 6, hardStopCount: 3, warningCount: 8,
    createdBy: 'Admin User', lastUpdated: '2026-02-10',
  },
  {
    id: 'eng-4', name: 'Ohio DODD Billing', state: 'Ohio', program: 'IO/Level 1 Waiver',
    effectiveDate: '2026-01-01', version: '1.0', status: 'published',
    serviceCount: 5, ruleCount: 34, rateTableCount: 8, hardStopCount: 4, warningCount: 10,
    createdBy: 'Admin User', lastUpdated: '2026-03-01', publishedAt: '2026-03-01',
  },
  {
    id: 'eng-5', name: 'Illinois ROCS Billing', state: 'Illinois', program: 'ROCS Waiver',
    effectiveDate: '2026-01-01', version: '1.0', status: 'published',
    serviceCount: 7, ruleCount: 41, rateTableCount: 10, hardStopCount: 5, warningCount: 12,
    createdBy: 'Admin User', lastUpdated: '2026-02-20', publishedAt: '2026-02-20',
  },
  {
    id: 'eng-6', name: 'Florida iBudget Billing', state: 'Florida', program: 'iBudget Waiver',
    effectiveDate: '2026-01-01', version: '1.0', status: 'published',
    serviceCount: 6, ruleCount: 36, rateTableCount: 9, hardStopCount: 5, warningCount: 11,
    createdBy: 'Admin User', lastUpdated: '2026-02-15', publishedAt: '2026-02-15',
  },
  {
    id: 'eng-7', name: 'Iowa HCBS Billing', state: 'Iowa', program: 'HCBS Waiver',
    effectiveDate: '2026-01-01', version: '1.0', status: 'published',
    serviceCount: 5, ruleCount: 32, rateTableCount: 7, hardStopCount: 4, warningCount: 9,
    createdBy: 'Admin User', lastUpdated: '2026-03-05', publishedAt: '2026-03-05',
  },
  {
    id: 'eng-8', name: 'New York OPWDD Billing', state: 'New York', program: 'OPWDD Waiver',
    effectiveDate: '2026-01-01', version: '1.0', status: 'published',
    serviceCount: 7, ruleCount: 44, rateTableCount: 11, hardStopCount: 6, warningCount: 13,
    createdBy: 'Admin User', lastUpdated: '2026-02-28', publishedAt: '2026-02-28',
  },
  {
    id: 'eng-9', name: 'Pennsylvania ODP Billing', state: 'Pennsylvania', program: 'ODP Consolidated Waiver',
    effectiveDate: '2026-01-01', version: '1.0', status: 'published',
    serviceCount: 6, ruleCount: 39, rateTableCount: 10, hardStopCount: 5, warningCount: 12,
    createdBy: 'Admin User', lastUpdated: '2026-03-10', publishedAt: '2026-03-10',
  },
];

export const mockRulePacks: RulePack[] = [
  {
    id: 'rp-1', engineId: 'eng-1', serviceName: 'Day Habilitation',
    serviceCategory: 'Meaningful Day', billingCode: 'H2014', description: 'Community-based day habilitation services',
    modifiers: [
      { code: 'HQ', description: 'Group setting', whenRequired: '3+ individuals', autoApply: true },
      { code: 'U1', description: 'Individual setting', whenRequired: '1:1 staffing ratio', autoApply: false },
    ],
    rateEntries: [
      { effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', unitRate: 4.12, rateType: '15-min', modifierMultipliers: { HQ: 1.0, U1: 1.35 } },
    ],
    billingUnit: '15-min', unitConversionRules: 'Round up to nearest 15-min after 8 min threshold',
    validationRules: [
      { type: 'eligibility', description: 'Individual must have active DDA eligibility', severity: 'hard_stop' },
      { type: 'authorization', description: 'Service must have valid prior authorization', severity: 'hard_stop' },
      { type: 'documentation', description: 'Daily progress note must be completed within 72 hours', severity: 'warning' },
    ],
    limits: [
      { type: 'daily', maxUnits: 32, description: 'Max 8 hours (32 units) per day' },
      { type: 'weekly', maxUnits: 160, description: 'Max 40 hours (160 units) per week' },
    ],
    conflicts: ['Cannot bill same-time with Supported Employment', 'Cannot exceed auth units'],
    citations: [
      { page: '42', section: '3.2.1', snippet: 'Day habilitation services shall not exceed 8 hours per day...' },
      { page: '45', section: '3.2.4', snippet: 'Group modifier HQ required when serving 3 or more individuals...' },
    ],
  },
  {
    id: 'rp-2', engineId: 'eng-1', serviceName: 'Personal Supports',
    serviceCategory: 'Support', billingCode: 'H2016', description: 'Individual personal support services',
    modifiers: [
      { code: 'U3', description: 'Community-based', whenRequired: 'Service in community', autoApply: false },
    ],
    rateEntries: [
      { effectiveFrom: '2025-07-01', effectiveTo: '2026-06-30', unitRate: 4.58, rateType: '15-min', modifierMultipliers: { U3: 1.1 } },
    ],
    billingUnit: '15-min', unitConversionRules: 'Round up to nearest 15-min after 8 min threshold',
    validationRules: [
      { type: 'eligibility', description: 'Active DDA waiver enrollment required', severity: 'hard_stop' },
      { type: 'authorization', description: 'Valid PA on file', severity: 'hard_stop' },
    ],
    limits: [{ type: 'daily', maxUnits: 48, description: 'Max 12 hours per day' }],
    conflicts: ['Same-day conflict with Residential Habilitation during overnight hours'],
    citations: [{ page: '58', section: '4.1.2', snippet: 'Personal supports may be provided in 15-minute increments...' }],
  },
];

export const mockAgents: RuntimeAgent[] = [
  {
    id: 'agt-1', name: 'MD DDA Unit Converter', description: 'Converts attendance hours to billable units using Maryland DDA rounding rules and minimum thresholds.',
    agentType: 'attendance-to-units', engineId: 'eng-1', engineVersion: '2.0', engineName: 'Maryland DDA Billing',
    status: 'active', autoMonitor: true, applyMode: 'manual',
    triggerStage: 'post_supervisor_review', executionOrder: 1, scope: ['H2014', 'H2016'],
    complianceRate: 94, individualsServed: 127, individualsAtRisk: 8, draftsPending: 12, lastEvaluatedAt: '2026-02-22 14:30',
  },
  {
    id: 'agt-2', name: 'MD DDA Auth Matcher', description: 'Matches services to authorizations, tracks utilization remaining, and alerts on expiring authorizations.',
    agentType: 'authorization-matching', engineId: 'eng-1', engineVersion: '2.0', engineName: 'Maryland DDA Billing',
    status: 'active', autoMonitor: true, applyMode: 'manual',
    triggerStage: 'post_supervisor_review', executionOrder: 2, scope: ['H2014', 'H2016', 'H2023'],
    complianceRate: 91, individualsServed: 127, individualsAtRisk: 14, draftsPending: 6, lastEvaluatedAt: '2026-02-22 14:30',
  },
  {
    id: 'agt-3', name: 'TX HHSC Modifier Engine', description: 'Applies correct modifiers, POS codes, taxonomy, and NPI rules for Texas HHSC waiver services.',
    agentType: 'modifier-pos', engineId: 'eng-2', engineVersion: '1.0', engineName: 'Texas HHSC Waiver Billing',
    status: 'active', autoMonitor: false, applyMode: 'pre-selected',
    triggerStage: 'post_biller_approval', executionOrder: 1, scope: ['H2023', 'H0004'],
    complianceRate: 97, individualsServed: 84, individualsAtRisk: 3, draftsPending: 4, lastEvaluatedAt: '2026-02-21 09:15',
  },
  {
    id: 'agt-4', name: 'MD DDA Doc Checker', description: 'Verifies required documentation elements for Maryland DDA services and generates completeness scores.',
    agentType: 'documentation-sufficiency', engineId: 'eng-1', engineVersion: '2.0', engineName: 'Maryland DDA Billing',
    status: 'active', autoMonitor: true, applyMode: 'manual',
    triggerStage: 'post_supervisor_review', executionOrder: 3, scope: ['H2014', 'H2016'],
    complianceRate: 87, individualsServed: 127, individualsAtRisk: 19, draftsPending: 23, lastEvaluatedAt: '2026-02-22 08:00',
  },
  {
    id: 'agt-5', name: 'TX HHSC Claims Packager', description: 'Packages claim drafts for Texas HHSC waiver services and scrubs for common denial patterns.',
    agentType: 'claims-readiness', engineId: 'eng-2', engineVersion: '1.0', engineName: 'Texas HHSC Waiver Billing',
    status: 'inactive', autoMonitor: false, applyMode: 'manual',
    triggerStage: 'post_biller_approval', executionOrder: 2, scope: ['H2023', 'H0004', 'H2015'],
    complianceRate: 89, individualsServed: 52, individualsAtRisk: 7, draftsPending: 15, lastEvaluatedAt: '2026-02-19 16:45',
  },
];

const NAMES = [
  'James Wilson', 'Maria Garcia', 'Robert Johnson', 'Sarah Chen', 'David Kim',
  'Linda Martinez', 'Michael Brown', 'Jennifer Davis', 'William Taylor', 'Patricia Anderson',
  'Christopher Thomas', 'Elizabeth Jackson', 'Daniel White', 'Barbara Harris', 'Matthew Clark',
  'Susan Lewis', 'Anthony Robinson', 'Jessica Walker', 'Mark Hall', 'Karen Young',
];
const TEAMS = ['Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta'];
const ISSUES_POOL = [
  'Missing authorization', 'Over daily unit cap', 'Missing progress note elements',
  'Overlap conflict detected', 'Expired authorization', 'Modifier mismatch',
  'Attendance exceeds auth hours', 'Documentation incomplete', 'Rate table mismatch',
  'NPI validation failed',
];
const ACTIONS = [
  'Run Authorization Agent', 'Resolve documentation gaps', 'Run Limits & Conflict Agent',
  'Review modifier assignments', 'Run Documentation Agent', 'Submit corrected claim',
];

export const mockIndividuals: IndividualBillingHealth[] = NAMES.map((name, i) => {
  const risk: ('healthy' | 'watch' | 'at-risk')[] = ['healthy', 'healthy', 'watch', 'healthy', 'at-risk', 'healthy', 'watch', 'healthy', 'healthy', 'at-risk', 'healthy', 'healthy', 'watch', 'healthy', 'healthy', 'at-risk', 'healthy', 'watch', 'healthy', 'healthy'];
  const r = risk[i];
  const hs = r === 'at-risk' ? Math.floor(Math.random() * 3) + 1 : r === 'watch' ? 0 : 0;
  const ws = r === 'at-risk' ? Math.floor(Math.random() * 4) + 3 : r === 'watch' ? Math.floor(Math.random() * 3) + 1 : 0;
  return {
    individualId: `ind-${String(i + 1).padStart(2, '0')}`,
    name,
    state: i < 12 ? 'Maryland' : 'Texas',
    program: i < 12 ? 'DDA Waiver' : 'HHSC CLASS/HCS',
    assignedTeam: TEAMS[i % TEAMS.length],
    riskStatus: r,
    openHardStopsCount: hs,
    openWarningsCount: ws,
    lastRunAt: `2026-02-${String(20 + (i % 3)).padStart(2, '0')} ${8 + (i % 12)}:${String(i * 3 % 60).padStart(2, '0')}`,
    lastAgentRun: i % 3 === 0 ? 'MD DDA Unit Converter' : i % 3 === 1 ? 'MD DDA Doc Checker' : 'TX HHSC Modifier Engine',
    topIssues: r === 'healthy' ? [] : ISSUES_POOL.slice(i % 5, (i % 5) + (r === 'at-risk' ? 3 : 1)),
    recommendedNextAction: r === 'healthy' ? 'No action needed' : ACTIONS[i % ACTIONS.length],
  };
});

const SERVICES = ['Day Habilitation', 'Personal Supports', 'Supported Employment', 'Residential Habilitation', 'Behavioral Support', 'Community Living'];
const CODES = ['H2014', 'H2016', 'H2023', 'H2016 HI', 'H0004', 'H2015'];

function makeStepResults(outcome: 'Clean' | 'Pending' | 'Flagged' | 'Denied'): StepResult[] {
  const steps = ['Eligibility', 'Authorization', 'Attendance', 'Code Validation', 'Limits', 'Documentation', 'Claims Package'];
  return steps.map((s, i) => {
    if (outcome === 'Denied' && i === 1) return { stepName: s, status: 'hard_stop' as const, findings: ['Authorization expired'], hardStopReasons: ['No valid auth on file'] };
    if (outcome === 'Flagged' && i === 5) return { stepName: s, status: 'warning' as const, findings: ['Progress note missing 2 required elements'], hardStopReasons: [] };
    if (outcome === 'Pending' && i === 4) return { stepName: s, status: 'warning' as const, findings: ['Approaching daily unit cap (28/32)'], hardStopReasons: [] };
    return { stepName: s, status: 'pass' as const, findings: ['All checks passed'], hardStopReasons: [] };
  });
}

export const mockRuns: BillingRunRecord[] = Array.from({ length: 20 }, (_, i) => {
  const statuses: ('Clean' | 'Pending' | 'Flagged' | 'Denied')[] = ['Clean', 'Clean', 'Pending', 'Clean', 'Flagged', 'Clean', 'Denied', 'Clean', 'Pending', 'Flagged', 'Clean', 'Clean', 'Flagged', 'Clean', 'Pending', 'Clean', 'Clean', 'Denied', 'Clean', 'Flagged'];
  const s = statuses[i];
  const indIdx = i % 20;
  const svcIdx = i % 6;
  const units = Math.floor(Math.random() * 24) + 4;
  const rate = [4.12, 4.58, 5.23, 4.12, 6.80, 3.95][svcIdx];
  return {
    id: `run-${String(i + 1).padStart(2, '0')}`,
    agentId: mockAgents[i % 5].id,
    agentName: mockAgents[i % 5].name,
    engineId: mockAgents[i % 5].engineId,
    engineVersion: mockAgents[i % 5].engineVersion,
    individualId: `ind-${String(indIdx + 1).padStart(2, '0')}`,
    individualName: NAMES[indIdx],
    service: SERVICES[svcIdx],
    dateRange: `2026-02-${String(10 + (i % 10)).padStart(2, '0')} – 2026-02-${String(15 + (i % 7)).padStart(2, '0')}`,
    status: s,
    billingCode: CODES[svcIdx],
    modifiers: svcIdx === 0 ? ['HQ'] : svcIdx === 1 ? ['U3'] : [],
    units,
    rate,
    totalAmount: parseFloat((units * rate).toFixed(2)),
    stepResults: makeStepResults(s),
    overrides: s === 'Flagged' ? [{ step: 'Documentation', justification: 'Note submitted late but complete', overriddenBy: 'Staff User' }] : [],
    modulesWritten: s === 'Clean' ? ['BAN', 'ClaimDraft'] : [],
    claimId: s === 'Clean' ? `clm-${String(i + 1).padStart(2, '0')}` : undefined,
    createdAt: `2026-02-${String(15 + (i % 8)).padStart(2, '0')} ${9 + (i % 8)}:${String(i * 7 % 60).padStart(2, '0')}`,
  };
});

export const mockClaims: Claim[] = Array.from({ length: 15 }, (_, i) => {
  const statuses: ClaimStatus[] = ['draft', 'ready', 'submitted', 'denied', 'ready', 'submitted', 'draft', 'submitted', 'ready', 'draft', 'submitted', 'denied', 'ready', 'submitted', 'draft'];
  const indIdx = i % 20;
  const svcIdx = i % 6;
  const units = Math.floor(Math.random() * 20) + 4;
  const rate = [4.12, 4.58, 5.23, 4.12, 6.80, 3.95][svcIdx];
  return {
    id: `clm-${String(i + 1).padStart(2, '0')}`,
    individualId: `ind-${String(indIdx + 1).padStart(2, '0')}`,
    individualName: NAMES[indIdx],
    service: SERVICES[svcIdx],
    billingCode: CODES[svcIdx],
    modifiers: svcIdx === 0 ? ['HQ'] : [],
    units,
    rate,
    totalAmount: parseFloat((units * rate).toFixed(2)),
    status: statuses[i],
    payer: indIdx < 12 ? 'Maryland Medicaid' : 'Texas Medicaid',
    state: indIdx < 12 ? 'Maryland' : 'Texas',
    dateOfService: `2026-02-${String(10 + i).padStart(2, '0')}`,
    submittedAt: statuses[i] === 'submitted' ? `2026-02-${String(18 + (i % 5)).padStart(2, '0')}` : undefined,
    denialReason: statuses[i] === 'denied' ? 'Authorization expired at time of service' : undefined,
    engineVersion: indIdx < 12 ? '2.0' : '1.0',
    runId: `run-${String(i + 1).padStart(2, '0')}`,
    createdAt: `2026-02-${String(14 + (i % 8)).padStart(2, '0')}`,
  };
});

const AUDIT_ACTIONS = [
  'Agent Run Completed', 'Claim Draft Created', 'Override Applied', 'Claim Submitted',
  'Agent Created', 'Engine Published', 'Claim Denied', 'Apply Confirmed',
  'Pipeline Run Started', 'Pipeline Run Blocked', 'Task Created', 'Export 837', 'Submit Claim',
];

export const mockAuditEntries: AuditEntry[] = Array.from({ length: 20 }, (_, i) => ({
  id: `aud-${String(i + 1).padStart(2, '0')}`,
  timestamp: `2026-02-${String(10 + (i % 13)).padStart(2, '0')} ${8 + (i % 10)}:${String(i * 3 % 60).padStart(2, '0')}:00`,
  user: ['Admin User', 'Staff User', 'Supervisor', 'Admin User'][i % 4],
  action: AUDIT_ACTIONS[i % AUDIT_ACTIONS.length],
  individualId: i % 3 !== 2 ? `ind-${String((i % 20) + 1).padStart(2, '0')}` : undefined,
  modulesUpdated: i % 2 === 0 ? ['BAN', 'ClaimDraft'] : ['AuditTrail'],
  idempotencyKey: `idem-${Date.now()}-${i}`,
  details: `${AUDIT_ACTIONS[i % AUDIT_ACTIONS.length]} for ${NAMES[i % 20]} — ${SERVICES[i % 6]}`,
}));

export const mockPipelineRuns: PipelineRun[] = [
  {
    id: 'pipe-01', triggerStage: 'post_supervisor_review', attendanceBatchId: 'batch-2026-02-22',
    individualsCount: 45, startedAt: '2026-02-22 14:00', completedAt: '2026-02-22 14:32',
    status: 'success', hardStopCount: 0, warningCount: 3,
    agentResults: [
      { agentId: 'agt-1', agentName: 'MD DDA Unit Converter', status: 'pass' },
      { agentId: 'agt-2', agentName: 'MD DDA Auth Matcher', status: 'pass' },
      { agentId: 'agt-4', agentName: 'MD DDA Doc Checker', status: 'warning' },
    ],
  },
  {
    id: 'pipe-02', triggerStage: 'post_supervisor_review', attendanceBatchId: 'batch-2026-02-21',
    individualsCount: 38, startedAt: '2026-02-21 09:00', completedAt: '2026-02-21 09:18',
    status: 'blocked', hardStopCount: 2, warningCount: 5,
    agentResults: [
      { agentId: 'agt-1', agentName: 'MD DDA Unit Converter', status: 'pass' },
      { agentId: 'agt-2', agentName: 'MD DDA Auth Matcher', status: 'hard_stop' },
    ],
  },
  {
    id: 'pipe-03', triggerStage: 'post_biller_approval', attendanceBatchId: 'batch-2026-02-20',
    individualsCount: 22, startedAt: '2026-02-20 16:00', completedAt: '2026-02-20 16:15',
    status: 'success', hardStopCount: 0, warningCount: 1,
    agentResults: [
      { agentId: 'agt-3', agentName: 'TX HHSC Modifier Engine', status: 'pass' },
    ],
  },
  {
    id: 'pipe-04', triggerStage: 'post_supervisor_review', attendanceBatchId: 'batch-2026-02-19',
    individualsCount: 50, startedAt: '2026-02-19 14:00', completedAt: '2026-02-19 14:45',
    status: 'blocked', hardStopCount: 4, warningCount: 8,
    agentResults: [
      { agentId: 'agt-1', agentName: 'MD DDA Unit Converter', status: 'warning' },
      { agentId: 'agt-2', agentName: 'MD DDA Auth Matcher', status: 'hard_stop' },
    ],
  },
];

const FUNDING_STREAMS = ['DDA Community', 'DDA Residential', 'HHSC CLASS', 'HHSC HCS', 'IO Waiver', 'Level 1'];
const PROGRAMS = ['DDA Waiver', 'HHSC CLASS/HCS', 'IO/Level 1 Waiver'];
const PAYERS = ['Maryland Medicaid', 'Texas Medicaid', 'Ohio Medicaid'];

export const mockClaimDrafts: ClaimDraft[] = Array.from({ length: 25 }, (_, i) => {
  const draftStatuses: ClaimDraftStatus[] = ['draft', 'draft', 'ready_to_bill', 'blocked', 'ready_to_bill', 'draft', 'ready_to_bill', 'blocked', 'draft', 'ready_to_bill', 'draft', 'ready_to_bill', 'draft', 'blocked', 'ready_to_bill', 'draft', 'ready_to_bill', 'draft', 'draft', 'ready_to_bill', 'blocked', 'draft', 'ready_to_bill', 'draft', 'ready_to_bill'];
  const sources: GenerationSource[] = ['agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'manual_bypass', 'agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'recalculated', 'agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'manual_bypass', 'agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'recalculated', 'agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'agent_pipeline', 'manual_bypass', 'agent_pipeline'];
  const indIdx = i % 20;
  const svcIdx = i % 6;
  const units = Math.floor(Math.random() * 20) + 4;
  const rate = [4.12, 4.58, 5.23, 4.12, 6.80, 3.95][svcIdx];
  const isModified = i === 4 || i === 12 || i === 23;
  return {
    id: `cd-${String(i + 1).padStart(3, '0')}`,
    individualId: `ind-${String(indIdx + 1).padStart(2, '0')}`,
    individualName: NAMES[indIdx],
    payer: PAYERS[indIdx < 12 ? 0 : indIdx < 16 ? 1 : 2],
    fundingStream: FUNDING_STREAMS[i % 6],
    program: PROGRAMS[indIdx < 12 ? 0 : indIdx < 16 ? 1 : 2],
    service: SERVICES[svcIdx],
    billingCode: CODES[svcIdx],
    modifiers: svcIdx === 0 ? ['HQ'] : svcIdx === 1 ? ['U3'] : [],
    units,
    rate,
    totalAmount: parseFloat((units * rate).toFixed(2)),
    billingDateStart: `2026-02-${String(10 + (i % 10)).padStart(2, '0')}`,
    billingDateEnd: `2026-02-${String(14 + (i % 10)).padStart(2, '0')}`,
    status: draftStatuses[i],
    generationSource: sources[i],
    engineName: indIdx < 12 ? 'Maryland DDA Billing' : 'Texas HHSC Waiver Billing',
    engineVersion: indIdx < 12 ? '2.0' : '1.0',
    pipelineRunId: sources[i] === 'agent_pipeline' ? `pipe-0${(i % 4) + 1}` : undefined,
    agentPipelineVersion: '1.0',
    manuallyModified: isModified,
    agentBaseline: isModified ? { units: units + 2, modifiers: svcIdx === 0 ? ['HQ'] : [], rate, totalAmount: parseFloat(((units + 2) * rate).toFixed(2)) } : undefined,
    blockReasons: draftStatuses[i] === 'blocked' ? ['Authorization expired', 'Missing documentation elements'] : [],
    taskIds: draftStatuses[i] === 'blocked' ? [`task-${i}-1`, `task-${i}-2`] : [],
    createdAt: `2026-02-${String(15 + (i % 8)).padStart(2, '0')} ${9 + (i % 8)}:${String(i * 7 % 60).padStart(2, '0')}`,
  };
});

export const mockClaimTracking: ClaimTracking[] = Array.from({ length: 15 }, (_, i) => {
  const trackStatuses: TrackingStatus[] = ['paid', 'paid', 'accepted_payer', 'denied', 'billed', 'paid', 'accepted_clearinghouse', 'denied', 'paid', 'billed', 'accepted_payer', 'paid', 'generated', 'denied', 'paid'];
  const ts = trackStatuses[i];
  const indIdx = i % 20;
  const svcIdx = i % 6;
  const amt = parseFloat(((Math.floor(Math.random() * 20) + 4) * [4.12, 4.58, 5.23, 4.12, 6.80, 3.95][svcIdx]).toFixed(2));

  const timeline: { status: TrackingStatus; timestamp: string; note?: string }[] = [
    { status: 'generated', timestamp: `2026-02-${String(10 + i).padStart(2, '0')} 09:00` },
  ];
  if (['billed', 'accepted_clearinghouse', 'accepted_payer', 'denied', 'paid'].includes(ts)) {
    timeline.push({ status: 'billed', timestamp: `2026-02-${String(12 + i).padStart(2, '0')} 10:00`, note: 'Submitted via Stedi' });
  }
  if (['accepted_clearinghouse', 'accepted_payer', 'denied', 'paid'].includes(ts)) {
    timeline.push({ status: 'accepted_clearinghouse', timestamp: `2026-02-${String(13 + i).padStart(2, '0')} 14:00` });
  }
  if (['accepted_payer', 'paid'].includes(ts)) {
    timeline.push({ status: 'accepted_payer', timestamp: `2026-02-${String(15 + i).padStart(2, '0')} 11:00` });
  }
  if (ts === 'denied') {
    timeline.push({ status: 'denied', timestamp: `2026-02-${String(14 + i).padStart(2, '0')} 16:00`, note: 'Authorization expired at time of service' });
  }
  if (ts === 'paid') {
    timeline.push({ status: 'paid', timestamp: `2026-02-${String(18 + (i % 5)).padStart(2, '0')} 09:00`, note: `Payment received: $${amt}` });
  }

  return {
    id: `ct-${String(i + 1).padStart(3, '0')}`,
    claimDraftId: `cd-${String(i + 1).padStart(3, '0')}`,
    individualName: NAMES[indIdx],
    service: SERVICES[svcIdx],
    billingCode: CODES[svcIdx],
    totalAmount: amt,
    payer: PAYERS[indIdx < 12 ? 0 : indIdx < 16 ? 1 : 2],
    status: ts,
    denialReason: ts === 'denied' ? 'Authorization expired at time of service' : undefined,
    timeline,
    createdAt: `2026-02-${String(10 + i).padStart(2, '0')}`,
  };
});
