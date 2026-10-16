import { Activity, AlertOctagon, Package2 } from "lucide-react";
import { KpiCard } from "@/components/ui-kit";
import { fmtNum, fmtPct } from "@/lib/format";
import type { ExecutiveSummary } from "./use-analytics-data";

type KpiGridProps = {
  summary: ExecutiveSummary;
};

export function KpiGrid({ summary }: KpiGridProps) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      <KpiCard
        label="Qty Check"
        value={fmtNum(summary.qty_check)}
        sub={`Reports ${fmtNum(summary.reportCount)}`}
        accent="primary"
        icon={<Package2 className="h-5 w-5" />}
        dataTestId="analytics-kpi-output"
      />
      <KpiCard
        label="Yield"
        value={fmtPct(summary.passRate)}
        sub={`OK ${fmtNum(summary.ok)}`}
        accent={
          summary.passRate >= 0.98
            ? "success"
            : summary.passRate >= 0.95
              ? "warning"
              : "destructive"
        }
        icon={<Activity className="h-5 w-5" />}
      />
      <KpiCard
        label="NG Rate"
        value={fmtPct(summary.ngRate)}
        sub={`NG ${fmtNum(summary.ng)}`}
        accent="destructive"
        icon={<AlertOctagon className="h-5 w-5" />}
      />
    </div>
  );
}
