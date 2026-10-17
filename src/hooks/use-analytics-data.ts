import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { sanitizeDateRange } from "@/lib/date-range";
import { supabase } from "@/integrations/supabase/client";
import { fetchDefectDetailsByReportIds, REPORT_COLUMNS } from "@/lib/supabase-queries";
import {
  aggregateBy,
  applyManagementFilters,
  buildDefectPareto,
  buildInsights,
  buildProfileLookup,
  buildTrend,
  enrichReports,
  type EnrichedReport,
} from "@/lib/management";
import { buildPartPareto } from "@/components/analytics/AnalyticsHelpers";

export type { EnrichedReport as AnalyticRow };

export interface ExecutiveSummary {
  qty_check: number;
  ok: number;
  ng: number;
  reportCount: number;
  passRate: number;
  ngRate: number;
}

export interface TrendRow {
  date: string;
  ng: number;
  passRate: number;
  ngRate: number;
  qty_check: number;
}

export interface DefectParetoRow {
  name: string;
  total: number;
  cumPct: number;
}

export interface NgParetoByProductRow {
  key: string;
  baseValue: number;
  ngRate: number;
  passRate: number;
  cumPct: number;
  passRatePct: number;
}

export interface HeatmapCell {
  date: string;
  meja: number;
  ngRate: number;
}

export interface SankeyData {
  nodes: { name: string }[];
  links: { source: number; target: number; value: number }[];
}

export interface DeepDiveRow {
  meja: number;
  shift: string;
  part: string;
  defect: number;
  qty_check: number;
  reports: number;
  defectRate: number;
}

export interface Insight {
  label: string;
  value: number;
}

