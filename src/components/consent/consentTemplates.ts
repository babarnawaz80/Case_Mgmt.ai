/**
 * Default full-text consent document templates.
 * Keys match DEFAULT_CONSENT_TYPES ids in PersonConsentsTab.tsx.
 * Content is stored as HTML for Tiptap.
 * Placeholders use [Bracket Notation] and are auto-substituted then highlighted.
 */

export interface TemplateData {
  id: string;
  label: string;
  bodyHtml: string;
}

export const FULL_TEMPLATES: TemplateData[] = [
  {
    id: "roi",
    label: "Release of Information (ROI)",
    bodyHtml: `<h1>AUTHORIZATION FOR RELEASE OF INFORMATION</h1>
<p>I, <strong>[Individual Name]</strong>, hereby authorize <strong>[Agency Name]</strong> and its designated staff to release and/or exchange information regarding my health, behavioral health, and social service records with the parties identified in this authorization.</p>
<h2>PURPOSE OF DISCLOSURE</h2>
<p>This information is being released for the purpose of coordinating care and services, including but not limited to: service planning, eligibility determination, referral coordination, and ongoing case management support.</p>
<h2>INFORMATION TO BE RELEASED</h2>
<p>The following types of information may be released under this authorization:</p>
<ul>
<li>Medical and health records</li>
<li>Behavioral health and psychiatric records</li>
<li>Social service and case management records</li>
<li>Program enrollment and eligibility information</li>
<li>Assessment results and service plans</li>
</ul>
<h2>RIGHTS AND LIMITATIONS</h2>
<p>I understand that I have the right to revoke this authorization at any time by providing written notice to my case manager. I understand that my treatment, payment, enrollment in a health plan, or eligibility for benefits may not be conditioned on signing this authorization. I understand that information disclosed pursuant to this authorization may be subject to re-disclosure by the recipient and may no longer be protected under HIPAA.</p>
<p>This authorization expires one (1) year from the date of signature unless revoked earlier.</p>`,
  },
  {
    id: "services",
    label: "Consent to Receive Services",
    bodyHtml: `<h1>CONSENT TO RECEIVE CASE MANAGEMENT SERVICES</h1>
<p>I, <strong>[Individual Name]</strong>, consent to receive case management and related support services provided by <strong>[Agency Name]</strong> as outlined in my Individual Service Plan (ISP) or Person-Centered Plan (PCP).</p>
<h2>SERVICES COVERED</h2>
<p>This consent covers the following services:</p>
<ul>
<li>Targeted Case Management (TCM)</li>
<li>Service coordination and planning</li>
<li>Monitoring of service delivery</li>
<li>Advocacy and linkage to community resources</li>
<li>Documentation and reporting as required by [State] Medicaid guidelines</li>
</ul>
<p>I understand that participation in these services is voluntary and that I may withdraw consent at any time. I understand that withdrawing consent may affect my eligibility for certain Medicaid-funded services.</p>
<p>This consent is valid for one (1) year from the date of signature and will be reviewed at each annual plan renewal.</p>`,
  },
  {
    id: "electronic",
    label: "Consent for Electronic Communication",
    bodyHtml: `<h1>CONSENT FOR ELECTRONIC COMMUNICATION</h1>
<p>I, <strong>[Individual Name]</strong>, authorize <strong>[Agency Name]</strong> to communicate with me via electronic means for the purpose of service coordination.</p>
<h2>AUTHORIZED COMMUNICATION METHODS</h2>
<ul>
<li>Email to [Individual Email]</li>
<li>Text message (SMS) to [Individual Phone]</li>
<li>Secure client portal messages</li>
</ul>
<h2>TYPES OF INFORMATION COMMUNICATED</h2>
<p>Electronic communications may include appointment reminders, service updates, document requests, and general case management correspondence. <strong>No sensitive health information</strong> will be transmitted without additional safeguards.</p>
<p>I understand that electronic communications may not be completely secure. I may revoke this consent at any time by contacting my case manager.</p>`,
  },
  {
    id: "provider",
    label: "Consent to Share with Provider",
    bodyHtml: `<h1>CONSENT TO SHARE INFORMATION WITH PROVIDER</h1>
<p>I, <strong>[Individual Name]</strong>, authorize <strong>[Agency Name]</strong> to share relevant health and service information with my service provider(s) listed below.</p>
<h2>PROVIDER INFORMATION</h2>
<p>Provider / Organization: [Provider Name]<br>
Address: [Provider Address]<br>
Purpose: Service coordination and care continuity</p>
<h2>INFORMATION TO BE SHARED</h2>
<ul>
<li>Current service plan and goals</li>
<li>Progress notes relevant to coordinated services</li>
<li>Contact information for coordination purposes</li>
<li>Eligibility and authorization information</li>
</ul>
<p>This consent expires one (1) year from the date of signature unless revoked earlier in writing.</p>`,
  },
  {
    id: "photo",
    label: "Consent for Photography / Video Recording",
    bodyHtml: `<h1>CONSENT FOR PHOTOGRAPHY AND VIDEO RECORDING</h1>
<p>I, <strong>[Individual Name]</strong>, authorize <strong>[Agency Name]</strong> and its designated staff to photograph or record me for the purposes described below.</p>
<h2>PURPOSE</h2>
<p>Photographs or recordings may be used for:</p>
<ul>
<li>Program documentation and case records</li>
<li>Staff training and quality assurance (de-identified)</li>
<li>Program reporting to funding agencies</li>
</ul>
<p>Photographs and recordings will NOT be used for any commercial purpose or shared publicly without additional written consent.</p>
<h2>RIGHTS</h2>
<p>I understand that I may revoke this consent at any time. Revocation will not affect any photographs or recordings already made in good faith prior to the notice of revocation.</p>`,
  },
  {
    id: "emergency",
    label: "Emergency Medical Consent",
    bodyHtml: `<h1>EMERGENCY MEDICAL CONSENT</h1>
<p>I, <strong>[Individual Name]</strong> (or authorized representative), authorize emergency medical treatment for <strong>[Individual Name]</strong> in the event that I cannot be reached to provide consent.</p>
<h2>SCOPE OF AUTHORIZATION</h2>
<p>This authorization covers emergency medical treatment deemed necessary by licensed medical professionals when:</p>
<ul>
<li>There is an immediate threat to health or safety</li>
<li>The guardian / authorized representative cannot be reached within a reasonable time</li>
<li>Delaying treatment would result in harm</li>
</ul>
<h2>EMERGENCY CONTACT</h2>
<p>Primary contact: [Guardian Name] — Phone: [Guardian Phone]<br>
Secondary contact: [Emergency Contact Name] — Phone: [Emergency Contact Phone]</p>
<p>This consent is valid for one (1) year and will be reviewed annually.</p>`,
  },
  {
    id: "rights",
    label: "Guardian Acknowledgment of Rights",
    bodyHtml: `<h1>GUARDIAN ACKNOWLEDGMENT OF INDIVIDUAL RIGHTS</h1>
<p>I, <strong>[Guardian Name]</strong>, as legal guardian of <strong>[Individual Name]</strong>, acknowledge that I have been informed of and understand the individual's rights as a recipient of services from <strong>[Agency Name]</strong>.</p>
<h2>RIGHTS ACKNOWLEDGED</h2>
<ul>
<li>The right to receive services in a safe, respectful environment</li>
<li>The right to privacy and confidentiality of records</li>
<li>The right to participate in developing and reviewing the service plan</li>
<li>The right to refuse or discontinue services without penalty</li>
<li>The right to file a complaint or grievance without fear of retaliation</li>
<li>The right to access personal records upon request</li>
<li>The right to be free from abuse, neglect, and exploitation</li>
</ul>
<p>I acknowledge receipt of the Individual Rights Notice and agree to uphold these rights on behalf of [Individual Name].</p>`,
  },
  {
    id: "ambient",
    label: "Ambient Listening Consent",
    bodyHtml: `<h1>CONSENT FOR AMBIENT LISTENING TECHNOLOGY</h1>
<p>I, <strong>[Individual Name]</strong>, consent to the use of ambient listening technology during case management sessions conducted by <strong>[Agency Name]</strong>.</p>
<h2>WHAT THIS MEANS</h2>
<p>During meetings, visits, or calls with my case manager, an AI-powered ambient listening tool may be used to automatically transcribe the conversation and assist with documentation. This technology:</p>
<ul>
<li>Records and transcribes speech in real-time</li>
<li>Extracts relevant information to assist with case notes and documentation</li>
<li>Does <strong>NOT</strong> make any decisions about my services or care</li>
<li>Is used only by authorized [Agency Name] staff</li>
</ul>
<h2>DATA HANDLING</h2>
<p>All transcriptions and extracted information are stored securely and protected under HIPAA. Transcripts are used solely for documentation purposes and are not shared with third parties without separate authorization.</p>
<p>I understand that I may revoke this consent at any time by notifying my case manager. Revoking this consent will not affect my services.</p>`,
  },
  {
    id: "bsp",
    label: "Behavioral Support Plan Consent",
    bodyHtml: `<h1>CONSENT FOR BEHAVIORAL SUPPORT PLAN</h1>
<p>I, <strong>[Individual Name]</strong> (or authorized representative), consent to the implementation of the Behavioral Support Plan (BSP) developed by <strong>[Agency Name]</strong> and the individual's support team.</p>
<h2>OVERVIEW OF THE PLAN</h2>
<p>The Behavioral Support Plan was developed with input from the individual, guardian, and support team. It addresses the following areas:</p>
<ul>
<li>Target behaviors and measurable goals</li>
<li>Positive behavioral support strategies</li>
<li>Data collection and review schedule</li>
<li>Crisis prevention and response procedures</li>
</ul>
<h2>REVIEW SCHEDULE</h2>
<p>The Behavioral Support Plan will be reviewed every 90 days or sooner if needed. Any significant changes require updated consent.</p>
<p>I understand I may withdraw this consent at any time. I understand that withdrawal of consent may require a team meeting to develop an alternative approach.</p>`,
  },
  {
    id: "hipaa",
    label: "HIPAA Notice of Privacy Practices",
    bodyHtml: `<h1>ACKNOWLEDGMENT OF HIPAA NOTICE OF PRIVACY PRACTICES</h1>
<p>I, <strong>[Individual Name]</strong>, acknowledge receipt of the Notice of Privacy Practices from <strong>[Agency Name]</strong> as required by the Health Insurance Portability and Accountability Act (HIPAA).</p>
<h2>KEY POINTS OF THE NOTICE</h2>
<ul>
<li><strong>Uses and Disclosures:</strong> [Agency Name] may use and share health information for treatment, payment, and health care operations without separate authorization.</li>
<li><strong>Your Rights:</strong> You have the right to request copies of your health records, request corrections, request restrictions on certain disclosures, and request an accounting of disclosures.</li>
<li><strong>Our Duties:</strong> [Agency Name] is required by law to maintain the privacy of protected health information and to provide this Notice of Privacy Practices.</li>
<li><strong>Complaints:</strong> You may file a complaint with [Agency Name] or with the U.S. Department of Health and Human Services Office for Civil Rights if you believe your privacy rights have been violated.</li>
</ul>
<p>A copy of the full Notice of Privacy Practices is available upon request or at [Agency Website].</p>`,
  },
];

