import { X } from "lucide-react";
import { fmtNum } from "@/lib/format";
import { LogMetric } from "./LogMetric";
import { EditField } from "./EditField";
import type { FormEvent } from "react";
import type { Shift } from "@/hooks/useInspectionForm";
import type { InputLogRow, EditLogForm as EditLogFormType } from "@/hooks/useLogManagement";

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export function InputLogEditModal({
  row,
  form,
  saving,
  today,
  onChange,
  onClose,
  onSubmit,
}: {
  row: InputLogRow;
  form: EditLogFormType;
  saving: boolean;
  today: string;
  onChange: (next: EditLogFormType) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const totalOk = Math.max(0, form.qty_check - form.total_ng);
  const ngRate = form.qty_check > 0 ? form.total_ng / form.qty_check : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit Log Input"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
          <div>
            <h3 className="font-semibold">Edit Log Input</h3>
            <p className="text-xs opacity-80">{formatTimestamp(row.created_at)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded hover:bg-white/10"
            aria-label="Tutup edit log"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <EditField label="Tanggal Report">
              <input
                type="date"
                value={form.report_date}
                max={today}
                onChange={(event) => onChange({ ...form, report_date: event.target.value })}
                className="ipt2"
                required
              />
            </EditField>
            <EditField label="Shift">
              <select
                value={form.shift}
                onChange={(event) => onChange({ ...form, shift: event.target.value as Shift })}
                className="ipt2"
              >
                <option value="A">Shift A</option>
                <option value="B">Shift B</option>
                <option value="C">Shift C</option>
              </select>
            </EditField>
            <EditField label="Meja">
              <input
                type="number"
                min={1}
                value={form.no_meja}
                onChange={(event) => {
                  const raw = Number(event.target.value);
                  onChange({
                    ...form,
                    no_meja: Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0,
                  });
                }}
                className="ipt2"
                required
              />
            </EditField>
            <EditField label="Part">
              <input
                value={`${row.part_no} - ${row.part_name}`}
                className="ipt2 bg-muted/50"
                readOnly
              />
            </EditField>
            <EditField label="Jam Mulai">
              <input
                type="time"
                value={form.jam_mulai}
                onChange={(event) => onChange({ ...form, jam_mulai: event.target.value })}
                className="ipt2"
                required
              />
            </EditField>
            <EditField label="Jam Selesai">
              <input
                type="time"
                value={form.jam_selesai}
                onChange={(event) => onChange({ ...form, jam_selesai: event.target.value })}
                className="ipt2"
                required
              />
            </EditField>
            <EditField label="Qty Check">
              <input
                type="number"
                min={1}
                value={form.qty_check}
                onChange={(event) => {
                  const raw = Number(event.target.value);
                  onChange({
                    ...form,
                    qty_check: Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0,
                  });
                }}
                className="ipt2"
                required
              />
            </EditField>
            <EditField label="NG">
              <input
                type="number"
                min={0}
                value={form.total_ng}
                onChange={(event) => {
                  const raw = Number(event.target.value);
                  onChange({
                    ...form,
                    total_ng: Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0,
                  });
                }}
                className="ipt2"
                required
              />
            </EditField>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <LogMetric label="OK" value={fmtNum(totalOk)} tone="success" />
            <LogMetric label="NG Rate" value={`${(ngRate * 100).toFixed(2)}%`} tone="danger" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
