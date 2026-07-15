import type { TablesInsert } from "@/integrations/supabase/types";

export type DefectColumnKey = Exclude<
  keyof TablesInsert<"inspection_defect_details">,
  "created_at" | "extra_defects" | "id" | "report_id"
>;

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null) return "-";
  return n.toLocaleString("id-ID");
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtRupiahJuta(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "-";
  const juta = n / 1_000_000;
  return `Rp ${juta.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} Jt`;
}

export function yieldColor(yieldVal: number): string {
  if (yieldVal >= 0.98) return "text-success";
  if (yieldVal >= 0.95) return "text-warning";
  return "text-destructive";
}

export const DEFECT_COLUMNS: { key: DefectColumnKey; label: string }[] = [
  { key: "short_shot", label: "Short Shot" },
  { key: "lipat", label: "Lipat" },
  { key: "burry", label: "Burry" },
  { key: "bending", label: "Bending" },
  { key: "dirty", label: "Dirty" },
  { key: "kontaminasi", label: "Kontaminasi" },
  { key: "filter_bolong_rusak", label: "Filter Bolong/Rusak" },
  { key: "shinning", label: "Shinning" },
  { key: "silver", label: "Silver" },
  { key: "flow_mark", label: "Flow Mark" },
  { key: "burn_mark", label: "Burn Mark" },
  { key: "sink_mark", label: "Sink Mark" },
  { key: "ejector_mark", label: "Ejector Mark" },
  { key: "gas_mark", label: "Gas Mark" },
  { key: "crack", label: "Crack" },
  { key: "gap", label: "Gap" },
  { key: "dented", label: "Dented" },
  { key: "scratch", label: "Scratch" },
  { key: "flash", label: "Flash" },
  { key: "double_inject", label: "Double Inject" },
  { key: "bubble", label: "Bubble" },
  { key: "gate_long", label: "Gate Long" },
  { key: "gate_hole", label: "Gate Hole" },
  { key: "over_cut", label: "Over Cut" },
  { key: "under_cut", label: "Under Cut" },
  { key: "black_dot", label: "Black Dot" },
  { key: "deform", label: "Deform" },
  { key: "weld_line", label: "Weld Line" },
  { key: "start_up_setting_alarm", label: "Start Up / Setting Alarm" },
];

// Map kode_defect -> column name on inspection_defect_details (for built-in 29 defect types)
export const KODE_TO_COLUMN: Record<string, DefectColumnKey> = {
  SHORT_SHOT: "short_shot",
  LIPAT: "lipat",
  BURRY: "burry",
  BENDING: "bending",
  DIRTY: "dirty",
  KONTAMINASI: "kontaminasi",
  FILTER_BOLONG_RUSAK: "filter_bolong_rusak",
  SHINNING: "shinning",
  SILVER: "silver",
  FLOW_MARK: "flow_mark",
  BURN_MARK: "burn_mark",
  SINK_MARK: "sink_mark",
  EJECTOR_MARK: "ejector_mark",
  GAS_MARK: "gas_mark",
  CRACK: "crack",
  GAP: "gap",
  DENTED: "dented",
  SCRATCH: "scratch",
  FLASH: "flash",
  DOUBLE_INJECT: "double_inject",
  BUBBLE: "bubble",
  GATE_LONG: "gate_long",
  GATE_HOLE: "gate_hole",
  OVER_CUT: "over_cut",
  UNDER_CUT: "under_cut",
  BLACK_DOT: "black_dot",
  DEFORM: "deform",
  WELD_LINE: "weld_line",
  START_UP_ALARM: "start_up_setting_alarm",
};

export function kategoriDefectColor(k: string | null | undefined): string {
  switch (k) {
    case "Proses":
      return "bg-info/15 text-info border-info/30";
    case "Kosmetik":
      return "bg-purple-500/15 text-purple-600 border-purple-500/30";
    case "Dimensi":
      return "bg-warning/20 text-warning-foreground border-warning/40";
    case "Material":
      return "bg-success/15 text-success border-success/30";
    case "Fungsi":
      return "bg-destructive/15 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
