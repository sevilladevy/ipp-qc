import { Card } from "@/components/ui-kit";
import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Scatter,
  Cell,
} from "recharts";
import { StableChartContainer } from "@/components/StableChartContainer";
import type { AnalyticRow } from "./use-analytics-data";

type ScatterChartProps = {
  filteredRows: AnalyticRow[];
};

const CHART_INITIAL_DIMENSION = { width: 1, height: 280 };

export function ScatterNgVsQtyCheck({ filteredRows }: ScatterChartProps) {
  return (
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
  );
}
