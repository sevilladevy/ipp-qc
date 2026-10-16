import { Card, EmptyState } from "@/components/ui-kit";
import { StableChartContainer } from "@/components/StableChartContainer";
import { fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
  ResponsiveContainer,
} from "recharts";
import type { NgParetoByProductRow, HeatmapCell, SankeyData } from "./use-analytics-data";

type MetricsTabProps = {
  mejaNgYieldRows: {
    key: string;
    qty_check: number;
    ng: number;
    passRate: number;
    ngRate: number;
    reports: number;
  }[];
  comparisonRows: {
    byShift: { key: string; qty_check: number; ng: number; passRate: number }[];
    byMeja: {
      key: string;
      qty_check: number;
      ng: number;
      passRate: number;
      ngRate: number;
      reports: number;
    }[];
  };
  partNgYieldRows: {
    key: string;
    reports: number;
    qty_check: number;
    ngRate: number;
    passRate: number;
  }[];
  ngParetoByProductRows: NgParetoByProductRow[];
  heatmap: HeatmapCell[];
  sankeyData: SankeyData;
};

const CHART_INITIAL_DIMENSION = { width: 1, height: 280 };

export function MetricsTab({
  mejaNgYieldRows,
  comparisonRows,
  partNgYieldRows,
  ngParetoByProductRows,
  heatmap,
}: MetricsTabProps) {
  return (
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
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        row.ngRate < 0.02
                          ? "bg-success/10 text-success"
                          : row.ngRate < 0.05
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {fmtPct(row.ngRate)}
                    </span>
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
        <h3 className="text-sm font-semibold">Top Meja Metrics</h3>
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
                  <td data-label="NG Rate" className="px-3 py-2 text-right text-destructive">
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
            <svg width="100%" height="100%">
              {/* Simplified sankey representation */}
              <text x="50%" y="50%" textAnchor="middle" className="fill-muted-foreground text-sm">
                Sankey chart requires recharts-sankey plugin
              </text>
            </svg>
          </ResponsiveContainer>
        </StableChartContainer>
      </Card>
    </div>
  );
}