/** Signature block — always appended at the bottom, non-editable */
export const SIGNATURE_BLOCK_HTML = `<hr>
<h2>SIGNATURE AND AGREEMENT</h2>
<p>By signing below, I acknowledge that I have read, understand, and agree to the terms of this consent.</p>
<p>Participant / Guardian Signature: _________________________</p>
<p>Printed Name: _________________________</p>
<p>Date: _________________________</p>
<p>Relationship to Individual: _________________________</p>
<p>☐ Self (person receiving services) &nbsp;&nbsp;&nbsp; ☐ Legal Guardian &nbsp;&nbsp;&nbsp; ☐ Authorized Representative &nbsp;&nbsp;&nbsp; ☐ Parent</p>
<hr>
<p>Case Manager Signature: _________________________</p>
<p>Printed Name: _________________________&nbsp;&nbsp;&nbsp;&nbsp;Title: Case Manager / CCS</p>
<p>Date: _________________________&nbsp;&nbsp;&nbsp;&nbsp;Agency: _________________________</p>`;

/** Variable substitution — replaces known placeholders with actual values */
export function substituteVariables(html: string, data: {
  individualName?: string;
  agencyName?: string;
  state?: string;
  cmName?: string;
  today?: string;
  guardianName?: string;
  guardianPhone?: string;
  individualPhone?: string;
  individualEmail?: string;
}): string {
  const today = data.today ?? new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return html
    .replace(/\[Individual Name\]/g, data.individualName ?? "[Individual Name]")
    .replace(/\[Agency Name\]/g,     data.agencyName    ?? "[Agency Name]")
    .replace(/\[State\]/g,           data.state         ?? "[State]")
    .replace(/\[CM Name\]/g,         data.cmName        ?? "[CM Name]")
    .replace(/\[Today\'s Date\]/g,   today)
    .replace(/\[Date\]/g,            today)
    .replace(/\[Guardian Name\]/g,   data.guardianName  ?? "[Guardian Name]")
    .replace(/\[Guardian Phone\]/g,  data.guardianPhone ?? "[Guardian Phone]")
    .replace(/\[Individual Phone\]/g, data.individualPhone ?? "[Individual Phone]")
    .replace(/\[Individual Email\]/g, data.individualEmail ?? "[Individual Email]");
}

/** Find all remaining [placeholders] in HTML text */
export function findUnfilledPlaceholders(html: string): string[] {
  const matches = html.match(/\[[^\]]{1,60}\]/g) ?? [];
  return [...new Set(matches)];
}

/** Wrap remaining [placeholders] with yellow mark for preview rendering */
export function highlightPlaceholders(html: string): string {
  return html.replace(
    /\[([^\]]{1,60})\]/g,
    '<mark style="background:#fef08a;border-radius:2px;padding:0 2px">[$1]</mark>'
  );
}
