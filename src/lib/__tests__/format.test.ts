import { describe, it, expect } from "vitest";
import { fmtPct, fmtNum, fmtDate, yieldColor, kategoriDefectColor } from "@/lib/format";

describe("fmtPct", () => {
  it("formats decimal to percentage", () => {
    expect(fmtPct(0.9567)).toBe("95.67%");
  });

  it("returns dash for null", () => {
    expect(fmtPct(null)).toBe("-");
  });

  it("returns dash for non-finite", () => {
    expect(fmtPct(Infinity)).toBe("-");
    expect(fmtPct(NaN)).toBe("-");
  });

  it("uses custom digits", () => {
    expect(fmtPct(0.5, 0)).toBe("50%");
  });
});

describe("fmtNum", () => {
  it("formats number with locale", () => {
    expect(fmtNum(1000)).toBe("1.000");
  });

  it("returns dash for null", () => {
    expect(fmtNum(null)).toBe("-");
    expect(fmtNum(undefined)).toBe("-");
  });
});

describe("fmtDate", () => {
  it("formats date string", () => {
    const result = fmtDate("2026-07-15");
    expect(result).toContain("Jul");
  });

  it("returns dash for null", () => {
    expect(fmtDate(null)).toBe("-");
    expect(fmtDate(undefined)).toBe("-");
  });

  it("returns dash for invalid date", () => {
    expect(fmtDate("not-a-date")).toBe("-");
  });
});

describe("yieldColor", () => {
  it("returns success for high yield", () => {
    expect(yieldColor(0.99)).toBe("text-success");
  });

  it("returns warning for medium yield", () => {
    expect(yieldColor(0.96)).toBe("text-warning");
  });

  it("returns destructive for low yield", () => {
    expect(yieldColor(0.9)).toBe("text-destructive");
  });
});

describe("kategoriDefectColor", () => {
  it("returns color for each category", () => {
    expect(kategoriDefectColor("Proses")).toContain("info");
    expect(kategoriDefectColor("Kosmetik")).toContain("purple");
    expect(kategoriDefectColor("Dimensi")).toContain("warning");
    expect(kategoriDefectColor("Material")).toContain("success");
    expect(kategoriDefectColor("Fungsi")).toContain("destructive");
  });

  it("returns default for unknown category", () => {
    expect(kategoriDefectColor(null)).toContain("muted");
    expect(kategoriDefectColor("Unknown")).toContain("muted");
  });
});
