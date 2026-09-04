import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Shift } from "@/hooks/useInspectionForm";

type DefectTypeLite = {
  kode_defect: string;
  nama_defect: string;
  kategori_defect?: string | null;
};

export function SubmitConfirmModal({
  open,
  date,
  shift,
  noMeja,
  partNo,
  partName,
  lotNo,
  jamMulai,
  jamSelesai,
  qtyCheck,
  defects,
  defectTypes,
  totalNg,
  ok,
  passRate,
  submitting,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  date: string;
  shift: Shift;
  noMeja: number | "";
  partNo: string;
  partName: string;
  lotNo: string;
  jamMulai: string;
  jamSelesai: string;
  qtyCheck: number;
  defects: Record<string, number>;
  defectTypes: DefectTypeLite[] | undefined;
  totalNg: number;
  ok: number;
  passRate: number;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const activeDefects = (defectTypes ?? []).filter((d) => (defects[d.kode_defect] ?? 0) > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Konfirmasi Submit Laporan</DialogTitle>
          <DialogDescription>Periksa kembali data sebelum disimpan ke database.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Konteks Inspeksi
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <Row label="Tanggal" value={date} />
              <Row label="Shift" value={`Shift ${shift}`} />
              <Row label="No Meja" value={noMeja ? `Meja ${noMeja}` : "-"} />
              <Row label="Part" value={partNo ? `${partNo} - ${partName}` : "-"} />
              <Row label="Lot No." value={lotNo || "-"} span />
            </dl>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Waktu & Volume
            </h4>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <Row label="Jam Mulai" value={jamMulai || "-"} />
              <Row label="Jam Selesai" value={jamSelesai || "-"} />
              <Row label="Qty Check" value={String(qtyCheck)} />
              <Row label="OK" value={String(ok)} />
              <Row label="NG" value={String(totalNg)} />
              <Row label="Pass Rate" value={`${(passRate * 100).toFixed(1)}%`} />
            </dl>
          </section>

          {activeDefects.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detail Defect
              </h4>
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full min-w-105 text-left">
                  <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5">Kode</th>
                      <th className="px-3 py-1.5">Nama Defect</th>
                      <th className="px-3 py-1.5 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {activeDefects.map((d) => (
                      <tr key={d.kode_defect}>
                        <td className="px-3 py-1.5 font-mono text-xs">{d.kode_defect}</td>
                        <td className="px-3 py-1.5">{d.nama_defect}</td>
                        <td className="px-3 py-1.5 text-right font-medium">
                          {defects[d.kode_defect]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button type="button" onClick={onCancel} disabled={submitting} className="btn-secondary">
            Batal
          </button>
          <button type="button" onClick={onConfirm} disabled={submitting} className="btn-primary">
            {submitting ? "Menyimpan..." : "Ya, Simpan"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
