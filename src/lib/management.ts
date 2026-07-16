import type { Tables } from "@/integrations/supabase/types";
import { DEFECT_COLUMNS } from "@/lib/format";

// Json type from Supabase
type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

// Report row type matching actual query columns (REPORT_COLUMNS)
export type ReportRow = {
  id: string;
  report_date: string;
  shift: "A" | "B" | "C";
  no_meja: number;
  part_no: string;
  part_name: string;
  qty_check: number;
  total_ok: number | null;
  total_ng: number;
  created_by: string | null;
  created_at: string;
};

export type DefectRow = {
  id: string;
  report_id: string;
  short_shot: number;
  lipat: number;
  burry: number;
  bending: number;
  dirty: number;
  kontaminasi: number;
  filter_bolong_rusak: number;
  shinning: number;
  silver: number;
  flow_mark: number;
  burn_mark: number;
  sink_mark: number;
  ejector_mark: number;
  gas_mark: number;
  crack: number;
  gap: number;
  dented: number;
  scratch: number;
  flash: number;
  double_inject: number;
  bubble: number;
  gate_long: number;
  gate_hole: number;
  over_cut: number;
  under_cut: number;
  black_dot: number;
  deform: number;
  weld_line: number;
  start_up_setting_alarm: number;
  extra_defects: Json;
  created_at: string;
};

export type ProfileRow = Tables<"profiles">;

export type ManagementFilters = {
  from: string;
  to: string;
  meja?: number | "";
  part?: string;
  shift?: string;
  inspectorId?: string;
  minYield?: number;
  onlyInvalid?: boolean;
};

export type ValidationIssue =
  | "missing_core"
  | "negative_values"
  | "output_mismatch"
  | "ng_without_detail";

export type ValidationResult = {
  score: number;
  status: "good" | "warning" | "critical";
  issues: ValidationIssue[];
};

export type EnrichedReport = ReportRow & {
  inspector_name: string;
  inspector_email: string;
  validation: ValidationResult;
};

export function buildProfileLookup(
  profiles: Pick<ProfileRow, "id" | "full_name" | "email">[] | null | undefined,
) {
  const map = new Map<string, { full_name: string | null; email: string | null }>();
  for (const profile of profiles ?? []) {
    map.set(profile.id, { full_name: profile.full_name, email: profile.email });
  }
  return map;
}

export function validateReportRow(report: ReportRow, defect?: DefectRow | null): ValidationResult {
  const issues: ValidationIssue[] = [];
  const hasCore =
    !!report.report_date &&
    !!report.shift &&
    !!report.part_name &&
    !!report.part_no &&
    report.no_meja > 0;
  if (!hasCore) issues.push("missing_core");

  if (report.qty_check < 0 || (report.total_ok ?? 0) < 0 || report.total_ng < 0) {
    issues.push("negative_values");
  }

  if (report.qty_check !== (report.total_ok ?? 0) + report.total_ng) {
    issues.push("output_mismatch");
  }

  if (report.total_ng > 0 && !defect) {
    issues.push("ng_without_detail");
  }

  const score = Math.max(0, 100 - issues.length * 22);
  const status = score >= 80 ? "good" : score >= 55 ? "warning" : "critical";
  return { score, status, issues };
}

export function applyManagementFilters(rows: EnrichedReport[], filters: ManagementFilters) {
  return rows.filter((row) => {
    if (row.report_date < filters.from || row.report_date > filters.to) return false;
    if (filters.meja && row.no_meja !== Number(filters.meja)) return false;
    if (filters.part && !row.part_name.toLowerCase().includes(filters.part.toLowerCase()))
      return false;
    if (filters.shift && row.shift !== filters.shift) return false;
    if (filters.inspectorId && row.created_by !== filters.inspectorId) return false;
    if (typeof filters.minYield === "number" && row.qty_check > 0) {
      const yieldVal = (row.total_ok ?? 0) / row.qty_check;
      if (yieldVal < filters.minYield) return false;
    }
    if (filters.onlyInvalid && row.validation.issues.length === 0) return false;
    return true;
  });
}

export function enrichReports(params: {
  reports: ReportRow[];
  detailsByReportId: Map<string, DefectRow>;
  profilesById: Map<string, { full_name: string | null; email: string | null }>;
}) {
  const { reports, detailsByReportId, profilesById } = params;
  return reports.map((report) => {
    const profile = report.created_by ? profilesById.get(report.created_by) : undefined;
    const detail = detailsByReportId.get(report.id);
    const validation = validateReportRow(report, detail);
    return {
      ...report,
      inspector_name: profile?.full_name || "Unknown",
      inspector_email: profile?.email || "-",
      validation,
    } satisfies EnrichedReport;
  });
}

export type AggregatedReportRow = {
  key: string;
  qty_check: number;
  ok: number;
  ng: number;
  reports: number;
  qualityScore: number;
  passRate: number;
  ngRate: number;
};

export function aggregateBy(
  rows: EnrichedReport[],
  key: keyof EnrichedReport | ((row: EnrichedReport) => string | number | null | undefined),
): AggregatedReportRow[] {
  const map = new Map<
    string,
    {
      key: string;
      qty_check: number;
      ok: number;
      ng: number;
      reports: number;
      qualityScore: number;
    }
  >();
  for (const row of rows) {
    const k = String(typeof key === "function" ? key(row) : row[key]);
    if (!map.has(k)) {
      map.set(k, { key: k, qty_check: 0, ok: 0, ng: 0, reports: 0, qualityScore: 0 });
    }
    const target = map.get(k)!;
    target.qty_check += row.qty_check;
    target.ok += row.total_ok ?? 0;
    target.ng += row.total_ng;
    target.reports += 1;
    target.qualityScore += row.validation.score;
  }
  return [...map.values()].map((group) => ({
    ...group,
    passRate: group.qty_check > 0 ? group.ok / group.qty_check : 0,
    ngRate: group.qty_check > 0 ? group.ng / group.qty_check : 0,
    qualityScore: group.reports > 0 ? group.qualityScore / group.reports : 0,
  }));
}

