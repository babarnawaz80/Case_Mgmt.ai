/**
 * userName.ts — Robust human-readable display name for a user/staff record.
 *
 * Firestore user docs are inconsistent: some have `displayName`, some only
 * `firstName`/`lastName` (or snake_case `first_name`/`last_name`), some only
 * `email`. Callers were falling back to the raw Firestore UID when those were
 * missing, which surfaced strings like "1xBlFl6peziofgGu5Rrk" in the UI.
 *
 * This helper derives the best available name and NEVER returns the UID.
 */

type UserLike = Record<string, unknown> | null | undefined;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function staffDisplayName(data: UserLike, _uid?: string): string {
  if (!data) return "Unknown user";

  const displayName = str(data.displayName) || str(data.name);
  if (displayName) return displayName;

  const first = str(data.firstName) || str(data.first_name);
  const last = str(data.lastName) || str(data.last_name);
  const full = `${first} ${last}`.trim();
  if (full) return full;

  const preferred = str(data.preferred_name) || str(data.preferredName);
  if (preferred) return preferred;

  const email = str(data.email);
  if (email) return email.split("@")[0];

  return "Unknown user";
}
