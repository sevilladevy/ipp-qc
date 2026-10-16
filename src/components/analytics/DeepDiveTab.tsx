import { Card } from "@/components/ui-kit";
import { DEFECT_COLUMNS } from "@/lib/format";
import type { DeepDiveRow, Insight } from "./use-analytics-data";
import { buildYieldBox } from "@/components/analytics/AnalyticsHelpers";
import type { AnalyticRow } from "./use-analytics-data";

type DeepDiveTabProps = {
  deepDiveRows: DeepDiveRow[];
  insights: Insight[];
  filteredRows: AnalyticRow[];
  selectedDefect: string;
  setSelectedDefect: (v: string) => void;
};

export function DeepDiveTab({
  deepDiveRows,
  insights,
  filteredRows,
  selectedDefect,
  setSelectedDefect,
}: DeepDiveTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h3 className="text-sm font-semibold">Defect Deep Dive & Drill-down</h3>
        <select
          value={selectedDefect}
          onChange={(event) => setSelectedDefect(event.target.value)}
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
                    {row.defect}
                  </td>
                  <td data-label="Rate" className="px-3 py-2 text-right">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                        idx < 3
                          ? "bg-destructive/10 text-destructive"
                          : idx < 7
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {(row.defectRate * 100).toFixed(2)}%
                    </span>
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
            <div key={item.label} className="rounded border border-border bg-card p-2 text-center">
              <p className="text-muted-foreground">{item.label}</p>
              <p className="font-semibold">{item.value}%</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
