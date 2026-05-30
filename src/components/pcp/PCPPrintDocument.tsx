/**
 * PCPPrintDocument — Professional formatted PCP for print / PDF export.
 * Rendered off-screen at position:absolute left:-9999px.
 * @media print shows ONLY this component.
 */
import { useState } from "react";
import { type Individual } from "@/hooks/useIndividuals";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Organization {
  name?: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
}

interface PCPPrintDocumentProps {
  plan: Record<string, unknown>;
  individual: Individual;
  organization?: Organization | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(val?: string | null): string {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  } catch { return val; }
}

function calcAge(dob?: string | null): string {
  if (!dob) return "";
  const birth = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear() -
    (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
  return isNaN(age) ? "" : ` (Age ${age})`;
}

function bullets(arr?: unknown[]): string {
  if (!arr || arr.length === 0) return "• [To be completed]";
  return (arr as string[]).map(s => `• ${s}`).join("\n");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="print-section-header">
      SECTION {num} — {title.toUpperCase()}
    </div>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="print-table">
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={i}>
            <td className="print-label">{label}</td>
            <td>{value || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GoalBlock({ goal, index }: { goal: Record<string, unknown>; index: number }) {
  const objectives = Array.isArray(goal.objectives) ? goal.objectives as Record<string, unknown>[] : [];
  return (
    <div className="print-goal-block print-no-break">
      <div className="print-goal-header">
        Goal G{index + 1}: {(goal.title as string) || "Untitled Goal"}
      </div>
      <div className="print-goal-body">
        <p style={{ marginBottom: "8pt" }}>{(goal.description as string) || "—"}</p>
        <table className="print-table" style={{ marginBottom: "8pt" }}>
          <tbody>
            <tr>
              <td className="print-label" style={{ width: "35%" }}>Target Date</td>
              <td>{fmtDate(goal.targetDate as string) || "___________"}</td>
            </tr>
            <tr>
              <td className="print-label">Responsible Party</td>
              <td>{(goal.responsibleParty as string) || (goal.responsible as string) || "___________"}</td>
            </tr>
            <tr>
              <td className="print-label">Progress Status</td>
              <td>{(goal.progress as string) || (goal.status as string) || "Not Started"}</td>
            </tr>
          </tbody>
        </table>
        {objectives.length > 0 && (
          <div>
            <p style={{ fontWeight: "bold", fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4pt" }}>Objectives:</p>
            {objectives.map((obj, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6pt", marginBottom: "3pt" }}>
                <span style={{ display: "inline-block", width: "10pt", height: "10pt", border: "1px solid #333", flexShrink: 0, marginTop: "1pt" }} />
                <span style={{ fontSize: "9.5pt" }}>{(obj.description as string) || "—"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function PCPPrintDocument({ plan, individual, organization }: PCPPrintDocumentProps) {
  const [logoError, setLogoError] = useState(false);

  const ind = individual;
  const p = plan as any;

  const firstName = ind.first_name || "";
  const lastName = ind.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const planId = p.humanReadableId || `#${String(p.id || "").slice(0, 8)}`;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const footerDate = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

  const goals: Record<string, unknown>[] = Array.isArray(p.goals) ? p.goals : [];
  const services: Record<string, unknown>[] = Array.isArray(p.services) ? p.services : [];
  const supportNeeds = p.supportNeeds || {};
  const healthAndSafety = p.healthAndSafety || {};
  const backupPlan = p.backupPlan || {};
  const individualSummary = p.individualSummary || {};
  const riskFactors: string[] = Array.isArray(healthAndSafety.riskFactors) ? healthAndSafety.riskFactors : [];

  const orgName = organization?.name || "CaseManagement.AI";
  const logoUrl = !logoError ? organization?.logoUrl : null;

  return (
    <div id="pcp-print-root" className="pcp-print-document">
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="print-header">
        <div className="print-header-left">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName}
              onError={() => setLogoError(true)}
              style={{ maxHeight: "60pt", maxWidth: "160pt", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontWeight: "bold", fontSize: "13pt" }}>{orgName}</span>
          )}
        </div>
        <div className="print-header-center">
          <div style={{ fontWeight: "bold", fontSize: "16pt", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Person-Centered Plan
          </div>
          <div style={{ fontSize: "10pt", marginTop: "4pt" }}>
            {(p.plan_type as string) || "Individual Support Plan (ISP)"}
          </div>
          <div style={{ fontSize: "9pt", marginTop: "3pt", fontFamily: "monospace" }}>
            Plan ID: {planId} | Status: {(p.status as string) || "Draft"}
          </div>
          <div style={{ fontSize: "9pt", marginTop: "2pt" }}>
            Effective: {fmtDate((p.effective_date || p.effectiveDate) as string)} &nbsp;|&nbsp;
            Annual Date: {fmtDate((p.annual_plan_date || p.annualPlanDate || p.internalDueDate) as string)}
          </div>
        </div>
        <div className="print-header-right">
          <div style={{ fontSize: "8pt", color: "#555", textAlign: "right" }}>
            Powered by<br /><strong>CaseManagement.AI</strong>
          </div>
        </div>
      </div>

      <hr className="print-rule" />

      {/* HIPAA Notice */}
      <div className="print-hipaa-box">
        CONFIDENTIAL — This document contains protected health information (PHI) covered under HIPAA.
        Unauthorized use or disclosure is strictly prohibited. Handle with care.
      </div>

      {/* ── SECTION 1 — INDIVIDUAL INFORMATION ─────────────────────────── */}
      <SectionHeader num={1} title="Individual Information" />
      <div style={{ display: "flex", gap: "12pt", marginBottom: "10pt" }}>
        <table className="print-table" style={{ flex: 1 }}>
          <tbody>
            <tr><td className="print-label">Legal Name</td><td>{fullName || "—"}</td></tr>
            <tr><td className="print-label">Preferred Name</td><td>{(ind as any).preferred_name || "—"}</td></tr>
            <tr><td className="print-label">Date of Birth</td><td>{(ind as any).date_of_birth || (ind as any).dob || "—"}{calcAge((ind as any).date_of_birth)}</td></tr>
            <tr><td className="print-label">Gender</td><td>{ind.gender || "—"}</td></tr>
            <tr><td className="print-label">Medicaid ID</td><td>{(ind as any).medicaid_id || (ind as any).medicaidId || "—"}</td></tr>
            <tr><td className="print-label">County</td><td>{ind.county || "—"}</td></tr>
            <tr><td className="print-label">Program / Waiver</td><td>{ind.program || (ind as any).program_type || "—"}</td></tr>
            <tr><td className="print-label">Waiver Type</td><td>{(ind as any).waiver_type || (ind as any).waiverType || "—"}</td></tr>
            <tr><td className="print-label">Primary Diagnosis</td><td>{(ind as any).primary_diagnosis || (ind as any).diagnosis || "—"}</td></tr>
            <tr><td className="print-label">Level of Care</td><td>{(ind as any).level_of_care || (ind as any).levelOfCare || "—"}</td></tr>
          </tbody>
        </table>
        <table className="print-table" style={{ flex: 1 }}>
          <tbody>
            <tr><td className="print-label">Case Manager (CCS)</td><td>{ind.assigned_case_manager_name || "—"}</td></tr>
            <tr><td className="print-label">CM Contact</td><td>{(ind as any).assigned_case_manager_email || "—"}</td></tr>
            <tr><td className="print-label">Agency</td><td>{(ind as any).agency || orgName}</td></tr>
            <tr><td className="print-label">Enrollment Status</td><td>{ind.enrollment_status || "—"}</td></tr>
            <tr><td className="print-label">MA Status</td><td>{(ind as any).medicaid_status || (ind as any).medicaidStatus || "—"}</td></tr>
            <tr><td className="print-label">MA Renewal Date</td><td>{fmtDate((ind as any).ma_redetermination_date)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* ── SECTION 2 — PERSONALLY DEFINED GOOD LIFE ────────────────────── */}
      <SectionHeader num={2} title={`Personally Defined Good Life`} />
      <p style={{ fontStyle: "italic", fontSize: "9.5pt", marginBottom: "4pt" }}>
        {firstName}'s vision for a good life, in their own words:
      </p>
      <div className="print-bordered-box" style={{ minHeight: "48pt" }}>
        {p.personallyDefinedGoodLife?.vision ||
          (Array.isArray(individualSummary.interests) && individualSummary.interests.length > 0
            ? (individualSummary.interests as string[]).join(". ") + "."
            : (typeof p.goodLife === "string" && p.goodLife) ||
              "[To be completed — describe the individual's vision for their ideal life]")}
      </div>

      {/* ── SECTION 3 — IMPORTANT TO / FOR ─────────────────────────────── */}
      <SectionHeader num={3} title={`Important To / Important For ${firstName}`} />
      <table className="print-table">
        <thead>
          <tr>
            <th className="print-th">IMPORTANT TO {firstName.toUpperCase()}</th>
            <th className="print-th">IMPORTANT FOR {firstName.toUpperCase()}</th>
            <th className="print-th">STRENGTHS</th>
            <th className="print-th">NATURAL SUPPORTS</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ verticalAlign: "top" }}>
            <td style={{ whiteSpace: "pre-line" }}>{bullets(individualSummary.interests as string[])}</td>
            <td style={{ whiteSpace: "pre-line" }}>{bullets(individualSummary.supportNeeds as string[])}</td>
            <td style={{ whiteSpace: "pre-line" }}>{bullets(individualSummary.strengths as string[])}</td>
            <td style={{ whiteSpace: "pre-line" }}>{bullets(individualSummary.naturalSupports as string[])}</td>
          </tr>
        </tbody>
      </table>

      {/* ── SECTION 4 — GOALS AND OUTCOMES ──────────────────────────────── */}
      <SectionHeader num={4} title="Goals and Outcomes" />
      {goals.length === 0 ? (
        <p style={{ color: "#666", fontStyle: "italic" }}>No goals recorded. [To be completed]</p>
      ) : (
        goals.map((goal, i) => <GoalBlock key={i} goal={goal} index={i} />)
      )}

      {/* ── SECTION 5 — HEALTH AND SAFETY ───────────────────────────────── */}
      <SectionHeader num={5} title="Health and Safety / Risk Mitigation" />
      {riskFactors.length > 0 ? (
        riskFactors.map((risk, i) => (
          <div key={i} className="print-goal-block print-no-break" style={{ marginBottom: "10pt" }}>
            <div className="print-goal-header">Risk {i + 1}: {typeof risk === "string" ? risk.slice(0, 60) : "Risk"}</div>
            <div className="print-goal-body">
              <table className="print-table">
                <tbody>
                  <tr><td className="print-label">Description</td><td>{typeof risk === "string" ? risk : "—"}</td></tr>
                  <tr><td className="print-label">Mitigation Strategy</td><td>{healthAndSafety.mitigationStrategies?.[i] || "To be developed with support team"}</td></tr>
                  <tr><td className="print-label">Supporting Document</td><td>BSP</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <p style={{ color: "#666", fontStyle: "italic" }}>No specific risks documented. [To be completed]</p>
      )}
      {healthAndSafety.safetyPlan && (
        <div style={{ marginBottom: "10pt" }}>
          <p style={{ fontWeight: "bold", marginBottom: "4pt" }}>SAFETY PLAN:</p>
          <div className="print-bordered-box">{healthAndSafety.safetyPlan}</div>
        </div>
      )}
      <div>
        <p style={{ fontWeight: "bold", marginBottom: "4pt" }}>EMERGENCY / BACKUP PLAN:</p>
        <div className="print-bordered-box" style={{ minHeight: "36pt" }}>
          {backupPlan.primaryBackup || "—"}
        </div>
      </div>

      {/* ── SECTION 6 — SERVICES AND SUPPORTS ───────────────────────────── */}
      <SectionHeader num={6} title="Services and Supports" />
      <table className="print-table">
        <thead>
          <tr>
            <th className="print-th">SERVICE</th>
            <th className="print-th">PROVIDER</th>
            <th className="print-th">FREQUENCY</th>
            <th className="print-th">AUTHORIZATION</th>
          </tr>
        </thead>
        <tbody>
          {services.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: "center", color: "#666", fontStyle: "italic" }}>No services recorded.</td></tr>
          ) : services.map((s, i) => (
            <tr key={i}>
              <td>{(s.name as string) || (s.serviceName as string) || "—"}</td>
              <td>{(s.provider as string) || "—"}</td>
              <td>{(s.frequency as string) || (s.units as string) || "—"}</td>
              <td>{(s.authorizationId as string) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: "8pt" }}>
        <p style={{ fontWeight: "bold", marginBottom: "4pt", fontSize: "9.5pt" }}>MONITORING REQUIREMENTS:</p>
        {["Monthly contact — Required", "Quarterly in-home visit — Required", "Semi-annual plan review — Required", "Annual recertification — Required"].map((r, i) => (
          <div key={i} style={{ fontSize: "9.5pt" }}>• {r}</div>
        ))}
      </div>

      {/* ── SECTION 7 — SUPPORT NEEDS ────────────────────────────────────── */}
      <SectionHeader num={7} title="Support Needs and Preferences" />
      <InfoTable rows={[
        ["Communication", supportNeeds.communication || "—"],
        ["Mobility", supportNeeds.mobility || "—"],
        ["Self-Care", supportNeeds.selfCare || "—"],
        ["Behavioral Support", supportNeeds.behavioral || "—"],
        ["Medical Support", supportNeeds.medical || "—"],
        ...(supportNeeds.other ? [["Other", supportNeeds.other] as [string, string]] : []),
      ]} />

      {/* ── SECTION 8 — RIGHTS AND RESPONSIBILITIES ─────────────────────── */}
      <SectionHeader num={8} title="Rights and Responsibilities" />
      <div style={{ fontSize: "9.5pt", lineHeight: 1.6 }}>
        <p style={{ marginBottom: "8pt" }}><strong>{firstName} has the right to:</strong></p>
        {["Make choices about daily activities, services, and supports",
          "Receive services in the least restrictive setting",
          "Have privacy and confidentiality maintained at all times",
          "File a grievance or appeal without retaliation",
          "Access their own records upon request",
          "Be treated with dignity and respect at all times",
          "Withdraw consent or discontinue services at any time"].map((r, i) => (
          <div key={i} style={{ marginBottom: "2pt" }}>• {r}</div>
        ))}
        <p style={{ marginTop: "8pt", marginBottom: "8pt" }}><strong>{firstName} understands the responsibility to:</strong></p>
        {["Communicate needs and preferences to the care team",
          "Notify the case manager of any changes in circumstances",
          "Participate in planning meetings and reviews"].map((r, i) => (
          <div key={i} style={{ marginBottom: "2pt" }}>• {r}</div>
        ))}
      </div>

      {/* ── SECTION 9 — CARE TEAM ────────────────────────────────────────── */}
      <SectionHeader num={9} title="Care Team Members" />
      <table className="print-table">
        <thead>
          <tr>
            <th className="print-th">NAME</th>
            <th className="print-th">ROLE</th>
            <th className="print-th">AGENCY / ORGANIZATION</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{ind.assigned_case_manager_name || "—"}</td>
            <td>Case Manager (CCS)</td>
            <td>{(ind as any).agency || orgName}</td>
          </tr>
          {(Array.isArray(p.team) ? p.team as any[] : [])
            .filter((m: any) => m.name !== ind.assigned_case_manager_name)
            .map((m: any, i: number) => (
              <tr key={i}>
                <td>{m.name || "—"}</td>
                <td>{m.role || "—"}</td>
                <td>{m.agency || "—"}</td>
              </tr>
            ))}
          <tr>
            <td>{fullName}</td>
            <td>Individual (Plan Participant)</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>

      {/* ── SECTION 10 — SIGNATURES (forced new page) ────────────────────── */}
      <div className="print-page-break">
        <SectionHeader num={10} title="Signatures and Attestation" />
        <p style={{ fontSize: "10pt", marginBottom: "16pt", lineHeight: 1.6 }}>
          This Person-Centered Plan was developed with the full participation of <strong>{fullName}</strong> and their
          support team. All parties agree that this plan reflects {firstName}'s preferences, needs, and goals.
        </p>

        {/* Participant */}
        <div className="print-sig-block">
          <p style={{ fontWeight: "bold", marginBottom: "12pt" }}>PARTICIPANT / LEGALLY RESPONSIBLE PERSON</p>
          <div style={{ display: "flex", gap: "24pt", marginBottom: "10pt" }}>
            <div style={{ flex: 2 }}>
              <div className="print-sig-line" />
              <p style={{ fontSize: "8pt", marginTop: "2pt" }}>Signature</p>
            </div>
            <div style={{ flex: 1 }}>
              <div className="print-sig-line" />
              <p style={{ fontSize: "8pt", marginTop: "2pt" }}>Date</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "24pt", marginBottom: "10pt" }}>
            <div style={{ flex: 2 }}>
              <div className="print-sig-line" />
              <p style={{ fontSize: "8pt", marginTop: "2pt" }}>Print Name</p>
            </div>
            <div style={{ flex: 1 }}>
              <div className="print-sig-line" />
              <p style={{ fontSize: "8pt", marginTop: "2pt" }}>Relationship</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16pt", fontSize: "9.5pt" }}>
            <span>☐ Person receiving services</span>
            <span>☐ Legal guardian</span>
            <span>☐ Authorized representative</span>
          </div>
        </div>

        {/* Case Manager */}
        <div className="print-sig-block">
          <p style={{ fontWeight: "bold", marginBottom: "12pt" }}>CASE MANAGER / RESPONSIBLE PARTY</p>
          <div style={{ display: "flex", gap: "24pt", marginBottom: "10pt" }}>
            <div style={{ flex: 2 }}>
              <div className="print-sig-line" />
              <p style={{ fontSize: "8pt", marginTop: "2pt" }}>Signature</p>
            </div>
            <div style={{ flex: 1 }}>
              <div className="print-sig-line" />
              <p style={{ fontSize: "8pt", marginTop: "2pt" }}>Date</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "24pt", fontSize: "9.5pt" }}>
            <span>Print Name: <strong>{ind.assigned_case_manager_name || "___________________"}</strong></span>
            <span>Title: Case Manager / CCS</span>
          </div>
          <div style={{ marginTop: "4pt", fontSize: "9.5pt" }}>
            Agency: {(ind as any).agency || orgName}
          </div>
        </div>

        {/* Attestation */}
        <div style={{ borderTop: "1pt solid #333", paddingTop: "12pt", marginTop: "4pt" }}>
          <p style={{ fontWeight: "bold", marginBottom: "8pt", fontSize: "10pt" }}>ATTESTATION</p>
          <div style={{ fontSize: "9.5pt", lineHeight: 1.8 }}>
            <div>☐ I have reviewed this Person-Centered Plan and agree that it accurately reflects my goals, preferences, and needs.</div>
            <div>☐ Participant / Guardian has reviewed and acknowledged this document.</div>
          </div>
        </div>

        {/* Version note */}
        {p.versionNote && (
          <div style={{ marginTop: "16pt", fontSize: "8.5pt", color: "#555", borderTop: "1pt solid #ccc", paddingTop: "8pt" }}>
            <strong>Version Note:</strong> {p.versionNote as string}
          </div>
        )}
      </div>

      {/* ── FOOTER (every page) ───────────────────────────────────────────── */}
      <div className="print-footer">
        <span>{fullName} — {planId} — CONFIDENTIAL</span>
        <span>Generated: {footerDate} · CaseManagement.AI</span>
      </div>
    </div>
  );
}
