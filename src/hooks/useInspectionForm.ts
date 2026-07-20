import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  useParts,
  useInspectionTables,
  useDefectTypes,
  useTableDefaultParts,
} from "@/hooks/useMasterData";
import { useAuth, isPrivilegedUser } from "@/lib/auth";
import { STORAGE_KEYS } from "@/lib/constants";
import { saveInspectionReport } from "@/server/reports";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export type Shift = "A" | "B" | "C";

export type InspectionFormState = {
  date: string;
  shift: Shift;
  no_meja: number | "";
  partNo: string;
  partName: string;
  jamMulai: string;
  jamSelesai: string;
  qtyCheck: number;
  lotNo: string;
  defects: Record<string, number>;
};

type InputPrefs = {
  shift?: Shift;
  noMeja?: number | null;
};

const defaultFormState: InspectionFormState = {
  date: format(new Date(), "yyyy-MM-dd"),
  shift: "A",
  noMeja: "",
  partNo: "",
  partName: "",
  jamMulai: "",
  jamSelesai: "",
  qtyCheck: 0,
  lotNo: "",
  defects: {},
};

export function readStoredPrefs(): InputPrefs {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEYS.INPUT_PREFS);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as InputPrefs;
  } catch {
    window.localStorage.removeItem(STORAGE_KEYS.INPUT_PREFS);
    return {};
  }
}

export function writeStoredPrefs(prefs: InputPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEYS.INPUT_PREFS,
    JSON.stringify({
      shift: prefs.shift,
      noMeja: typeof prefs.noMeja === "number" ? prefs.noMeja : null,
    }),
  );
}

