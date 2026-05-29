"use strict";
// Default Rule Packs — Indiana DDA Fallback
// CaseManagement.AI Brain Orchestrator
//
// Used when no published Guidelines Engine is found for an individual's state/program.
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDIANA_DDA_DEFAULT_RULES = void 0;
exports.getDefaultRulePack = getDefaultRulePack;
exports.INDIANA_DDA_DEFAULT_RULES = {
    visit_frequency_months: 3,
    monitoring_form_frequency_months: 3,
    contact_frequency_months: 1,
    annual_pcp_required: true,
    pcp_renewal_cycle_days: 365,
    medicaid_redetermination_cycle_days: 365,
    assessment_frequency_months: 12,
    supervisor_review_required: true,
    billing_authorization_required: true,
    state: "Indiana",
    program: "DDA Waiver",
    version: "default-1.0",
    source: "default_fallback",
};
// Map of state + program to default rules
// Extend this as more states are supported
const DEFAULT_RULE_PACKS = {
    "Indiana-DDA": exports.INDIANA_DDA_DEFAULT_RULES,
    "Indiana-BDDS": Object.assign(Object.assign({}, exports.INDIANA_DDA_DEFAULT_RULES), { program: "BDDS" }),
    DEFAULT: exports.INDIANA_DDA_DEFAULT_RULES,
};
function getDefaultRulePack(state, program) {
    if (state && program) {
        const key = `${state}-${program}`;
        if (DEFAULT_RULE_PACKS[key])
            return DEFAULT_RULE_PACKS[key];
    }
    if (state && DEFAULT_RULE_PACKS[`${state}-DEFAULT`]) {
        return DEFAULT_RULE_PACKS[`${state}-DEFAULT`];
    }
    return DEFAULT_RULE_PACKS["DEFAULT"];
}
//# sourceMappingURL=defaultRulePacks.js.map