// Staff provider & billing information.
// Per-user license + state Medicaid enrollment records used by the
// Users & Roles settings detail page (Admin-only) and the users list badge.

export type CredentialType =
  | "Licensed Social Worker"
  | "QIDP"
  | "Certified Case Manager"
  | "RN"
  | "LPN"
  | "Other";

export const CREDENTIAL_TYPES: CredentialType[] = [
  "Licensed Social Worker",
  "QIDP",
  "Certified Case Manager",
  "RN",
  "LPN",
  "Other",
];

export interface StaffStateEnrollment {
  id: string;
  state: string;
  providerId: string;
  status: "Active" | "Pending" | "Expired";
  effective: string;  // MM/DD/YYYY
  expiration: string; // MM/DD/YYYY
}

export interface StaffProviderInfo {
  npi?: string;
  taxonomy?: string;
  credentialType?: CredentialType;
  licenseNumber?: string;
  licenseExpiration?: string; // MM/DD/YYYY
  supervisingProviderUserId?: string;
  enrollments: StaffStateEnrollment[];
}

// Build a date 60 days from now for Kathy to demo the "expiring soon" badge.
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

export const staffProviderInfo: Record<string, StaffProviderInfo> = {
  "u-001": {
    npi: "1922334455",
    taxonomy: "251B00000X",
    credentialType: "Certified Case Manager",
    licenseNumber: "CCM-IN-44210",
    licenseExpiration: "06/30/2028",
    enrollments: [
      { id: "bn-in", state: "Indiana", providerId: "IN-PROV-BN-1044", status: "Active", effective: "03/01/2022", expiration: "02/28/2027" },
    ],
  },
  "u-002": {
    npi: "1788991122",
    taxonomy: "251T00000X",
    credentialType: "Certified Case Manager",
    licenseNumber: "CCM-IN-58921",
    licenseExpiration: inDays(60),
    supervisingProviderUserId: "u-003",
    enrollments: [
      { id: "ka-in", state: "Indiana", providerId: "IN-PROV-KA-2891", status: "Active", effective: "01/01/2023", expiration: "12/31/2026" },
    ],
  },
};

export function getStaffProvider(userId: string): StaffProviderInfo {
  return staffProviderInfo[userId] ?? { enrollments: [] };
}

function parseMDY(s?: string): Date | null {
  if (!s) return null;
  const [m, d, y] = s.split("/").map((n) => parseInt(n, 10));
  if (!m || !d || !y) return null;
  return new Date(y, m - 1, d);
}

export function daysUntil(s?: string): number | null {
  const dt = parseMDY(s);
  if (!dt) return null;
  return Math.ceil((dt.getTime() - Date.now()) / 86_400_000);
}

export type CredentialBadge = {
  tone: "amber" | "red";
  label: string;
};

export function credentialBadge(userId: string): CredentialBadge | null {
  const info = getStaffProvider(userId);
  const days = daysUntil(info.licenseExpiration);
  if (days === null) return null;
  if (days < 0) return { tone: "red", label: "Credential expired — billing blocked" };
  if (days <= 90) return { tone: "amber", label: "Credential expiring soon" };
  return null;
}