export function buildTrend(rows: EnrichedReport[]) {
  const grouped = aggregateBy(rows, (row) => row.report_date);
  return grouped
    .map((row) => ({
      date: row.key,
      qty_check: row.qty_check,
      ng: row.ng,
      ngRate: Number((row.ngRate * 100).toFixed(2)),
      passRate: Number((row.passRate * 100).toFixed(2)),
      reports: row.reports,
      qualityScore: Number(row.qualityScore.toFixed(1)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildDefectPareto(
  rows: EnrichedReport[],
  detailsByReportId: Map<string, DefectRow>,
) {
  const totals = DEFECT_COLUMNS.map((column) => ({
    key: column.key,
    name: column.label,
    total: rows.reduce((sum, row) => {
      const detail = detailsByReportId.get(row.id);
      return sum + Number(detail?.[column.key] ?? 0);
    }, 0),
  }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotal = totals.reduce((sum, row) => sum + row.total, 0);
  let cumulative = 0;

  return totals.map((row) => {
    cumulative += row.total;
    return {
      ...row,
      pct: grandTotal ? (row.total / grandTotal) * 100 : 0,
      cumPct: grandTotal ? (cumulative / grandTotal) * 100 : 0,
    };
  });
}

export function buildInsights(rows: EnrichedReport[]) {
  if (!rows.length) return [];
  const totalQty = rows.reduce((sum, row) => sum + row.qty_check, 0);
  const totalNg = rows.reduce((sum, row) => sum + row.total_ng, 0);
  const avgPassRate = totalQty > 0 ? (totalQty - totalNg) / totalQty : 0;
  const invalidRows = rows.filter((row) => row.validation.issues.length > 0).length;
  const invalidRate = rows.length > 0 ? invalidRows / rows.length : 0;
  const topMeja = aggregateBy(rows, "no_meja")
    .sort((a, b) => b.ng - a.ng)
    .at(0);
  const suggestions: string[] = [];
  if (avgPassRate < 0.95) {
    suggestions.push(
      "Pass rate rata-rata di bawah 95%. Prioritaskan audit proses inspeksi untuk meja dengan NG tertinggi.",
    );
  }
  if (invalidRate > 0.2) {
    suggestions.push(
      "Lebih dari 20% data tidak valid. Terapkan checklist validasi sebelum submit untuk inspector.",
    );
  }
  if (topMeja && topMeja.ngRate > 0.06) {
    suggestions.push(
      `Meja ${topMeja.key} memiliki NG rate tinggi (${(topMeja.ngRate * 100).toFixed(2)}%). Rekomendasi: evaluasi metode inspeksi dan training inspector.`,
    );
  }
  if (!suggestions.length) {
    suggestions.push("Kinerja stabil. Pertahankan standar inspeksi dan monitoring per-shift.");
  }
  return suggestions;
}

export function formatValidationIssue(issue: ValidationIssue) {
  switch (issue) {
    case "missing_core":
      return "Data inti tidak lengkap";
    case "negative_values":
      return "Nilai negatif terdeteksi";
    case "output_mismatch":
      return "Qty Check tidak sama dengan OK + NG";
    case "ng_without_detail":
      return "NG ada tetapi detail defect kosong";
  }
}

export function buildProductNgTrend(rows: EnrichedReport[], topN = 6) {
  if (!rows.length) return { chartData: [], series: [], categories: [] };

  const productTotals = aggregateBy(rows, "part_name")
    .sort((a, b) => b.ng - a.ng)
    .slice(0, topN);

  const topProductSet = new Set(productTotals.map((p) => p.key));

  const dateProductMap = new Map<string, Map<string, { qty: number; ng: number }>>();

  for (const row of rows) {
    if (!topProductSet.has(row.part_name)) continue;
    if (!dateProductMap.has(row.report_date)) {
      dateProductMap.set(row.report_date, new Map());
    }
    const productMap = dateProductMap.get(row.report_date)!;
    if (!productMap.has(row.part_name)) {
      productMap.set(row.part_name, { qty: 0, ng: 0 });
    }
    const acc = productMap.get(row.part_name)!;
    acc.qty += row.qty_check;
    acc.ng += row.total_ng;
  }

  const dates = [...dateProductMap.keys()].sort();

  const chartData = dates.map((date) => {
    const productMap = dateProductMap.get(date)!;
    const entry: Record<string, unknown> = { date };
    for (const product of productTotals) {
      const stats = productMap.get(product.key);
      entry[product.key] =
        stats && stats.qty > 0 ? Number(((stats.ng / stats.qty) * 100).toFixed(2)) : 0;
    }
    return entry;
  });

  const colors = [
    "var(--color-chart-1)",
    "var(--color-chart-2)",
    "var(--color-chart-3)",
    "var(--color-chart-4)",
    "var(--color-chart-5)",
    "#8b5cf6",
  ];

  const series = productTotals.map((p, i) => ({
    key: p.key,
    color: colors[i % colors.length],
  }));

  const categories = productTotals.map((p) => ({
    key: p.key,
    label: p.key,
  }));

  return { chartData, series, categories };
}
