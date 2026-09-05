import { useEffect } from "react";
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
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-card shadow-2xl"
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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted-foreground hover:bg-muted"
            aria-label="Tutup dialog"
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