export function useAnalyticsData(from: string, to: string) {
  const safeDateRange = useMemo(() => sanitizeDateRange(from, to), [from, to]);

  const query = useQuery({
    queryKey: ["analytics-management", safeDateRange.from, safeDateRange.to],
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [{ data: reports, error: reportError }, { data: profiles, error: profileError }] =
        await Promise.all([
          supabase
            .from("inspection_reports")
            .select(REPORT_COLUMNS)
            .gte("report_date", safeDateRange.from)
            .lte("report_date", safeDateRange.to)
            .order("report_date", { ascending: true })
            .limit(1000),
          supabase.from("profiles").select("id,full_name,email"),
        ]);
      if (reportError) throw reportError;
      if (profileError) throw profileError;

      const ids = (reports ?? []).map((row) => row.id);
      const details = await fetchDefectDetailsByReportIds(supabase, ids);
      return { reports: reports ?? [], profiles: profiles ?? [], details };
    },
    staleTime: 60_000,
  });

  const detailsById = useMemo(
    () => new Map((query.data?.details ?? []).map((row) => [row.report_id, row])),
    [query.data?.details],
  );
  const allRows = useMemo(
    () =>
      enrichReports({
        reports: query.data?.reports ?? [],
        detailsByReportId: detailsById,
        profilesById: buildProfileLookup(query.data?.profiles),
      }),
    [detailsById, query.data?.profiles, query.data?.reports],
  );
  const filteredRows = useMemo(
    () => applyManagementFilters(allRows, { ...safeDateRange }),
    [allRows, safeDateRange],
  );
  const trendRows = useMemo(() => buildTrend(filteredRows), [filteredRows]);

  const defectPareto = useMemo(
    () => buildDefectPareto(filteredRows, detailsById),
    [detailsById, filteredRows],
  );

  const executiveSummary = useMemo(() => {
    const qty_check = filteredRows.reduce((sum, row) => sum + row.qty_check, 0);
    const ok = filteredRows.reduce((sum, row) => sum + (row.total_ok ?? 0), 0);
    const ng = filteredRows.reduce((sum, row) => sum + row.total_ng, 0);
    const reportCount = filteredRows.length;
    const passRate = qty_check > 0 ? ok / qty_check : 0;
    const ngRate = qty_check > 0 ? ng / qty_check : 0;
    return { qty_check, ok, ng, reportCount, passRate, ngRate };
  }, [filteredRows]);

  const comparisonRows = useMemo(() => {
    const byShift = aggregateBy(filteredRows, "shift");
    const byMeja = aggregateBy(filteredRows, "no_meja");
    return { byShift, byMeja };
  }, [filteredRows]);
  const mejaNgYieldRows = useMemo(
    () => aggregateBy(filteredRows, "no_meja").sort((a, b) => b.ngRate - a.ngRate),
    [filteredRows],
  );
  const partNgYieldRows = useMemo(
    () => aggregateBy(filteredRows, "part_name").sort((a, b) => b.ngRate - a.ngRate),
    [filteredRows],
  );
  const ngParetoByProductRows = useMemo(() => buildPartPareto(filteredRows), [filteredRows]);

  const deepDiveRows = useMemo(() => {
    const map = new Map<
      string,
      {
        meja: number;
        shift: string;
        part: string;
        defect: number;
        qty_check: number;
        reports: number;
      }
    >();
    for (const row of filteredRows) {
      const detail = detailsById.get(row.id);
      const defectValue = Number(
        (detail as Record<string, number | null | undefined> | undefined)?.defect ?? 0,
      );
      if (!defectValue) continue;
      const key = `${row.no_meja}|${row.shift}|${row.part_name}`;
      if (!map.has(key)) {
        map.set(key, {
          meja: row.no_meja,
          shift: row.shift,
          part: row.part_name,
          defect: 0,
          qty_check: 0,
          reports: 0,
        });
      }
      const target = map.get(key)!;
      target.defect += defectValue;
      target.qty_check += row.qty_check;
      target.reports += 1;
    }
    return [...map.values()]
      .map((row) => ({ ...row, defectRate: row.qty_check > 0 ? row.defect / row.qty_check : 0 }))
      .sort((a, b) => b.defect - a.defect)
      .slice(0, 12);
  }, [detailsById, filteredRows]);

  const sankeyData = useMemo(() => {
    const shiftTotals = aggregateBy(filteredRows, "shift");
    const topMejas = aggregateBy(filteredRows, "no_meja")
      .sort((a, b) => b.ng - a.ng)
      .slice(0, 4);
    const nodes = [
      ...shiftTotals.map((row) => ({ name: `Shift ${row.key}` })),
      ...topMejas.map((row) => ({ name: `Meja Inspeksi ${row.key}` })),
      { name: "NG" },
    ];
    const shiftOffset = 0;
    const mejaOffset = shiftTotals.length;
    const ngIndex = shiftTotals.length + topMejas.length;
    const mejaByShift = new Map<string, number>();
    for (const row of filteredRows) {
      const mejaIdx = topMejas.findIndex((item) => Number(item.key) === row.no_meja);
      if (mejaIdx < 0) continue;
      const shiftIdx = shiftTotals.findIndex((item) => item.key === row.shift);
      if (shiftIdx < 0) continue;
      const key = `${shiftIdx}-${mejaIdx}`;
      mejaByShift.set(key, (mejaByShift.get(key) ?? 0) + row.total_ng);
    }
    const links = [...mejaByShift.entries()].map(([key, value]) => {
      const [shiftIdx, mejaIdx] = key.split("-").map(Number);
      return {
        source: shiftOffset + shiftIdx,
        target: mejaOffset + mejaIdx,
        value,
      };
    });
    for (const [idx, row] of topMejas.entries()) {
      links.push({
        source: mejaOffset + idx,
        target: ngIndex,
        value: row.ng,
      });
    }
    return { nodes, links };
  }, [filteredRows]);

  const heatmap = useMemo(() => {
    const byDateMeja = new Map<string, { date: string; meja: number; ngRate: number }>();
    const grouped = aggregateBy(filteredRows, (row) => `${row.report_date}|${row.no_meja}`);
    for (const row of grouped) {
      const [date, meja] = row.key.split("|");
      byDateMeja.set(row.key, { date, meja: Number(meja), ngRate: row.ngRate });
    }
    return [...byDateMeja.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRows]);

  const insights = useMemo(() => buildInsights(filteredRows), [filteredRows]);

  const mejaOptions = useMemo(
    () => [...new Set(allRows.map((row) => row.no_meja))].sort((a, b) => a - b),
    [allRows],
  );
  const partOptions = useMemo(
    () =>
      [...new Set(allRows.map((row) => row.part_name))].sort((a, b) => a.localeCompare(b, "id")),
    [allRows],
  );
  const inspectorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of allRows) {
      if (!row.created_by) continue;
      map.set(row.created_by, row.inspector_name || row.inspector_email || row.created_by);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [allRows]);

  return {
    query,
    detailsById,
    allRows,
    filteredRows,
    trendRows,
    defectPareto,
    executiveSummary,
    comparisonRows,
    mejaNgYieldRows,
    partNgYieldRows,
    ngParetoByProductRows,
    deepDiveRows,
    sankeyData,
    heatmap,
    insights,
    mejaOptions,
    partOptions,
    inspectorOptions,
    safeDateRange,
  };
}
