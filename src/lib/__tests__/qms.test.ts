import { describe, expect, it } from "vitest";
import { buildNcNumber, nextNcNumber, parseNcSeq } from "@/lib/qms";

describe("buildNcNumber", () => {
  it("formats NC-YYYYMM-### with zero padding", () => {
    expect(buildNcNumber(2026, 9, 1)).toBe("NC-202609-001");
    expect(buildNcNumber(2026, 12, 42)).toBe("NC-202612-042");
  });
});

describe("parseNcSeq", () => {
  it("extracts sequence for matching prefix", () => {
    expect(parseNcSeq("NC-202609-007", "NC-202609")).toBe(7);
  });

  it("returns null for other periods or invalid suffix", () => {
    expect(parseNcSeq("NC-202608-007", "NC-202609")).toBeNull();
    expect(parseNcSeq("NC-202609-ABC", "NC-202609")).toBeNull();
    expect(parseNcSeq("NC-202609-000", "NC-202609")).toBeNull();
  });
});

describe("nextNcNumber", () => {
  it("starts at 001 when no numbers exist", () => {
    expect(nextNcNumber([], 2026, 9)).toBe("NC-202609-001");
  });

  it("increments from the highest sequence of the same period", () => {
    expect(nextNcNumber(["NC-202609-001", "NC-202609-003", "NC-202609-002"], 2026, 9)).toBe(
      "NC-202609-004",
    );
  });

  it("ignores numbers from other periods", () => {
    expect(nextNcNumber(["NC-202608-099", "NC-202609-001"], 2026, 9)).toBe("NC-202609-002");
  });
});
