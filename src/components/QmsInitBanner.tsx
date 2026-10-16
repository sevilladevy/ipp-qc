import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Database, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { initQmsSchema } from "@/server/qms-init";
import { useQueryClient } from "@tanstack/react-query";

const STORAGE_KEY = "qms_schema_init_ok";

/**
 * Supervisor-only banner + button to bootstrap the QMS schema
 * (non_conformities, audit_schedules, improvements, management_reviews).
 * Shown only when the last init hasn't been confirmed yet, to avoid
 * clutter. Disappears permanently after a successful init.
 */
export function QmsInitBanner() {
  const { isSupervisor, user } = useAuth();
  const qc = useQueryClient();
  const [initiating, setInitiating] = useState(false);
  const [done, setDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  if (!isSupervisor || !user || done) return null;

  async function handleInit() {
    setInitiating(true);
    try {
      await initQmsSchema();
      window.localStorage.setItem(STORAGE_KEY, "1");
      setDone(true);
      // Invalidate all QMS queries so they re-fetch now that tables exist.
      qc.invalidateQueries();
      toast.success("Skema QMS berhasil diinisialisasi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menginisialisasi skema QMS");
    } finally {
      setInitiating(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Database className="h-5 w-5 shrink-0 text-amber-600" />
      <div className="flex-1">
        <p className="font-semibold">Modul QMS belum tersedia di database</p>
        <p className="mt-0.5 text-xs text-amber-800/80">
          Klik tombol untuk membuat tabel Non-Conformity, Audit, Improvement, dan Management Review.
          (butuh role supervisor)
        </p>
      </div>
      <button
        type="button"
        onClick={handleInit}
        disabled={initiating}
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
      >
        {initiating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        Inisialisasi QMS
      </button>
    </div>
  );
}

export function QmsInitBannerSlot() {
  return <QmsInitBanner />;
}
