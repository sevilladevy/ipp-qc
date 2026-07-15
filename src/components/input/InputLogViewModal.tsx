import { X } from "lucide-react";
import { fmtNum } from "@/lib/format";
import { LogInfo } from "./LogInfo";
import { LogMetric } from "./LogMetric";
import { DEFECT_COLUMNS } from "@/lib/format";
import type { InputLogRow } from "@/hooks/useInspectionForm";

type DefectDetail = Record<string, unknown>;

function getDefectBreakdown(detail: DefectDetail | null) {
  if (!detail) return [];

  const builtIn = DEFECT_COLUMNS.map((column) => ({
    label: column.label,
    value: Number(detail[column.key] ?? 0),
  })).filter((item) => item.value > 0);

  const rawExtra = detail.extra_defects;
  const extra =
    rawExtra && typeof rawExtra === "object" && !Array.isArray(rawExtra)
      ? Object.entries(rawExtra)
          .map(([label, value]) => ({ label, value: Number(value ?? 0) }))
          .filter((item) => Number.isFinite(item.value) && item.value > 0)
      : [];

  return [...builtIn, ...extra];
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function InputLogViewModal({ row, onClose }: { row: InputLogRow; onClose: () => void }) {
  const defects = getDefectBreakdown(row.detail);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
          <div>
            <h3 className="font-semibold">Detail Log Input</h3>
            <p className="text-xs opacity-80">{formatTimestamp(row.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-white/10"
            aria-label="Tutup detail log"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <LogInfo label="Tanggal Report" value={row.report_date} />
            <LogInfo label="Shift" value={`Shift ${row.shift}`} />
            <LogInfo label="Meja" value={`Meja Inspeksi ${row.no_meja}`} />
            <LogInfo label="Part" value={`${row.part_no} - ${row.part_name}`} />
            <LogInfo label="Jam Mulai" value={row.jam_mulai ?? "-"} />
            <LogInfo label="Jam Selesai" value={row.jam_selesai ?? "-"} />
            <LogInfo label="Inspector" value={row.inspectorName} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <LogMetric label="Qty Check" value={fmtNum(row.qty_check)} />
            <LogMetric label="OK" value={fmtNum(row.total_ok ?? 0)} tone="success" />
            <LogMetric label="NG" value={fmtNum(row.total_ng)} tone="danger" />
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Defect Detail</h4>
            {!defects.length ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Tidak ada detail defect untuk log ini.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {defects.map((defect) => (
                  <div
                    key={defect.label}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span>{defect.label}</span>
                    <strong>{fmtNum(defect.value)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
