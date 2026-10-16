import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, EmptyState, PageHeader } from "@/components/ui-kit";
import { SkeletonChart, SkeletonKpiGrid } from "@/components/ui-skeletons";
import { PeriodFilter, type PeriodMode } from "@/components/PeriodFilter";
import { AppLayout } from "@/components/AppLayout";
import {
  DeepDiveTab,
  KpiGrid,
  MetricsTab,
  OverviewCharts,
  ScatterNgVsQtyCheck,
  useAnalyticsData,
} from "@/components/analytics";
import { DEFECT_COLUMNS } from "@/lib/format";
import { getPeriodRange } from "@/components/PeriodFilter";

export const Route = createFileRoute("/analitik")({
  component: () => (
    <AppLayout>
      <Analitik />
    </AppLayout>
  ),
});

type Tab = "overview" | "metrics" | "deep-dive";

function Analitik() {
  const now = new Date();
  const initialRange = getPeriodRange("monthly", now);
  const [tab, setTab] = useState<Tab>("overview");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("monthly");
  const [filters, setFilters] = useState({
    from: initialRange.from,
    to: initialRange.to,
    meja: "",
    part: "",
    shift: "",
    inspectorId: "",
  });
  const [selectedDefect, setSelectedDefect] = useState(DEFECT_COLUMNS[0].key);
  const safeDateRange = useMemo(
    () => ({ from: filters.from, to: filters.to }),
    [filters.from, filters.to],
  );
  const filterSignature = `${tab}|${periodMode}|${safeDateRange.from}|${safeDateRange.to}|${filters.meja}|${filters.part}|${filters.shift}|${filters.inspectorId}`;
  const loadMeasureRef = useRef<{ signature: string; startedAt: number } | null>(null);
  const isFetchingRef = useRef(false);

  const {
    query,
    filteredRows,
    trendRows,
    defectPareto,
    executiveSummary,
    comparisonRows,
    mejaNgYieldRows,
    partNgYieldRows,
    ngParetoByProductRows,
    deepDiveRows,
    heatmap,
    insights,
    mejaOptions,
    partOptions,
    inspectorOptions,
  } = useAnalyticsData(safeDateRange.from, safeDateRange.to);

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
        // logFilterLoadDuration would go here if needed
        void filteredRows.length;
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

      <KpiGrid summary={executiveSummary} />

      <div
        className="mb-4 flex flex-wrap gap-1 border-b border-border"
        role="tablist"
        aria-label="Tampilan analitik"
      >
        {(
          [
            ["overview", "Executive Summary"],
            ["metrics", "Meja / Part / Shift"],
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
            <>
              <OverviewCharts trendRows={trendRows} defectPareto={defectPareto} />
              <ScatterNgVsQtyCheck filteredRows={filteredRows} />
            </>
          )}

          {tab === "metrics" && (
            <MetricsTab
              mejaNgYieldRows={mejaNgYieldRows}
              comparisonRows={comparisonRows}
              partNgYieldRows={partNgYieldRows}
              ngParetoByProductRows={ngParetoByProductRows}
              heatmap={heatmap}
            />
          )}

          {tab === "deep-dive" && (
            <DeepDiveTab
              deepDiveRows={deepDiveRows}
              insights={insights}
              filteredRows={filteredRows}
              selectedDefect={selectedDefect}
              setSelectedDefect={setSelectedDefect}
            />
          )}
        </>
      )}
    </div>
  );
}
