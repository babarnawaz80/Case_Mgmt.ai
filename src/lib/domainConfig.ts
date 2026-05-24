// Domain configuration — determines which subdomain the user is accessing
// Used to enforce domain-specific routing and access control rules.

const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

/** admin.casemanagement.ai — Platform admin portal only */
export const isAdminDomain = hostname === 'admin.casemanagement.ai';

/** app.casemanagement.ai — Customer-facing application only */
export const isCustomerDomain = hostname === 'app.casemanagement.ai';

/** casemanagement-ai.web.app — Firebase Hosting canonical domain (neutral, used during dev/testing) */
export const isFirebaseDomain = hostname === 'casemanagement-ai.web.app';