export function useInspectionForm() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { user, role } = useAuth();
  const canManageInputLog = isPrivilegedUser(role, user?.email);

  // Form state
  const [formState, setFormState] = useState<InspectionFormState>({
    ...defaultFormState,
    date: today,
  });
  const [submitting, setSubmitting] = useState(false);

  // Part selection state
  const [partOpen, setPartOpen] = useState(false);
  const [partQuery, setPartQuery] = useState("");

  // Load saved preferences
  useEffect(() => {
    const saved = readStoredPrefs();
    if (saved.shift === "A" || saved.shift === "B" || saved.shift === "C") {
      setFormState((prev) => ({ ...prev, shift: saved.shift as Shift }));
    }
    if (typeof saved.noMeja === "number") {
      setFormState((prev) => ({ ...prev, noMeja: saved.noMeja as number }));
    }
  }, []);

  // Save preferences when they change
  useEffect(() => {
    writeStoredPrefs({
      shift: formState.shift,
      noMeja: formState.noMeja || null,
    });
  }, [formState.shift, formState.noMeja]);

  // Master data queries
  const { data: tables } = useInspectionTables();
  const { data: parts } = useParts();
  const { data: defectTypes } = useDefectTypes(true);
  const { data: defaultPartNos } = useTableDefaultParts(
    typeof formState.noMeja === "number" ? formState.noMeja : null,
  );

  // Computed values
  const activeTables = useMemo(() => (tables ?? []).filter((t) => t.status === "Aktif"), [tables]);

  const activeParts = useMemo(() => {
    if (!Array.isArray(parts)) return [];
    const active = parts.filter((p) => p.is_active);
    if (defaultPartNos && defaultPartNos.length > 0) {
      const defaultSet = new Set(defaultPartNos);
      return active.filter((p) => defaultSet.has(p.part_no));
    }
    return active;
  }, [parts, defaultPartNos]);

  const selectedPart = useMemo(
    () =>
      activeParts.find(
        (p) => p.part_no === formState.partNo && p.part_name === formState.partName,
      ) ?? null,
    [activeParts, formState.partNo, formState.partName],
  );

  const visibleParts = useMemo(() => {
    const keyword = partQuery.trim().toUpperCase();
    if (!keyword) return activeParts;
    return activeParts.filter(
      (p) =>
        p.part_no.toUpperCase().includes(keyword) || p.part_name.toUpperCase().includes(keyword),
    );
  }, [activeParts, partQuery]);

  // Calculated values
  const totalDefects = useMemo(
    () => Object.values(formState.defects).reduce((sum, value) => sum + (value || 0), 0),
    [formState.defects],
  );
  const ok = Math.max(0, formState.qtyCheck - totalDefects);
  const passRate = formState.qtyCheck > 0 ? ok / formState.qtyCheck : 1;
  const defectOverflow = totalDefects > formState.qtyCheck;
  const passRateStatus = passRate >= 0.98 ? "excellent" : passRate >= 0.95 ? "good" : "poor";

  // Actions
  const updateField = useCallback(
    <K extends keyof InspectionFormState>(field: K, value: InspectionFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const resetForm = useCallback(
    (preserveContext = false) => {
      setFormState((prev) => ({
        ...defaultFormState,
        date: preserveContext ? prev.date : today,
        shift: preserveContext ? prev.shift : "A",
        noMeja: preserveContext ? prev.noMeja : "",
        lotNo: preserveContext ? prev.lotNo : "",
        defects: {},
      }));
    },
    [today],
  );

  const choosePart = useCallback((part: Tables<"parts">) => {
    setFormState((prev) => ({
      ...prev,
      partNo: part.part_no,
      partName: part.part_name,
    }));
    setPartOpen(false);
    setPartQuery("");
  }, []);

  const updateDefect = useCallback((kodeDefect: string, value: number) => {
    setFormState((prev) => ({
      ...prev,
      defects: {
        ...prev.defects,
        [kodeDefect]: Math.max(0, value),
      },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (onSuccess?: () => void) => {
      if (!user) return;
      if (formState.date > today) {
        toast.error("Tanggal tidak boleh di masa depan");
        return;
      }
      if (!selectedPart) {
        toast.error("Pilih part dari master data");
        return;
      }
      if (!formState.noMeja) {
        toast.error("Pilih meja inspeksi");
        return;
      }
      if (!formState.jamMulai.trim()) {
        toast.error("Jam mulai wajib diisi");
        return;
      }
      if (!formState.jamSelesai.trim()) {
        toast.error("Jam selesai wajib diisi");
        return;
      }
      if (formState.qtyCheck <= 0) {
        toast.error("Qty check harus > 0");
        return;
      }
      if (defectOverflow) {
        toast.error(
          `Total defect (${totalDefects}) tidak boleh lebih besar dari Qty Check (${formState.qtyCheck})`,
        );
        return;
      }

      setSubmitting(true);

      try {
        await saveInspectionReport({
          data: {
            date: formState.date,
            shift: formState.shift,
            noMeja: Number(formState.noMeja),
            partNo: selectedPart.part_no,
            partName: selectedPart.part_name,
            qtyCheck: formState.qtyCheck,
            jamMulai: formState.jamMulai,
            jamSelesai: formState.jamSelesai,
            defects: formState.defects,
          },
        });
        toast.success("Laporan tersimpan");
        resetForm(true);
        onSuccess?.();
      } catch (error) {
        if (error instanceof Response) {
          const text = await error.text();
          toast.error(text);
        } else if (error instanceof Error) {
          if (error.message.includes("duplicate key")) {
            toast.error("Laporan duplikat: kombinasi tanggal+shift+meja+part sudah ada");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.error("Gagal menyimpan laporan");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [user, formState, selectedPart, defectOverflow, totalDefects, today, resetForm],
  );

  return {
    // State
    formState,
    submitting,
    defectOverflow,
    totalDefects,
    ok,
    passRate,
    passRateStatus,
    activeTables,
    activeParts,
    selectedPart,
    visibleParts,
    partOpen,
    partQuery,
    defectTypes,
    today,
    canManageInputLog,

    // Setters
    updateField,
    resetForm,
    setPartOpen,
    setPartQuery,
    updateDefect,
    choosePart,
    handleSubmit,
  };
}
