"use strict";
// Brain Orchestrator — TypeScript Interfaces
// CaseManagement.AI
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ORCHESTRATOR_SETTINGS = void 0;
exports.DEFAULT_ORCHESTRATOR_SETTINGS = {
    scheduled_run_time: "02:00",
    escalation_thresholds: {
        supervisor_alert_days: 7,
        supervisor_task_days: 14,
        director_alert_days: 21,
        critical_alert_days: 30,
    },
    agents_enabled: {
        compliance: true,
        documentation: true,
        billing: true,
        escalation: true,
        renewal: true,
    },
    critical_alert_recipients: [],
    log_retention_days: 365,
};
//# sourceMappingURL=types.js.map