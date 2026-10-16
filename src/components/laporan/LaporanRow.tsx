import { Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui-kit";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { formatValidationIssue } from "@/lib/management";
import type { EnrichedReport } from "@/lib/management";

type LaporanRowProps = {
  row: EnrichedReport;
  index: number;
  page: number;
  pageSize: number;
  expanded: boolean;
  canDelete: boolean;
  deletingId: string | null;
  user: { id: string } | null;
  onToggleExpand: () => void;
  onDelete: () => void;
  onNavigateNC: () => void;
};

export function LaporanRow({
  row,
  index,
  page,
  pageSize,
  expanded,
  canDelete,
  deletingId,
  user,
  onToggleExpand,
  onDelete,
  onNavigateNC,
}: LaporanRowProps) {
  const rowTone =
    row.validation.status === "critical"
      ? "bg-destructive/5"
      : row.validation.status === "warning"
        ? "bg-warning/10"
        : "";

  return (
    <>
      <tr key={row.id} className={rowTone}>
        <td data-label="No" className="px-3 py-2.5 text-muted-foreground">
          {(page - 1) * pageSize + index + 1}
        </td>
        <td data-label="Tanggal" className="px-3 py-2.5">
          {fmtDate(row.report_date)}
        </td>
        <td data-label="Shift" className="px-3 py-2.5">
          <Badge variant="info">{row.shift}</Badge>
        </td>
        <td data-label="Meja" className="px-3 py-2.5 font-medium">
          Meja Inspeksi {row.no_meja}
        </td>
        <td data-label="Part" className="px-3 py-2.5">
          <span className="font-medium">{row.part_name}</span>
        </td>
        <td data-label="Qty Check" className="px-3 py-2.5 text-right">
          {fmtNum(row.qty_check)}
        </td>
        <td data-label="OK" className="px-3 py-2.5 text-right text-success">
          {fmtNum(row.total_ok)}
        </td>
        <td data-label="NG" className="px-3 py-2.5 text-right text-destructive">
          {fmtNum(row.total_ng)}
        </td>
        <td data-label="Validasi" className="px-3 py-2.5">
          <Badge
            variant={
              row.validation.status === "good"
                ? "success"
                : row.validation.status === "warning"
                  ? "warning"
                  : "destructive"
            }
          >
            {row.validation.score} ({row.validation.status})
          </Badge>
        </td>
        <td data-label="Inspector" className="px-3 py-2.5 text-xs">
          {row.inspector_name}
        </td>
        <td data-label="Aksi" className="px-3 py-2.5 text-center">
          <button
            className="inline-flex rounded p-1.5 text-info hover:bg-info/10 min-h-[44px] min-w-[44px]"
            onClick={onToggleExpand}
            title="Expand row"
            aria-label="Tampilkan detail baris"
            aria-expanded={expanded}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </td>
        {canDelete && (
          <td data-label="Hapus" className="px-3 py-2.5 text-center">
            <button
              type="button"
              onClick={onDelete}
              disabled={deletingId === row.id}
              className="inline-flex rounded p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-40 min-h-[44px] min-w-[44px]"
              title="Hapus laporan"
              aria-label={`Hapus laporan Meja ${row.no_meja} ${row.report_date}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </td>
        )}
      </tr>
      {expanded && (
        <tr key={`${row.id}-expanded`} className="card-expand bg-muted/30">
          <td
            data-label="Validation detail"
            colSpan={canDelete ? 12 : 11}
            className="card-full px-4 py-3 text-xs"
          >
            <p className="font-semibold">Validation details</p>
            {row.validation.issues.length === 0 ? (
              <p className="text-success">Data valid - tidak ada issue.</p>
            ) : (
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {row.validation.issues.map((issue) => (
                  <li key={issue}>{formatValidationIssue(issue)}</li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-muted-foreground">
              Qty Check: {fmtNum(row.qty_check)} | OK: {fmtNum(row.total_ok)} | NG:{" "}
              {fmtNum(row.total_ng)} | Pass Rate:{" "}
              {fmtPct(row.qty_check > 0 ? (row.total_ok ?? 0) / row.qty_check : 0)}
            </p>
            {user && (
              <button type="button" className="tag mt-2" onClick={onNavigateNC}>
                Buat NC dari laporan ini
              </button>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
