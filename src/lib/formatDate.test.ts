import { describe, it, expect } from "vitest";
import { localYMD } from "./formatDate";

describe("localYMD", () => {
  it("returns local YYYY-MM-DD from a Date's local parts", () => {
    // May 31 2026, 9:00 local
    expect(localYMD(new Date(2026, 4, 31, 9, 0))).toBe("2026-05-31");
  });

  it("zero-pads month and day", () => {
    // Jan 5 2026
    expect(localYMD(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("zero-pads single-digit month and day together", () => {
    // Mar 9 2026
    expect(localYMD(new Date(2026, 2, 9))).toBe("2026-03-09");
  });

  // Bug documentation: localYMD must use LOCAL calendar parts, never UTC.
  // Using toISOString().slice(0,10) would shift the date by a day in
  // UTC-negative timezones for an evening time. We assert localYMD matches a
  // locally-constructed string, NOT toISOString().
  it("uses local calendar parts regardless of UTC rollover", () => {
    // Evening time that, in many UTC-negative zones, rolls to the next day in UTC.
    const d = new Date(2026, 11, 15, 23, 30); // Dec 15 2026, 11:30 PM local
    const expectedLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(localYMD(d)).toBe(expectedLocal);
    expect(localYMD(d)).toBe("2026-12-15");
  });

  it("defaults to now and matches today's local date", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(localYMD()).toBe(expected);
  });
});
