import { describe, it, expect } from "vitest";
import {
  validateReportRow,
  applyManagementFilters,
  aggregateBy,
  buildTrend,
  buildDefectPareto,
  buildInsights,
  formatValidationIssue,
} from "@/lib/management";

const baseReport = {
  id: "1",
  report_date: "2026-07-15",
  shift: "A" as const,
  no_meja: 1,
  part_no: "BTN-40",
  part_name: "BUTTON 40",
  qty_check: 100,
  total_ng: 5,
  total_ok: 95,
  jam_mulai: "08:00",
  jam_selesai: "16:00",
  created_by: "user-1",
  created_at: "2026-07-15T00:00:00Z",
  updated_at: "2026-07-15T00:00:00Z",
  actual_cycle_time: null,
};

const enrichedRow = {
  ...baseReport,
  inspector_name: "Test User",
  inspector_email: "test@test.com",
  validation: { score: 100, status: "good" as const, issues: [] },
};

describe("validateReportRow", () => {
  it("flags ng without detail for reports with NG but no defect details", () => {
    const result = validateReportRow(baseReport, null);
    expect(result.issues).toContain("ng_without_detail");
    expect(result.status).toBe("warning");
  });

  it("flags missing core fields", () => {
    const result = validateReportRow({ ...baseReport, part_name: "" }, null);
    expect(result.issues).toContain("missing_core");
  });

  it("flags negative qty_check", () => {
    const result = validateReportRow({ ...baseReport, qty_check: -1 }, null);
    expect(result.issues).toContain("negative_values");
  });

  it("flags output mismatch", () => {
    const result = validateReportRow({ ...baseReport, total_ok: 80, total_ng: 10 }, null);
    expect(result.issues).toContain("output_mismatch");
  });

  it("flags ng without defect detail", () => {
    const result = validateReportRow({ ...baseReport, total_ng: 5 }, null);
    expect(result.issues).toContain("ng_without_detail");
  });

  it("does not flag ng_without_detail when defect detail exists", () => {
    const defect = {
      id: "d1",
      report_id: "1",
      created_at: "",
      bending: 0,
      black_dot: 0,
      bubble: 0,
      burn_mark: 0,
      burry: 0,
      crack: 0,
      deform: 0,
      dented: 0,
      dirty: 5,
      double_inject: 0,
      ejector_mark: 0,
      extra_defects: {} as Record<string, number>,
      filter_bolong_rusak: 0,
      flash: 0,
      flow_mark: 0,
      gap: 0,
      gas_mark: 0,
      gate_hole: 0,
      gate_long: 0,
      kontaminasi: 0,
      lipat: 0,
      over_cut: 0,
      scratch: 0,
      shinning: 0,
      short_shot: 0,
      silver: 0,
      sink_mark: 0,
      start_up_setting_alarm: 0,
      under_cut: 0,
      weld_line: 0,
    };
    const result = validateReportRow(baseReport, defect);
    expect(result.issues).not.toContain("ng_without_detail");
  });

  it("returns critical score for many issues", () => {
    const result = validateReportRow(
      { ...baseReport, part_name: "", qty_check: -1, total_ok: 80, total_ng: 10 },
      null,
    );
    expect(result.status).toBe("critical");
    expect(result.score).toBeLessThan(55);
  });
});

describe("applyManagementFilters", () => {
  it("filters by date range", () => {
    const result = applyManagementFilters([enrichedRow], {
      from: "2026-07-01",
      to: "2026-07-10",
    });
    expect(result).toHaveLength(0);
  });

  it("filters by meja", () => {
    const result = applyManagementFilters([enrichedRow], {
      from: "2026-07-01",
      to: "2026-07-31",
      meja: 2,
    });
    expect(result).toHaveLength(0);
  });

  it("filters by shift", () => {
    const result = applyManagementFilters([enrichedRow], {
      from: "2026-07-01",
      to: "2026-07-31",
      shift: "B",
    });
    expect(result).toHaveLength(0);
  });

  it("filters by min yield", () => {
    const result = applyManagementFilters([enrichedRow], {
      from: "2026-07-01",
      to: "2026-07-31",
      minYield: 0.99,
    });
    expect(result).toHaveLength(0);
  });

  it("filters only invalid", () => {
    const invalidRow = {
      ...enrichedRow,
      validation: { score: 50, status: "warning" as const, issues: ["output_mismatch" as const] },
    };
    const result = applyManagementFilters([enrichedRow, invalidRow], {
      from: "2026-01-01",
      to: "2026-12-31",
      onlyInvalid: true,
    });
    expect(result).toHaveLength(1);
  });
});

describe("aggregateBy", () => {
  it("groups by field", () => {
    const rows = [enrichedRow, { ...enrichedRow, id: "2", no_meja: 1 }];
    const result = aggregateBy(rows, "no_meja");
    expect(result).toHaveLength(1);
    expect(result[0].reports).toBe(2);
    expect(result[0].qty_check).toBe(200);
  });

  it("groups by custom function", () => {
    const rows = [enrichedRow, { ...enrichedRow, id: "2", shift: "B" as const }];
    const result = aggregateBy(rows, (row) => `${row.report_date}|${row.shift}`);
    expect(result).toHaveLength(2);
  });
});

describe("buildTrend", () => {
  it("returns sorted date trends", () => {
    const rows = [
      { ...enrichedRow, report_date: "2026-07-14" },
      { ...enrichedRow, id: "2", report_date: "2026-07-13" },
    ];
    const result = buildTrend(rows);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-07-13");
    expect(result[1].date).toBe("2026-07-14");
  });
});

describe("buildDefectPareto", () => {
  it("returns empty array when no data", () => {
    const result = buildDefectPareto([], new Map());
    expect(result).toHaveLength(0);
  });
});

describe("buildInsights", () => {
  it("returns suggestions for poor performance", () => {
    const poorRow = { ...enrichedRow, qty_check: 100, total_ok: 80, total_ng: 20 };
    const result = buildInsights([poorRow]);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns stability message for good performance", () => {
    const goodRow = { ...enrichedRow, qty_check: 100, total_ok: 99, total_ng: 1 };
    const result = buildInsights([goodRow]);
    expect(result.some((s) => s.includes("stabil") || s.includes("Pertahankan"))).toBe(true);
  });
});

describe("formatValidationIssue", () => {
  it("formats each issue type", () => {
    expect(formatValidationIssue("missing_core")).toBe("Data inti tidak lengkap");
    expect(formatValidationIssue("negative_values")).toBe("Nilai negatif terdeteksi");
    expect(formatValidationIssue("output_mismatch")).toBe("Qty Check tidak sama dengan OK + NG");
    expect(formatValidationIssue("ng_without_detail")).toBe("NG ada tetapi detail defect kosong");
  });
});
