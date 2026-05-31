// stateUtils.ts — Canonical US-state normalization for compliance grouping.
//
// Individual records store `address_state` as a free-text string. Over time the
// demo + production data accumulated mixed spellings ("IN" vs "Indiana"). These
// helpers collapse every variant to ONE canonical full-name form so the
// orchestrator never splits the same state into two rows/filters.

// Abbreviation / variant → canonical full name
const STATE_CANONICAL: Record<string, string> = {
  // Indiana
  "IN": "Indiana", "indiana": "Indiana",
  // New Jersey
  "NJ": "New Jersey", "new jersey": "New Jersey",
  // A few others we may encounter
  "CA": "California", "california": "California",
  "TX": "Texas", "texas": "Texas",
  "OH": "Ohio", "ohio": "Ohio",
  "IL": "Illinois", "illinois": "Illinois",
};

// Canonical full name → abbreviation (for the "(IN)" suffix in labels)
const STATE_ABBR: Record<string, string> = {
  "Indiana": "IN",
  "New Jersey": "NJ",
  "California": "CA",
  "Texas": "TX",
  "Ohio": "OH",
  "Illinois": "IL",
};

/**
 * Returns the canonical full-name form of a raw state value, or null if empty.
 * "IN" → "Indiana", "indiana" → "Indiana", "Indiana" → "Indiana".
 */
export function canonicalState(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  // Exact match on canonical first
  if (STATE_ABBR[s]) return s;
  // Lookup by lowercase / abbreviation
  return STATE_CANONICAL[s] ?? STATE_CANONICAL[s.toLowerCase()] ?? s;
}

/**
 * Returns a display label like "Indiana (IN)" for a canonical state.
 * Falls back to the raw value if unknown.
 */
export function stateDisplayLabel(canonical: string): string {
  const abbr = STATE_ABBR[canonical];
  return abbr ? `${canonical} (${abbr})` : canonical;
}

/**
 * Returns an individual's canonical state FOR COMPLIANCE / ORCHESTRATOR / REPORTING.
 *
 * AUTHORITATIVE SOURCE: the `state` field set when a program is assigned via
 * Profile → Program → Change Program, OR via New Participant Intake →
 * State of Enrollment. This is the state the ENROLLED PROGRAM operates in.
 *
 * The residence address (`address_state`, nested `address.state`) is NEVER
 * used — a person's home can be anywhere and has no compliance meaning.
 *
 * `program_state` is an explicit alias accepted for forward-compatibility.
 */
export function individualState(ind: any): string | null {
  return canonicalState(
    (ind as any)?.state ||        // ← set by Change Program / intake enrollment state
    (ind as any)?.program_state   // ← explicit alias
    // NOTE: address_state intentionally NOT included here
  );
}
