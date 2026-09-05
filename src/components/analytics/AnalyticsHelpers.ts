import { aggregateBy, type EnrichedReport } from "@/lib/management";

export function buildPartPareto(rows: EnrichedReport[]) {
  const sorted = aggregateBy(rows, "part_name")
    .filter((row) => row.ng > 0)
    .sort((a, b) => b.ng - a.ng);

  const totalBase = sorted.reduce((sum, row) => sum + row.ng, 0);
  let cumulative = 0;

  return sorted
    .map((row) => {
      cumulative += row.ng;
      return {
        ...row,
        baseValue: row.ng,
        passRatePct: row.passRate * 100,
        ngRatePct: row.ngRate * 100,
        pct: totalBase > 0 ? (row.ng / totalBase) * 100 : 0,
        cumPct: totalBase > 0 ? (cumulative / totalBase) * 100 : 0,
      };
    })
    .slice(0, 12);
}

export function buildYieldBox(rows: EnrichedReport[]) {
  const sorted = [...rows]
    .filter((row) => row.qty_check > 0)
    .map((row) => Number((((row.total_ok ?? 0) / row.qty_check) * 100).toFixed(2)))
    .sort((a, b) => a - b);
  if (!sorted.length) {
    return [
      { label: "Min", value: "0.00" },
      { label: "Q1", value: "0.00" },
      { label: "Median", value: "0.00" },
      { label: "Q3", value: "0.00" },
      { label: "Max", value: "0.00" },
    ];
  }
  const at = (q: number) => sorted[Math.floor((sorted.length - 1) * q)] ?? 0;
  return [
    { label: "Min", value: at(0).toFixed(2) },
    { label: "Q1", value: at(0.25).toFixed(2) },
    { label: "Median", value: at(0.5).toFixed(2) },
    { label: "Q3", value: at(0.75).toFixed(2) },
    { label: "Max", value: at(1).toFixed(2) },
  ];
}
