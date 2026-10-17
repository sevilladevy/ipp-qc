import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachAuthHeader } from "@/integrations/supabase/auth-client-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeDateRange } from "@/lib/date-range";
import { REPORT_COLUMNS, fetchDefectDetailsByReportIds } from "@/lib/supabase-queries";
import type { Database } from "@/integrations/supabase/types";
import {
  aggregateBy,
  buildTrend,
  buildDefectPareto,
  buildProductNgTrend,
  enrichReports,
  buildProfileLookup,
} from "@/lib/management";

type GetReportsInput = {
  from: string;
  to: string;
  meja?: number;
  part?: string;
  shift?: string;
  inspectorId?: string;
};

export const getReports = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .validator((input: GetReportsInput) => {
    if (!input || !input.from || !input.to) {
      throw new Response("Date range required", { status: 400 });
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as { supabase: SupabaseClient<Database>; userId: string };
    if (!ctx.supabase || !ctx.userId) {
      throw new Response("Invalid auth context", { status: 500 });
    }

    const { from, to } = sanitizeDateRange(data.from, data.to);

    let query = ctx.supabase
      .from("inspection_reports")
      .select(REPORT_COLUMNS)
      .gte("report_date", from)
      .lte("report_date", to)
      .order("report_date", { ascending: true });

    if (data.meja) {
      query = query.eq("no_meja", data.meja);
    }
    if (data.shift) {
      query = query.eq("shift", data.shift);
    }
    if (data.inspectorId) {
      query = query.eq("created_by", data.inspectorId);
    }
    // Note: part filter is case-insensitive substring match, done client-side
    // due to Supabase ILIKE limitations with select()
    query = query.limit(1000);

    const { data: reports, error } = await query;
    if (error) throw new Response(error.message, { status: 500 });

    return { reports: reports ?? [] };
  });

export const getDashboardData = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .validator((input: GetReportsInput) => {
    if (!input || !input.from || !input.to) {
      throw new Response("Date range required", { status: 400 });
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as { supabase: SupabaseClient<Database>; userId: string };
    if (!ctx.supabase || !ctx.userId) {
      throw new Response("Invalid auth context", { status: 500 });
    }

    const { from, to } = sanitizeDateRange(data.from, data.to);

    const [reportsResult, profilesResult] = await Promise.all([
      ctx.supabase
        .from("inspection_reports")
        .select(REPORT_COLUMNS)
        .gte("report_date", from)
        .lte("report_date", to)
        .order("report_date", { ascending: true })
        .limit(1000),
      ctx.supabase.from("profiles").select("id,full_name,email"),
    ]);

    if (reportsResult.error) throw new Response(reportsResult.error.message, { status: 500 });
    if (profilesResult.error) throw new Response(profilesResult.error.message, { status: 500 });

    const reports = reportsResult.data ?? [];
    const profiles = profilesResult.data ?? [];
    const reportIds = reports.map((row) => row.id);
    const details = await fetchDefectDetailsByReportIds(ctx.supabase, reportIds);

    return { reports, details, profiles };
  });

export interface KpiMonthlyServerData {
  monthYear: string;
  from: string;
  to: string;
  totals: {
    qty_check: number;
    ok: number;
    ng: number;
    yieldAvg: number;
    ngRate: number;
    reportCount: number;
    activeMejas: number;
  };
  trend: { date: string; qty_check: number; ngRate: number; passRate: number; reports: number }[];
  defectPareto: { key: string; name: string; total: number; pct: number; cumPct: number }[];
  mejaRows: import("@/lib/management").AggregatedReportRow[];
  shiftRows: import("@/lib/management").AggregatedReportRow[];
  inspectorRows: (import("@/lib/management").AggregatedReportRow & {
    avg_qty_per_report: number;
  })[];
  partLossRows: import("@/lib/management").AggregatedReportRow[];
  scatterPoints: { qty_check: number; ng: number; meja: number }[];
  productTrend: {
    labels: string[];
    series: { name: string; values: number[] }[];
  };
}

export const getKpiMonthlyData = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .validator((input: GetReportsInput) => {
    if (!input || !input.from || !input.to) {
      throw new Response("Date range required", { status: 400 });
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as { supabase: SupabaseClient<Database>; userId: string };
    if (!ctx.supabase || !ctx.userId) {
      throw new Response("Invalid auth context", { status: 500 });
    }

    const { from, to } = sanitizeDateRange(data.from, data.to);

    const [reportsResult, profilesResult] = await Promise.all([
      ctx.supabase
        .from("inspection_reports")
        .select(REPORT_COLUMNS)
        .gte("report_date", from)
        .lte("report_date", to)
        .order("report_date", { ascending: true })
        .limit(1000),
      ctx.supabase.from("profiles").select("id,full_name,email"),
    ]);

    if (reportsResult.error) throw new Response(reportsResult.error.message, { status: 500 });
    if (profilesResult.error) throw new Response(profilesResult.error.message, { status: 500 });

    const reports = reportsResult.data ?? [];
    const profiles = profilesResult.data ?? [];
    const reportIds = reports.map((row) => row.id);
    const details = await fetchDefectDetailsByReportIds(ctx.supabase, reportIds);
    const detailsByReportId = new Map(details.map((d) => [d.report_id, d]));

    const profilesById = buildProfileLookup(profiles);
    const enriched = enrichReports({ reports, detailsByReportId, profilesById });

    // Apply optional filters
    const filtered = enriched.filter((row) => {
      if (data.meja && row.no_meja !== Number(data.meja)) return false;
      if (data.shift && row.shift !== data.shift) return false;
      if (data.inspectorId && row.created_by !== data.inspectorId) return false;
      if (data.part && !row.part_name.toLowerCase().includes(data.part.toLowerCase())) return false;
      return true;
    });

    const totals = {
      qty_check: filtered.reduce((s, r) => s + r.qty_check, 0),
      ok: filtered.reduce((s, r) => s + (r.total_ok ?? 0), 0),
      ng: filtered.reduce((s, r) => s + r.total_ng, 0),
      yieldAvg:
        filtered.reduce((s, r) => s + r.qty_check, 0) > 0
          ? filtered.reduce((s, r) => s + (r.total_ok ?? 0), 0) /
            filtered.reduce((s, r) => s + r.qty_check, 0)
          : 0,
      ngRate:
        filtered.reduce((s, r) => s + r.qty_check, 0) > 0
          ? filtered.reduce((s, r) => s + r.total_ng, 0) /
            filtered.reduce((s, r) => s + r.qty_check, 0)
          : 0,
      reportCount: filtered.length,
      activeMejas: new Set(filtered.map((r) => r.no_meja)).size,
    };

    const trend = buildTrend(filtered);
    const defectPareto = buildDefectPareto(filtered, detailsByReportId);
    const mejaRows = aggregateBy(filtered, "no_meja");
    const shiftRows = aggregateBy(filtered, "shift");
    // Mirror dashboard client aggregations (index.tsx) so PPTX covers all visuals
    const inspectorRows = aggregateBy(filtered, "inspector_name")
      .filter((row) => row.key !== "Unknown")
      .map((row) => ({
        ...row,
        avg_qty_per_report: row.reports > 0 ? row.qty_check / row.reports : 0,
      }))
      .sort((a, b) => b.ngRate - a.ngRate);
    const partLossRows = aggregateBy(filtered, "part_name").sort(
      (a, b) => b.ngRate - a.ngRate,
    );
    const scatterPoints = filtered.map((row) => ({
      qty_check: row.qty_check,
      ng: row.total_ng,
      meja: row.no_meja,
    }));
    const productTrendRaw = buildProductNgTrend(filtered, 6);
    const productLabels = (productTrendRaw.chartData as { date: string }[]).map((d) =>
      formatDateShort(d.date),
    );
    const productTrend = {
      labels: productLabels,
      series: productTrendRaw.series.map((s) => ({
        name: String(s.key).length > 20 ? String(s.key).substring(0, 20) + "…" : String(s.key),
        values: (productTrendRaw.chartData as Record<string, unknown>[]).map((d) =>
          Number(d[s.key] ?? 0),
        ),
      })),
    };

    // monthYear label
    const parsedFrom = new Date(from);
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const monthYear = `${monthNames[parsedFrom.getMonth()]} ${parsedFrom.getFullYear()}`;

    return {
      monthYear,
      from,
      to,
      totals,
      trend,
      defectPareto,
      mejaRows,
      shiftRows,
      inspectorRows,
      partLossRows,
      scatterPoints,
      productTrend,
    } satisfies KpiMonthlyServerData;
  });

// Short "dd MMM" label in Indonesian month abbreviations (matches client chart labels)
function formatDateShort(isoDate: string): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const day = parts[2].padStart(2, "0");
  const month = months[Number(parts[1]) - 1] ?? parts[1];
  return `${day} ${month}`;
}
