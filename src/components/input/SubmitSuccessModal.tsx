import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import type { SaveSummary } from "@/hooks/useInspectionForm";

export function SubmitSuccessModal({
  open,
  summary,
  onClose,
}: {
  open: boolean;
  summary: SaveSummary | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <DialogHeader>
          <DialogTitle>Laporan Berhasil Disimpan</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Data inspeksi telah tersimpan di database.
          </p>
        </DialogHeader>

        {summary && (
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Part: </span>
              <strong>
                {summary.partNo} - {summary.partName}
              </strong>
            </p>
            <p>
              <span className="text-muted-foreground">Lot No.: </span>
              <strong>{summary.lotNo || "-"}</strong>
            </p>
            <p className="text-muted-foreground">
              Qty Check: <strong className="text-foreground">{summary.qtyCheck}</strong> · OK{" "}
              <strong className="text-foreground">{summary.ok}</strong> · NG{" "}
              <strong className="text-foreground">{summary.ng}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Pass Rate: </span>
              <strong>{(summary.passRate * 100).toFixed(1)}%</strong>
            </p>
          </div>
        )}

        <DialogFooter className="justify-center">
          <DialogClose asChild>
            <button type="button" className="btn-primary" onClick={onClose}>
              OK
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
