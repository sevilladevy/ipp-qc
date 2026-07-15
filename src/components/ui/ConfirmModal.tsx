import { AlertTriangle, X } from "lucide-react";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "info";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${tone === "danger" ? "text-destructive" : ""}`} />
            <h3 className="text-base font-bold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2 px-5 py-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`btn-primary ${
                tone === "danger"
                  ? "bg-destructive text-destructive-foreground border-destructive"
                  : ""
              }`}
            >
              {loading ? "Memproses..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
