import { describe, it, expect } from "vitest";
import { staffDisplayName } from "./userName";

describe("staffDisplayName", () => {
  it("uses displayName when present", () => {
    expect(staffDisplayName({ displayName: "Kathy Bates" })).toBe("Kathy Bates");
  });

  it("falls back to name when displayName missing", () => {
    expect(staffDisplayName({ name: "Jane Doe" })).toBe("Jane Doe");
  });

  it("composes camelCase firstName/lastName", () => {
    expect(staffDisplayName({ firstName: "John", lastName: "Smith" })).toBe("John Smith");
  });

  it("composes snake_case first_name/last_name", () => {
    expect(staffDisplayName({ first_name: "Mary", last_name: "Jones" })).toBe("Mary Jones");
  });

  it("uses only firstName when lastName missing", () => {
    expect(staffDisplayName({ firstName: "Solo" })).toBe("Solo");
  });

  it("returns email local part when only email present", () => {
    expect(staffDisplayName({ email: "alex.brown@example.com" })).toBe("alex.brown");
  });

  it("uses preferred_name when set", () => {
    expect(staffDisplayName({ preferred_name: "Liz" })).toBe("Liz");
  });

  it("uses preferredName (camelCase) when set", () => {
    expect(staffDisplayName({ preferredName: "Bob" })).toBe("Bob");
  });

  it("returns 'Unknown user' for null", () => {
    expect(staffDisplayName(null)).toBe("Unknown user");
  });

  it("returns 'Unknown user' for undefined", () => {
    expect(staffDisplayName(undefined)).toBe("Unknown user");
  });

  it("returns 'Unknown user' for empty object", () => {
    expect(staffDisplayName({})).toBe("Unknown user");
  });

  it("returns 'Unknown user' for whitespace-only / empty string fields", () => {
    expect(staffDisplayName({ displayName: "   ", firstName: "", email: "" })).toBe("Unknown user");
  });

  // CRITICAL regression: a record with only a role must NOT return the Firebase
  // UID passed as the second argument. This was the original bug — the UI showed
  // raw UIDs like "1xBlFl6peziofgGu5Rrk".
  it("never returns the Firebase UID when only a role is present", () => {
    const uid = "1xBlFl6peziofgGu5Rrk";
    const result = staffDisplayName({ role: "case_manager" }, uid);
    expect(result).not.toBe(uid);
    expect(result).toBe("Unknown user");
  });
});
