import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

type ChartKind = "bar" | "area" | "composed";

type ChartSerie = {
  key: string;
  color: string;
  type?: "bar" | "area" | "line";
  hideInLegend?: boolean;
};

type ChartWithValuesProps = {
  data: Record<string, unknown>[];
  categories: { key: string; label: string }[];
  series: ChartSerie[];
  kind?: ChartKind;
  xKey: string;
  height?: number;
  showValues?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
  emptyMessage?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Accessible description for screen readers */
  ariaDescription?: string;
};

// Custom label renderer for bar charts showing value on top of bars
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarValueLabel(props: any) {
  const { x, y, width, value } = props;
  if (value == null || Number(value) === 0) return null;
  const textX = (x ?? 0) + (width ?? 0) / 2;
  const isNeg = (value as number) < 0;
  const textY = isNeg ? (y ?? 0) + 14 : (y ?? 0) - 6;
  return (
    <text
      x={textX}
      y={textY}
      textAnchor="middle"
      className="fill-muted-foreground"
      fontSize={10}
      fontWeight={600}
    >
      {Number(value).toLocaleString("id-ID")}
    </text>
  );
}

// Custom dot label for area/line charts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DotValueLabel(props: any) {
  const { cx, cy, value } = props;
  if (value == null) return null;
  return (
    <text
      x={cx}
      y={cy - 10}
      textAnchor="middle"
      className="fill-muted-foreground"
      fontSize={9}
      fontWeight={600}
    >
      {Number(value).toLocaleString("id-ID")}
    </text>
  );
}

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function ChartWithValues({
  data,
  categories,
  series,
  kind = "bar",
  xKey,
  height = 280,
  showValues = true,
  showGrid = true,
  showLegend = false,
  stacked = false,
  className,
  valueFormatter,
  emptyMessage = "Tidak ada data",
  ariaLabel,
  ariaDescription,
}: ChartWithValuesProps) {
  if (!data.length) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground",
          className,
        )}
        style={{ height }}
        role="img"
        aria-label={ariaLabel ?? "Chart with no data"}
      >
        {emptyMessage}
      </div>
    );
  }

  const chartId = `chart-${xKey}-${kind}`;
  const seriesLabels = series.map((s) => s.key).join(", ");

  const commonProps = {
    data,
    margin: { top: showValues ? 18 : 4, right: 8, bottom: 4, left: 0 },
  };

  const formatVal = valueFormatter ?? ((v: number) => v.toLocaleString("id-ID"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter = (_value: any, name: any) => {
    const cat = categories.find((c) => c.key === name);
    return [formatVal(Number(_value)), cat?.label ?? name];
  };

  const renderBarChart = () => (
    <BarChart {...commonProps}>
      {showGrid && (
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
      )}
      <XAxis
        dataKey={xKey}
        tick={{ fontSize: 10 }}
        tickLine={false}
        axisLine={{ stroke: "var(--color-border)" }}
      />
      <YAxis
        tick={{ fontSize: 10 }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
      />
      <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
      {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
      {series.map((s, i) => (
        <Bar
          key={s.key}
          dataKey={s.key}
          fill={s.color || CHART_COLORS[i % CHART_COLORS.length]}
          stackId={stacked ? "stack" : undefined}
          radius={[3, 3, 0, 0]}
          maxBarSize={32}
          label={showValues ? BarValueLabel : undefined}
          isAnimationActive={false}
        />
      ))}
    </BarChart>
  );

  const renderAreaChart = () => (
    <AreaChart {...commonProps}>
      {showGrid && (
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
      )}
      <XAxis
        dataKey={xKey}
        tick={{ fontSize: 10 }}
        tickLine={false}
        axisLine={{ stroke: "var(--color-border)" }}
      />
      <YAxis
        tick={{ fontSize: 10 }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
      />
      <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
      {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
      {series.map((s, i) => (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]}
          fill={s.color || CHART_COLORS[i % CHART_COLORS.length]}
          fillOpacity={0.15}
          strokeWidth={2}
          dot={
            showValues ? { r: 3, fill: s.color || CHART_COLORS[i % CHART_COLORS.length] } : false
          }
          label={showValues ? DotValueLabel : undefined}
          isAnimationActive={false}
        />
      ))}
    </AreaChart>
  );

  const renderComposedChart = () => (
    <ComposedChart {...commonProps}>
      {showGrid && (
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
      )}
      <XAxis
        dataKey={xKey}
        tick={{ fontSize: 10 }}
        tickLine={false}
        axisLine={{ stroke: "var(--color-border)" }}
      />
      <YAxis
        tick={{ fontSize: 10 }}
        tickLine={false}
        axisLine={false}
        tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
      />
      <Tooltip formatter={tooltipFormatter} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
      {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
      {series.map((s, i) => {
        if (s.type === "line") {
          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={showValues ? { r: 3 } : false}
              label={showValues ? DotValueLabel : undefined}
              isAnimationActive={false}
            />
          );
        }
        if (s.type === "area") {
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color || CHART_COLORS[i % CHART_COLORS.length]}
              fill={s.color || CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          );
        }
        return (
          <Bar
            key={s.key}
            dataKey={s.key}
            fill={s.color || CHART_COLORS[i % CHART_COLORS.length]}
            stackId={stacked ? "stack" : undefined}
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
            label={showValues ? BarValueLabel : undefined}
            isAnimationActive={false}
          />
        );
      })}
    </ComposedChart>
  );

  return (
    <div className={cn("min-w-0", className)}>
      {/* Accessible SVG title and description for screen readers */}
      <svg className="sr-only" aria-labelledby={`${chartId}-title`} aria-describedby={`${chartId}-desc`}>
        <title id={`${chartId}-title`}>{ariaLabel ?? `${kind} chart showing ${xKey}`}</title>
        <desc id={`${chartId}-desc`}>
          {ariaDescription ??
            `Chart displaying ${seriesLabels}. X-axis: ${xKey}. Total data points: ${data.length}.`}
        </desc>
      </svg>
      <div role="img" aria-label={ariaLabel} aria-describedby={ariaDescription ? `${chartId}-desc` : undefined}>
        <ResponsiveContainer width="100%" height={height}>
          {kind === "area"
            ? renderAreaChart()
            : kind === "composed"
              ? renderComposedChart()
              : renderBarChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
