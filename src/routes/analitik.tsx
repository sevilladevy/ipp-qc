import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Sankey,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertOctagon, Package2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getPeriodRange, PeriodFilter, type PeriodMode } from "@/components/PeriodFilter";
import { StableChartContainer } from "@/components/StableChartContainer";
import { Badge, Card, EmptyState, KpiCard, PageHeader } from "@/components/ui-kit";
import { SkeletonChart, SkeletonKpiGrid } from "@/components/ui-skeletons";
import { sanitizeDateRange } from "@/lib/date-range";
import { logFilterLoadDuration } from "@/lib/dev-observability";
import { fmtNum, fmtPct, DEFECT_COLUMNS, type DefectColumnKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchDefectDetailsByReportIds, REPORT_COLUMNS } from "@/lib/supabase-queries";
import { buildPartPareto, buildYieldBox } from "@/components/analytics/AnalyticsHelpers";
import {
  aggregateBy,
  applyManagementFilters,
  buildDefectPareto,
  buildInsights,
  buildProfileLookup,
  buildTrend,
  enrichReports,
  type ManagementFilters,
} from "@/lib/management";

export const Route = createFileRoute("/analitik")({
  component: () => (
    <AppLayout>
      <Analitik />
    </AppLayout>
  ),
});

type Tab = "overview" | "metrics" | "deep-dive";

const CHART_INITIAL_DIMENSION = { width: 1, height: 280 };

