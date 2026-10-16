import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StableChartContainer } from "@/components/StableChartContainer";
import type { TrendRow, DefectParetoRow } from "./use-analytics-data";

type OverviewChartsProps = {
  trendRows: TrendRow[];
  defectPareto: DefectParetoRow[];
};

const CHART_INITIAL_DIMENSION = { width: 1, height: 280 };

export function OverviewCharts({ trendRows, defectPareto }: OverviewChartsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
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
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={70} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" />
            <Tooltip />
            <Bar yAxisId="left" dataKey="total" fill="var(--color-accent)" />
            <Line yAxisId="right" dataKey="cumPct" stroke="var(--color-primary)" />
          </ComposedChart>
        </ResponsiveContainer>
      </StableChartContainer>

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
    </div>
  );
}
