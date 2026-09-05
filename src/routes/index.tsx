import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  Cog,
  Package2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { getPeriodRange, PeriodFilter, type PeriodMode } from "@/components/PeriodFilter";
import { Badge, EmptyState, KpiCard, PageHeader, Skeleton } from "@/components/ui-kit";
import { RichTable, type RichColumn, ChartWithValues } from "@/components/data-table";
import { sanitizeDateRange } from "@/lib/date-range";
import { logFilterLoadDuration } from "@/lib/dev-observability";
import { fmtNum, fmtPct } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { fetchDefectDetailsByReportIds, REPORT_COLUMNS } from "@/lib/supabase-queries";
import {
  aggregateBy,
  applyManagementFilters,
  buildDefectPareto,
  buildProfileLookup,
  buildProductNgTrend,
  buildTrend,
  enrichReports,
  formatValidationIssue,
  type ManagementFilters,
} from "@/lib/management";

export const Route = createFileRoute("/")({
  component: () => (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  ),
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const InspectorPerformanceSection = memo(function InspectorPerformanceSection({
  summary,
  chartData,
  columns,
}: {
  summary: InspectorRow[];
  chartData: { name: string; ngRate: number }[];
  columns: RichColumn<InspectorRow>[];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <RichTable<InspectorRow>
        data={summary}
        columns={columns}
        keyExtractor={(r) => r.key}
        compact
        searchable
        exportable
        exportFilename="dashboard-inspector"
        pageSize={10}
        className="!rounded-xl !border-sky-100/80"
      />
      <div className="card-compact">
        <div className="card-compact-header">Inspector NG Rate</div>
        {chartData.length === 0 ? (
          <EmptyState title="Belum ada data" />
        ) : (
          <ChartWithValues
            data={chartData as unknown as Record<string, unknown>[]}
            xKey="name"
            categories={[{ key: "ngRate", label: "NG Rate (%)" }]}
            series={[{ key: "ngRate", color: "var(--color-destructive)" }]}
            kind="bar"
            height={240}
            showValues
          />
        )}
      </div>
    </div>
  );
});

const ProductNgTrendSection = memo(function ProductNgTrendSection({
  trend,
}: {
  trend: {
    chartData: Record<string, unknown>[];
    series: { key: string; color: string }[];
    categories: { key: string; label: string }[];
  };
}) {
  return (
    <div className="card-compact">
      <div className="card-compact-header">Product NG Rate Trend</div>
      {trend.chartData.length === 0 ? (
        <EmptyState title="Belum ada data" />
      ) : (
        <ChartWithValues
          data={trend.chartData}
          xKey="date"
          categories={trend.categories}
          series={trend.series}
          kind="area"
          height={260}
          showValues={false}
          showLegend
        />
      )}
    </div>
  );
});

function Dashboard() {
  const now = new Date();
  const initialRange = getPeriodRange("weekly", now);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("weekly");
  const [filters, setFilters] = useState<ManagementFilters>({
    from: initialRange.from,
    to: initialRange.to,
    meja: "",
    part: "",
    shift: "",
    inspectorId: "",
  });
  const safeDateRange = useMemo(
    () => sanitizeDateRange(filters.from, filters.to),
    [filters.from, filters.to],
  );
  const filterSignature = `${periodMode}|${safeDateRange.from}|${safeDateRange.to}|${filters.meja}|${filters.part}|${filters.shift}|${filters.inspectorId}`;
  const loadMeasureRef = useRef<{ signature: string; startedAt: number } | null>(null);
  const isFetchingRef = useRef(false);

  const baseQuery = useQuery({
    queryKey: ["dashboard-management", safeDateRange.from, safeDateRange.to],
    queryFn: async () => {
      const [{ data: reports, error: reportError }, { data: profiles, error: profileError }] =
        await Promise.all([
          supabase
            .from("inspection_reports")
            .select(REPORT_COLUMNS)
            .gte("report_date", safeDateRange.from)
            .lte("report_date", safeDateRange.to)
            .order("report_date", { ascending: true })
            .limit(500),
          supabase.from("profiles").select("id,full_name,email"),
        ]);
      if (reportError) throw reportError;
      if (profileError) throw profileError;

      const reportIds = (reports ?? []).map((row) => row.id);
      const details = await fetchDefectDetailsByReportIds(reportIds);
      return { reports: reports ?? [], details, profiles: profiles ?? [] };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  const detailsById = useMemo(
    () => new Map((baseQuery.data?.details ?? []).map((row) => [row.report_id, row])),
    [baseQuery.data?.details],
  );

  const enrichedRows = useMemo(() => {
    const reports = baseQuery.data?.reports ?? [];
    const profilesById = buildProfileLookup(baseQuery.data?.profiles);
    return enrichReports({
      reports,
      detailsByReportId: detailsById,
      profilesById,
    });
  }, [baseQuery.data?.profiles, baseQuery.data?.reports, detailsById]);

  const filteredRows = useMemo(
    () => applyManagementFilters(enrichedRows, { ...filters, ...safeDateRange }),
    [enrichedRows, filters, safeDateRange],
  );

  const inspectors = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of enrichedRows) {
      if (!row.created_by) continue;
      map.set(row.created_by, row.inspector_name || row.inspector_email || row.created_by);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [enrichedRows]);

  const mejaOptions = useMemo(
    () =>
      [...new Set(enrichedRows.map((row) => row.no_meja))]
        .sort((a, b) => a - b)
        .map((no) => ({ label: `Meja ${no}`, value: no })),
    [enrichedRows],
  );
  const partOptions = useMemo(
    () =>
      [...new Set(enrichedRows.map((row) => row.part_name))].sort((a, b) =>
        a.localeCompare(b, "id"),
      ),
    [enrichedRows],
  );

  const totals = useMemo(() => {
    const qty_check = filteredRows.reduce((sum, row) => sum + row.qty_check, 0);
    const ok = filteredRows.reduce((sum, row) => sum + (row.total_ok ?? 0), 0);
    const ng = filteredRows.reduce((sum, row) => sum + row.total_ng, 0);
    const yieldAvg = qty_check > 0 ? ok / qty_check : 0;
    const ngRate = qty_check > 0 ? ng / qty_check : 0;
    const reportCount = filteredRows.length;
    const activeMachines = new Set(filteredRows.map((row) => row.no_meja)).size;
    return {
      qty_check,
      ok,
      ng,
      yieldAvg,
      ngRate,
      reportCount,
      activeMachines,
    };
  }, [filteredRows]);

  const trend = useMemo(() => buildTrend(filteredRows), [filteredRows]);
  const quickSummary = useMemo(
    () => aggregateBy(filteredRows, "no_meja").sort((a, b) => b.ngRate - a.ngRate),
    [filteredRows],
  );
  const partLossRows = useMemo(
    () => aggregateBy(filteredRows, "part_name").sort((a, b) => b.ngRate - a.ngRate),
    [filteredRows],
  );
  const shiftRows = useMemo(() => aggregateBy(filteredRows, "shift"), [filteredRows]);
  const defectPareto = useMemo(
    () => buildDefectPareto(filteredRows, detailsById),
    [detailsById, filteredRows],
  );

  const criticalAlerts = useMemo(() => {
    const lowYield = [...filteredRows]
      .filter((row) => row.qty_check > 0 && (row.total_ok ?? 0) / row.qty_check < 0.95)
      .sort(
        (a, b) =>
          (a.qty_check > 0 ? (a.total_ok ?? 0) / a.qty_check : 0) -
          (b.qty_check > 0 ? (b.total_ok ?? 0) / b.qty_check : 0),
      )
      .slice(0, 4);
    const highNgRate = [...filteredRows]
      .filter((row) => row.qty_check > 0 && row.total_ng / row.qty_check >= 0.05)
      .sort((a, b) => b.total_ng / b.qty_check - a.total_ng / a.qty_check)
      .slice(0, 4);
    const invalid = filteredRows
      .filter((row) => row.validation.issues.length > 0)
      .sort((a, b) => b.validation.issues.length - a.validation.issues.length)
      .slice(0, 4);
    return { lowYield, highNgRate, invalid };
  }, [filteredRows]);

  const scatterData = useMemo(
    () =>
      filteredRows.map((row) => ({
        meja: row.no_meja,
        ng: row.total_ng,
        qty_check: row.qty_check,
      })),
    [filteredRows],
  );

  const inspectorSummary = useMemo(
    () =>
      aggregateBy(filteredRows, "inspector_name")
        .filter((row) => row.key !== "Unknown")
        .map((row) => ({
          ...row,
          avg_qty_per_report: row.reports > 0 ? row.qty_check / row.reports : 0,
        }))
        .sort((a, b) => b.ngRate - a.ngRate),
    [filteredRows],
  );

  const inspectorChartData = useMemo(
    () =>
      inspectorSummary.slice(0, 10).map((row) => ({
        name: row.key,
        ngRate: Number((row.ngRate * 100).toFixed(1)),
      })),
    [inspectorSummary],
  );

  const productNgTrend = useMemo(() => buildProductNgTrend(filteredRows, 6), [filteredRows]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const wasFetching = isFetchingRef.current;
    const isFetching = baseQuery.isFetching;

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
          "dashboard",
          filterSignature,
          performance.now() - loadMeasureRef.current.startedAt,
          filteredRows.length,
        );
      }
      loadMeasureRef.current = null;
    }

    isFetchingRef.current = isFetching;
  }, [baseQuery.isFetching, filterSignature, filteredRows.length]);

  const mejaColumns: RichColumn<AggRow>[] = useMemo(
    () => [
      { key: "meja", header: "Meja", accessor: (r) => `Meja ${r.key}`, sortable: true },
      {
        key: "qty",
        header: "Qty Check",
        accessor: (r) => r.qty_check,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
      {
        key: "ng",
        header: "NG",
        accessor: (r) => r.ng,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
      {
        key: "ngRate",
        header: "NG Rate",
        accessor: (r) => r.ngRate,
        sortable: true,
        align: "right",
        format: (v) => fmtPct(Number(v)),
      },
      {
        key: "yield",
        header: "Yield",
        accessor: (r) => r.passRate,
        sortable: true,
        align: "right",
        format: (v) => fmtPct(Number(v)),
      },
    ],
    [],
  );

  const shiftColumns: RichColumn<AggRow>[] = useMemo(
    () => [
      { key: "shift", header: "Shift", accessor: (r) => `Shift ${r.key}`, sortable: true },
      {
        key: "qty",
        header: "Qty Check",
        accessor: (r) => r.qty_check,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
      {
        key: "ngRate",
        header: "NG Rate",
        accessor: (r) => r.ngRate,
        sortable: true,
        align: "right",
        format: (v) => fmtPct(Number(v)),
      },
      {
        key: "yield",
        header: "Yield",
        accessor: (r) => r.passRate,
        sortable: true,
        align: "right",
        format: (v) => fmtPct(Number(v)),
      },
    ],
    [],
  );

  const partColumns: RichColumn<AggRow>[] = useMemo(
    () => [
      { key: "part", header: "Part", accessor: (r) => r.key, sortable: true },
      {
        key: "qty",
        header: "Qty Check",
        accessor: (r) => r.qty_check,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
      {
        key: "ng",
        header: "NG",
        accessor: (r) => r.ng,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
      {
        key: "ngRate",
        header: "NG Rate",
        accessor: (r) => r.ngRate,
        sortable: true,
        align: "right",
        format: (v) => fmtPct(Number(v)),
      },
      {
        key: "reports",
        header: "Laporan",
        accessor: (r) => r.reports,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
    ],
    [],
  );

  const inspectorColumns: RichColumn<InspectorRow>[] = useMemo(
    () => [
      {
        key: "inspector",
        header: "Inspector",
        accessor: (r) => r.key,
        sortable: true,
      },
      {
        key: "reports",
        header: "Laporan",
        accessor: (r) => r.reports,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
      {
        key: "qty",
        header: "Qty Check",
        accessor: (r) => r.qty_check,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
      {
        key: "ng",
        header: "NG",
        accessor: (r) => r.ng,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Number(v)),
      },
      {
        key: "ngRate",
        header: "NG Rate",
        accessor: (r) => r.ngRate,
        sortable: true,
        align: "right",
        format: (v) => fmtPct(Number(v)),
      },
      {
        key: "avgQty",
        header: "Rata-rata/Lap",
        accessor: (r) => r.avg_qty_per_report,
        sortable: true,
        align: "right",
        format: (v) => fmtNum(Math.round(Number(v))),
      },
    ],
    [],
  );

  if (baseQuery.isError) {
    return (
      <div className="grid-compact">
        <PageHeader
          compact
          title="Dashboard"
          description={format(new Date(), "EEEE, dd MMMM yyyy", { locale: idLocale })}
        />
        <EmptyState
          title="Gagal memuat data dashboard"
          description={
            baseQuery.error instanceof Error
              ? baseQuery.error.message
              : "Terjadi kesalahan saat mengambil data."
          }
        />
      </div>
    );
  }

  return (
    <div className="grid-compact">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          compact
          title="Dashboard"
          description={format(new Date(), "EEEE, dd MMMM yyyy", { locale: idLocale })}
        />
        <div className="flex items-center gap-2">
          {baseQuery.isRefetching && (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {!baseQuery.isLoading && filteredRows.length === 0 && (
            <Badge variant="warning">No Data</Badge>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="card-compact">
        <PeriodFilter
          from={filters.from}
          to={filters.to}
          mode={periodMode}
          testIdPrefix="dashboard-period"
          inputClassName="ipt"
          onChange={(next) => {
            setPeriodMode(next.mode);
            setFilters((prev) => ({ ...prev, from: next.from, to: next.to }));
          }}
        />
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            className="ipt"
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
            {mejaOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            className="ipt"
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
            className="ipt"
            aria-label="Filter inspector"
            value={filters.inspectorId}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, inspectorId: event.target.value }))
            }
          >
            <option value="">Semua inspector</option>
            {inspectors.map((inspector) => (
              <option key={inspector.id} value={inspector.id}>
                {inspector.name}
              </option>
            ))}
          </select>
          <input
            className="ipt"
            placeholder="Filter part"
            aria-label="Filter part"
            value={filters.part}
            list="part-options"
            onChange={(event) => setFilters((prev) => ({ ...prev, part: event.target.value }))}
          />
          <datalist id="part-options">
            {partOptions.map((part) => (
              <option key={part} value={part} />
            ))}
          </datalist>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {baseQuery.isLoading
          ? Array.from({ length: 5 }).map((_, idx) => <Skeleton key={idx} className="h-20" />)
          : [
              <KpiCard
                key="qty"
                compact
                label="Qty Check"
                value={fmtNum(totals.qty_check)}
                accent="primary"
                icon={<Package2 className="h-3.5 w-3.5" />}
                dataTestId="dashboard-kpi-total-output"
              />,
              <KpiCard
                key="yield"
                compact
                label="Yield"
                value={fmtPct(totals.yieldAvg)}
                sub={`OK ${fmtNum(totals.ok)}`}
                accent="success"
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              />,
              <KpiCard
                key="ng"
                compact
                label="NG Rate"
                value={fmtPct(totals.ngRate)}
                sub={`NG ${fmtNum(totals.ng)}`}
                accent="destructive"
                icon={<AlertOctagon className="h-3.5 w-3.5" />}
              />,
              <KpiCard
                key="reports"
                compact
                label="Reports"
                value={fmtNum(totals.reportCount)}
                sub={`${totals.activeMachines} meja`}
                accent="info"
                icon={<Activity className="h-3.5 w-3.5" />}
                dataTestId="dashboard-kpi-reports"
              />,
              <KpiCard
                key="meja"
                compact
                label="Meja Aktif"
                value={totals.activeMachines}
                sub="periode ini"
                accent="info"
                icon={<Cog className="h-3.5 w-3.5" />}
              />,
            ]}
      </div>

      {/* Main content: 3 columns on desktop */}
      <div className="grid gap-3 xl:grid-cols-3">
        {/* Left: Alerts */}
        <div className="card-compact">
          <div className="card-compact-header flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Critical Alerts
          </div>
          {!filteredRows.length ? (
            <EmptyState title="Belum ada data" />
          ) : criticalAlerts.lowYield.length === 0 &&
            criticalAlerts.highNgRate.length === 0 &&
            criticalAlerts.invalid.length === 0 ? (
            <EmptyState
              title="Semua indikator aman"
              description="Tidak ada critical alert dalam periode ini."
            />
          ) : (
            <div className="mt-2 space-y-1.5">
              {criticalAlerts.lowYield.map((row) => (
                <div
                  key={`yield-${row.id}`}
                  className="rounded border border-destructive/30 bg-destructive/5 p-1.5 text-xs"
                >
                  <p className="font-semibold text-destructive">
                    Yield {fmtPct((row.total_ok ?? 0) / row.qty_check)} — Meja {row.no_meja} /{" "}
                    {row.part_name}
                  </p>
                  <p className="text-muted-foreground">
                    {row.report_date} Shift {row.shift} | NG {fmtNum(row.total_ng)}
                  </p>
                </div>
              ))}
              {criticalAlerts.highNgRate.map((row) => (
                <div
                  key={`ng-${row.id}`}
                  className="rounded border border-destructive/30 bg-destructive/5 p-1.5 text-xs"
                >
                  <p className="font-semibold text-destructive">
                    NG rate {fmtPct(row.total_ng / row.qty_check)} — Meja {row.no_meja}
                  </p>
                  <p className="text-muted-foreground">
                    {row.report_date} | {row.part_name} | NG {fmtNum(row.total_ng)}
                  </p>
                </div>
              ))}
              {criticalAlerts.invalid.map((row) => (
                <div
                  key={`inv-${row.id}`}
                  className="rounded border border-warning/30 bg-warning/10 p-1.5 text-xs"
                >
                  <p className="font-semibold text-warning-foreground">
                    {row.part_name} — Issue validasi
                  </p>
                  <p className="text-muted-foreground">
                    {row.validation.issues.map((issue) => formatValidationIssue(issue)).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Middle: Top Loss Drivers */}
        <div className="card-compact">
          <div className="card-compact-header flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Top Loss Drivers
          </div>
          {!filteredRows.length ? (
            <EmptyState title="Belum ada data" />
          ) : (
            <div className="mt-2 space-y-2">
              <div className="rounded-lg border border-border bg-muted/20 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Meja Prioritas
                </p>
                <p className="mt-0.5 text-sm font-bold">
                  {quickSummary[0] ? `Meja ${quickSummary[0].key}` : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {quickSummary[0]
                    ? `NG Rate ${fmtPct(quickSummary[0].ngRate)} | NG ${fmtNum(quickSummary[0].ng)}`
                    : "-"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Part Prioritas
                </p>
                <p className="mt-0.5 text-sm font-bold">{partLossRows[0]?.key ?? "-"}</p>
                <p className="text-xs text-muted-foreground">
                  {partLossRows[0]
                    ? `NG Rate ${fmtPct(partLossRows[0].ngRate)} | NG ${fmtNum(partLossRows[0].ng)}`
                    : "-"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Defect Dominan
                </p>
                <p className="mt-0.5 text-sm font-bold">{defectPareto[0]?.name ?? "-"}</p>
                <p className="text-xs text-muted-foreground">
                  {defectPareto[0]
                    ? `${fmtNum(defectPareto[0].total)} pcs (${defectPareto[0].pct.toFixed(1)}%)`
                    : "-"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Shift Comparison */}
        <div className="card-compact">
          <div className="card-compact-header">Shift Comparison</div>
          {!shiftRows.length ? (
            <EmptyState title="Data shift belum tersedia" />
          ) : (
            <RichTable<AggRow>
              data={shiftRows}
              columns={shiftColumns}
              keyExtractor={(r) => r.key}
              compact
              pageSize={5}
            />
          )}
        </div>
      </div>

      {/* Middle section: 2 columns */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Trend Chart */}
        <div className="card-compact">
          <div className="card-compact-header">Output & Yield Trend</div>
          {!trend.length ? (
            <EmptyState title="Belum ada trend data" />
          ) : (
            <ChartWithValues
              data={trend as unknown as Record<string, unknown>[]}
              xKey="date"
              categories={[
                { key: "qty_check", label: "Qty Check" },
                { key: "passRate", label: "Yield %" },
                { key: "ngRate", label: "NG Rate %" },
              ]}
              series={[
                { key: "qty_check", color: CHART_COLORS[1] },
                { key: "passRate", color: "var(--color-primary)", type: "line", axis: "right" },
                { key: "ngRate", color: "var(--color-destructive)", type: "line", axis: "right" },
              ]}
              kind="composed"
              height={240}
              showValues={false}
              showLegend
            />
          )}
        </div>

        {/* Pareto Chart */}
        <div className="card-compact">
          <div className="card-compact-header">Top Defect Pareto</div>
          {!defectPareto.length ? (
            <EmptyState title="Detail defect belum tersedia" />
          ) : (
            <ChartWithValues
              data={defectPareto.slice(0, 8) as unknown as Record<string, unknown>[]}
              xKey="name"
              categories={[
                { key: "total", label: "Total" },
                { key: "cumPct", label: "Kumulatif %" },
              ]}
              series={[
                { key: "total", color: CHART_COLORS[0] },
                { key: "cumPct", color: "var(--color-primary)", type: "line", axis: "right" },
              ]}
              kind="composed"
              height={240}
              showValues={false}
              showLegend
            />
          )}
        </div>
      </div>

      {/* Bottom section: 2 columns of tables */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Meja Risk Ranking */}
        <RichTable<AggRow>
          data={quickSummary}
          columns={mejaColumns}
          keyExtractor={(r) => r.key}
          compact
          searchable
          exportable
          exportFilename="dashboard-meja-risk"
          pageSize={10}
          className="!rounded-xl !border-sky-100/80"
        />

        {/* Part Loss */}
        <RichTable<AggRow>
          data={partLossRows}
          columns={partColumns}
          keyExtractor={(r) => r.key}
          compact
          searchable
          exportable
          exportFilename="dashboard-part-loss"
          pageSize={10}
          className="!rounded-xl !border-sky-100/80"
        />
      </div>

      {/* Scatter Chart */}
      {scatterData.length > 0 && (
        <div className="card-compact">
          <div className="card-compact-header">Scatter NG vs Qty Check</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-success" />
              NG ≤ 3
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-warning" />3 &lt; NG ≤ 10
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-destructive" />
              NG &gt; 10
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number"
                dataKey="qty_check"
                name="Qty Check"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
              />
              <YAxis
                type="number"
                dataKey="ng"
                name="NG"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={scatterData} fill="var(--color-chart-2)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      <InspectorPerformanceSection
        summary={inspectorSummary}
        chartData={inspectorChartData}
        columns={inspectorColumns}
      />
      <ProductNgTrendSection trend={productNgTrend} />
    </div>
  );
}

type AggRow = {
  key: string;
  qty_check: number;
  ok: number;
  ng: number;
  reports: number;
  qualityScore: number;
  passRate: number;
  ngRate: number;
};

type InspectorRow = AggRow & {
  avg_qty_per_report: number;
};