function Analitik() {
  const now = new Date();
  const initialRange = getPeriodRange("monthly", now);
  const [tab, setTab] = useState<Tab>("overview");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("monthly");
  const [filters, setFilters] = useState<ManagementFilters>({
    from: initialRange.from,
    to: initialRange.to,
    meja: "",
    part: "",
    shift: "",
    inspectorId: "",
  });
  const [selectedDefect, setSelectedDefect] = useState(DEFECT_COLUMNS[0].key);
  const safeDateRange = useMemo(
    () => sanitizeDateRange(filters.from, filters.to),
    [filters.from, filters.to],
  );
  const filterSignature = `${tab}|${periodMode}|${safeDateRange.from}|${safeDateRange.to}|${filters.meja}|${filters.part}|${filters.shift}|${filters.inspectorId}`;
  const loadMeasureRef = useRef<{ signature: string; startedAt: number } | null>(null);
  const isFetchingRef = useRef(false);

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
      const details = await fetchDefectDetailsByReportIds(ids);
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
    () => applyManagementFilters(allRows, { ...filters, ...safeDateRange }),
    [allRows, filters, safeDateRange],
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
        (detail as Record<string, number | null | undefined> | undefined)?.[selectedDefect] ?? 0,
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
  }, [detailsById, filteredRows, selectedDefect]);

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

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const wasFetching = isFetchingRef.current;
    const isFetching = query.isFetching;

    if (
      isFetching &&
      (!loadMeasureRef.current || loadMeasureRef.current.signature !== filterSignature)
    ) {
      loadMeasureRef.current = {
        signature: filterSignature,
        startedAt: performance.now(),
      };
    }

    if (wasFetching && !isFetching && loadMeasureRef.current) {
      if (loadMeasureRef.current.signature === filterSignature) {
        logFilterLoadDuration(
          "analytics",
          filterSignature,
          performance.now() - loadMeasureRef.current.startedAt,
          filteredRows.length,
        );
      }
      loadMeasureRef.current = null;
    }

    isFetchingRef.current = isFetching;
  }, [filterSignature, filteredRows.length, query.isFetching]);

  if (query.isError) {
    return (
      <div className="analytics-page">
        <PageHeader
          title="Analytics Management View"
          description={`Trend, comparison, defect deep-dive, metrics, quality (${safeDateRange.from} s/d ${safeDateRange.to})`}
        />
        <Card>
          <EmptyState
            title="Gagal memuat data analytics"
            description={
              query.error instanceof Error
                ? query.error.message
                : "Terjadi kesalahan saat mengambil data."
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <PageHeader
        title="Analytics Management View"
        description={`Trend, comparison, defect deep-dive, metrics, quality (${safeDateRange.from} s/d ${safeDateRange.to})`}
      />

      <Card className="mb-4">
        <div className="grid gap-3">
          <PeriodFilter
            from={filters.from}
            to={filters.to}
            mode={periodMode}
            inputClassName="ipt3"
            testIdPrefix="analytics-period"
            onChange={(next) => {
              setPeriodMode(next.mode);
              setFilters((prev) => ({ ...prev, from: next.from, to: next.to }));
            }}
          />
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <select
              className="ipt3"
              aria-label="Filter meja"
              value={filters.meja}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  meja: event.target.value ? Number(event.target.value) : "",
                }))
              }
            >
              <option value="">Semua meja</option>
              {mejaOptions.map((meja) => (
                <option key={meja} value={meja}>
                  Meja Inspeksi {meja}
                </option>
              ))}
            </select>
            <select
              className="ipt3"
              aria-label="Filter shift"
              value={filters.shift}
              onChange={(event) => setFilters((prev) => ({ ...prev, shift: event.target.value }))}
            >
              <option value="">Semua shift</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
            <select
              className="ipt3"
              aria-label="Filter inspector"
              value={filters.inspectorId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, inspectorId: event.target.value }))
              }
            >
              <option value="">Semua inspector</option>
              {inspectorOptions.map((inspector) => (
                <option key={inspector.id} value={inspector.id}>
                  {inspector.name}
                </option>
              ))}
            </select>
            <input
              className="ipt3"
              placeholder="Filter part"
              aria-label="Filter part"
              value={filters.part}
              list="analytics-part-options"
              onChange={(event) => setFilters((prev) => ({ ...prev, part: event.target.value }))}
            />
            <datalist id="analytics-part-options">
              {partOptions.map((part) => (
                <option key={part} value={part} />
              ))}
            </datalist>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          label="Qty Check"
          value={fmtNum(executiveSummary.qty_check)}
          sub={`Reports ${fmtNum(executiveSummary.reportCount)}`}
          accent="primary"
          icon={<Package2 className="h-5 w-5" />}
          dataTestId="analytics-kpi-output"
        />
        <KpiCard
          label="Yield"
          value={fmtPct(executiveSummary.passRate)}
          sub={`OK ${fmtNum(executiveSummary.ok)}`}
          accent={
            executiveSummary.passRate >= 0.98
              ? "success"
              : executiveSummary.passRate >= 0.95
                ? "warning"
                : "destructive"
          }
          icon={<Activity className="h-5 w-5" />}
        />
        <KpiCard
          label="NG Rate"
          value={fmtPct(executiveSummary.ngRate)}
          sub={`NG ${fmtNum(executiveSummary.ng)}`}
          accent="destructive"
          icon={<AlertOctagon className="h-5 w-5" />}
        />
      </div>

      <div
        className="mb-4 flex flex-wrap gap-1 border-b border-border"
        role="tablist"
        aria-label="Tampilan analitik"
      >
        {(
          [
            ["overview", "Executive Summary"],
            ["metrics", "Machine / Part / Shift"],
            ["deep-dive", "Defect & Insights"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            data-testid={`analytics-tab-${key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="space-y-4">
          <SkeletonKpiGrid count={3} />
          <div className="grid gap-4 lg:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      ) : !filteredRows.length ? (
        <EmptyState title="Tidak ada data analytics pada filter ini" />
      ) : (
        <>
          {tab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="text-sm font-semibold">Pareto Defect</h3>
                <StableChartContainer>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={280}
                    initialDimension={CHART_INITIAL_DIMENSION}
                    debounce={50}
                  >
                    <ComposedChart data={defectPareto}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9 }}
                        angle={-25}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="total" fill="var(--color-accent)" />
                      <Line yAxisId="right" dataKey="cumPct" stroke="var(--color-primary)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </StableChartContainer>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Trend Pass Rate, NG & NG Rate</h3>
                <StableChartContainer>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={280}
                    initialDimension={CHART_INITIAL_DIMENSION}
                    debounce={50}
                  >
                    <ComposedChart data={trendRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="ng" fill="var(--color-destructive)" />
                      <Line
                        yAxisId="right"
                        dataKey="passRate"
                        stroke="var(--color-primary)"
                        strokeWidth={2}
                        name="Pass Rate %"
                      />
                      <Line
                        yAxisId="right"
                        dataKey="ngRate"
                        stroke="var(--color-destructive)"
                        strokeWidth={2}
                        name="NG Rate %"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </StableChartContainer>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Area Chart Qty Check</h3>
                <StableChartContainer>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={280}
                    initialDimension={CHART_INITIAL_DIMENSION}
                    debounce={50}
                  >
                    <AreaChart data={trendRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="qty_check"
                        stroke="var(--color-chart-2)"
                        fill="var(--color-chart-2)"
                        fillOpacity={0.25}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </StableChartContainer>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Scatter NG vs Qty Check</h3>
                <StableChartContainer>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={280}
                    initialDimension={CHART_INITIAL_DIMENSION}
                    debounce={50}
                  >
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="qty_check" name="Qty Check" />
                      <YAxis dataKey="total_ng" name="NG" />
                      <Tooltip />
                      <Scatter data={filteredRows}>
                        {filteredRows.map((row) => (
                          <Cell
                            key={row.id}
                            fill={
                              row.total_ng <= 3
                                ? "var(--color-success)"
                                : row.total_ng <= 10
                                  ? "var(--color-warning)"
                                  : "var(--color-destructive)"
                            }
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </StableChartContainer>
              </Card>
            </div>
          )}

          {tab === "metrics" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="lg:col-span-2">
                <h3 className="text-sm font-semibold">Monitoring NG Rate & Pass Rate per Meja</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="table-pro cardify w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left">Meja</th>
                        <th className="px-3 py-2 text-right">Qty Check</th>
                        <th className="px-3 py-2 text-right">NG</th>
                        <th className="px-3 py-2 text-right">NG Rate</th>
                        <th className="px-3 py-2 text-right">Pass Rate</th>
                        <th className="px-3 py-2 text-right">Reports</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mejaNgYieldRows.slice(0, 12).map((row) => (
                        <tr key={`monitor-meja-${row.key}`}>
                          <td data-label="Meja" className="px-3 py-2 font-medium">
                            Meja Inspeksi {row.key}
                          </td>
                          <td data-label="Qty Check" className="px-3 py-2 text-right">
                            {fmtNum(row.qty_check)}
                          </td>
                          <td data-label="NG" className="px-3 py-2 text-right text-destructive">
                            {fmtNum(row.ng)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Badge
                              variant={
                                row.ngRate < 0.02
                                  ? "success"
                                  : row.ngRate < 0.05
                                    ? "warning"
                                    : "destructive"
                              }
                            >
                              {fmtPct(row.ngRate)}
                            </Badge>
                          </td>
                          <td data-label="Pass Rate" className="px-3 py-2 text-right">
                            {fmtPct(row.passRate)}
                          </td>
                          <td data-label="Reports" className="px-3 py-2 text-right">
                            {fmtNum(row.reports)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Comparison by Shift</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="table-pro cardify w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left">Shift</th>
                        <th className="px-3 py-2 text-right">Qty Check</th>
                        <th className="px-3 py-2 text-right">NG</th>
                        <th className="px-3 py-2 text-right">Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.byShift.map((row) => (
                        <tr key={row.key}>
                          <td data-label="Shift" className="px-3 py-2">
                            {row.key}
                          </td>
                          <td data-label="Qty Check" className="px-3 py-2 text-right">
                            {fmtNum(row.qty_check)}
                          </td>
                          <td data-label="NG" className="px-3 py-2 text-right text-destructive">
                            {fmtNum(row.ng)}
                          </td>
                          <td data-label="Pass Rate" className="px-3 py-2 text-right">
                            {fmtPct(row.passRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Top Machine Metrics</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="table-pro cardify w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left">Meja</th>
                        <th className="px-3 py-2 text-right">Qty Check</th>
                        <th className="px-3 py-2 text-right">NG</th>
                        <th className="px-3 py-2 text-right">Pass Rate</th>
                        <th className="px-3 py-2 text-right">NG Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.byMeja.slice(0, 10).map((row) => (
                        <tr key={row.key}>
                          <td data-label="Meja" className="px-3 py-2">
                            Meja Inspeksi {row.key}
                          </td>
                          <td data-label="Qty Check" className="px-3 py-2 text-right">
                            {fmtNum(row.qty_check)}
                          </td>
                          <td data-label="NG" className="px-3 py-2 text-right text-destructive">
                            {fmtNum(row.ng)}
                          </td>
                          <td data-label="Pass Rate" className="px-3 py-2 text-right">
                            {fmtPct(row.passRate)}
                          </td>
                          <td data-label="NG Rate" className="px-3 py-2 text-right">
                            {fmtPct(row.ngRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Part Risk Ranking</h3>
                <div className="mt-3 overflow-x-auto">
                  <table className="table-pro cardify w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left">Part</th>
                        <th className="px-3 py-2 text-right">Reports</th>
                        <th className="px-3 py-2 text-right">Qty Check</th>
                        <th className="px-3 py-2 text-right">NG Rate</th>
                        <th className="px-3 py-2 text-right">Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partNgYieldRows.slice(0, 10).map((row) => (
                        <tr key={`part-risk-${row.key}`}>
                          <td data-label="Part" className="px-3 py-2 font-medium">
                            {row.key}
                          </td>
                          <td data-label="Reports" className="px-3 py-2 text-right">
                            {fmtNum(row.reports)}
                          </td>
                          <td data-label="Qty Check" className="px-3 py-2 text-right">
                            {fmtNum(row.qty_check)}
                          </td>
                          <td
                            data-label="NG Rate"
                            className="px-3 py-2 text-right text-destructive"
                          >
                            {fmtPct(row.ngRate)}
                          </td>
                          <td data-label="Pass Rate" className="px-3 py-2 text-right">
                            {fmtPct(row.passRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">NG Pareto By Produk</h3>
                {!ngParetoByProductRows.length ? (
                  <EmptyState title="Data Pareto produk belum tersedia" />
                ) : (
                  <>
                    <StableChartContainer>
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minWidth={0}
                        minHeight={280}
                        initialDimension={CHART_INITIAL_DIMENSION}
                        debounce={50}
                      >
                        <ComposedChart data={ngParetoByProductRows}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                          <XAxis
                            dataKey="key"
                            tick={{ fontSize: 9 }}
                            angle={-25}
                            textAnchor="end"
                            height={72}
                          />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === "NG") return [fmtNum(Number(value)), "NG"];
                              return [`${Number(value).toFixed(2)}%`, String(name)];
                            }}
                            labelFormatter={(label) => `Part ${label}`}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="baseValue"
                            name="NG"
                            fill="var(--color-destructive)"
                          />
                          <Line
                            yAxisId="right"
                            dataKey="cumPct"
                            name="Cumulative"
                            stroke="var(--color-primary)"
                            strokeWidth={2}
                          />
                          <Line
                            yAxisId="right"
                            dataKey="passRatePct"
                            name="Pass Rate"
                            stroke="var(--color-success)"
                            strokeWidth={2}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </StableChartContainer>
                    <div className="mt-3 overflow-x-auto">
                      <table className="table-pro cardify w-full text-sm">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left">Part</th>
                            <th className="px-3 py-2 text-right">NG</th>
                            <th className="px-3 py-2 text-right">NG Rate</th>
                            <th className="px-3 py-2 text-right">Pass Rate</th>
                            <th className="px-3 py-2 text-right">Cum%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ngParetoByProductRows.slice(0, 10).map((row) => (
                            <tr key={`ng-pareto-${row.key}`}>
                              <td data-label="Part" className="px-3 py-2 font-medium">
                                {row.key}
                              </td>
                              <td data-label="NG" className="px-3 py-2 text-right text-destructive">
                                {fmtNum(row.baseValue)}
                              </td>
                              <td data-label="NG Rate" className="px-3 py-2 text-right">
                                {fmtPct(row.ngRate)}
                              </td>
                              <td data-label="Pass Rate" className="px-3 py-2 text-right">
                                {fmtPct(row.passRate)}
                              </td>
                              <td data-label="Cum%" className="px-3 py-2 text-right">
                                {row.cumPct.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Heatmap NG Rate (Date x Meja)</h3>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                  {heatmap.slice(0, 20).map((cell) => (
                    <div key={`${cell.date}-${cell.meja}`} className="flex items-center gap-2">
                      <span className="w-24 text-muted-foreground">{cell.date}</span>
                      <span className="w-12">Meja Inspeksi {cell.meja}</span>
                      <progress
                        value={Math.min(100, cell.ngRate * 100)}
                        max={100}
                        aria-label={`NG rate ${cell.date} Meja Inspeksi ${cell.meja}: ${(cell.ngRate * 100).toFixed(2)} persen`}
                        className={cn(
                          "ng-heat-progress h-3 flex-1",
                          cell.ngRate < 0.02
                            ? "is-success"
                            : cell.ngRate < 0.05
                              ? "is-warning"
                              : "is-danger",
                        )}
                      />
                      <span>{(cell.ngRate * 100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Sankey Root Cause Flow</h3>
                <StableChartContainer>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={280}
                    initialDimension={CHART_INITIAL_DIMENSION}
                    debounce={50}
                  >
                    <Sankey data={sankeyData} nodePadding={18} nodeWidth={15} linkCurvature={0.5} />
                  </ResponsiveContainer>
                </StableChartContainer>
              </Card>
            </div>
          )}

          {tab === "deep-dive" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="text-sm font-semibold">Defect Deep Dive & Drill-down</h3>
                <select
                  value={selectedDefect}
                  onChange={(event) => setSelectedDefect(event.target.value as DefectColumnKey)}
                  className="ipt3 mt-3"
                >
                  {DEFECT_COLUMNS.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.label}
                    </option>
                  ))}
                </select>
                <div className="mt-3 overflow-x-auto">
                  <table className="table-pro cardify w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left">Meja</th>
                        <th className="px-3 py-2 text-left">Shift</th>
                        <th className="px-3 py-2 text-left">Part</th>
                        <th className="px-3 py-2 text-right">Defect</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deepDiveRows.map((row, idx) => (
                        <tr key={`${row.meja}-${row.shift}-${row.part}`}>
                          <td data-label="Meja" className="px-3 py-2">
                            Meja Inspeksi {row.meja}
                          </td>
                          <td data-label="Shift" className="px-3 py-2">
                            {row.shift}
                          </td>
                          <td data-label="Part" className="px-3 py-2">
                            {row.part}
                          </td>
                          <td data-label="Defect" className="px-3 py-2 text-right">
                            {fmtNum(row.defect)}
                          </td>
                          <td data-label="Rate" className="px-3 py-2 text-right">
                            <Badge
                              variant={idx < 3 ? "destructive" : idx < 7 ? "warning" : "outline"}
                            >
                              {(row.defectRate * 100).toFixed(2)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-semibold">Actionable Insights & Recommendations</h3>
                <div className="mt-3 space-y-2 text-sm">
                  {insights.map((item, idx) => (
                    <div key={idx} className="rounded border border-border bg-muted/40 p-3">
                      <p className="font-semibold">Insight {idx + 1}</p>
                      <p className="text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Box Summary (Pass Rate Distribution)
                </h4>
                <div className="mt-2 grid grid-cols-5 gap-2 text-xs">
                  {buildYieldBox(filteredRows).map((item) => (
                    <div
                      key={item.label}
                      className="rounded border border-border bg-card p-2 text-center"
                    >
                      <p className="text-muted-foreground">{item.label}</p>
                      <p className="font-semibold">{item.value}%</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
