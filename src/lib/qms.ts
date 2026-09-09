export type NcStatus = "open" | "in_progress" | "verified" | "closed";
export type NcSeverity = "minor" | "major" | "critical" | "observation";

export const NC_STATUSES: NcStatus[] = ["open", "in_progress", "verified", "closed"];
export const NC_SEVERITIES: NcSeverity[] = ["minor", "major", "critical", "observation"];

/** Root-cause categories (6M) sesuai kolom non_conformities.root_cause_category. */
export const ROOT_CAUSE_CATEGORIES = [
  "man",
  "machine",
  "material",
  "method",
  "measurement",
  "environment",
] as const;
export type RootCauseCategory = (typeof ROOT_CAUSE_CATEGORIES)[number];

export const NC_STATUS_LABEL: Record<NcStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  verified: "Verified",
  closed: "Closed",
};

export const NC_SEVERITY_LABEL: Record<NcSeverity, string> = {
  minor: "Minor",
  major: "Major",
  critical: "Critical",
  observation: "Observation",
};

export type BadgeVariant = "default" | "info" | "success" | "warning" | "destructive";
export function ncStatusVariant(status: NcStatus): BadgeVariant {
  switch (status) {
    case "open":
      return "destructive";
    case "in_progress":
      return "warning";
    case "verified":
      return "info";
    case "closed":
      return "success";
  }
}

export function ncSeverityVariant(severity: NcSeverity): BadgeVariant {
  switch (severity) {
    case "critical":
      return "destructive";
    case "major":
      return "warning";
    case "minor":
      return "info";
    case "observation":
      return "default";
  }
}

/** Format nomor NC: NC-YYYYMM-### (contoh: NC-202609-001). */
export function buildNcNumber(year: number, month: number, seq: number): string {
  return `NC-${year}${String(month).padStart(2, "0")}-${String(seq).padStart(3, "0")}`;
}

/** Ambil nomor urut dari nc_number untuk prefix periode tertentu. */
export function parseNcSeq(ncNumber: string, prefix: string): number | null {
  if (!ncNumber.startsWith(`${prefix}-`)) return null;
  const seq = Number(ncNumber.slice(prefix.length + 1));
  return Number.isInteger(seq) && seq > 0 ? seq : null;
}

/** Tentukan nomor NC berikutnya dari daftar nomor yang sudah ada. */
export function nextNcNumber(existing: string[], year: number, month: number): string {
  const prefix = `NC-${year}${String(month).padStart(2, "0")}`;
  let max = 0;
  for (const n of existing) {
    const seq = parseNcSeq(n, prefix);
    if (seq !== null && seq > max) max = seq;
  }
  return buildNcNumber(year, month, max + 1);
}

export type AuditType = "internal" | "external" | "supplier";
export type AuditStatus = "planned" | "in_progress" | "completed" | "overdue";

export const AUDIT_TYPES: AuditType[] = ["internal", "external", "supplier"];
export const AUDIT_STATUSES: AuditStatus[] = ["planned", "in_progress", "completed", "overdue"];

export const AUDIT_TYPE_LABEL: Record<AuditType, string> = {
  internal: "Internal",
  external: "Eksternal",
  supplier: "Supplier",
};

export const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

export function auditStatusVariant(status: AuditStatus): BadgeVariant {
  switch (status) {
    case "planned":
      return "info";
    case "in_progress":
      return "warning";
    case "completed":
      return "success";
    case "overdue":
      return "destructive";
  }
}

/** Overdue turunan: planned_date lewat dan status belum completed. */
export function isAuditOverdue(plannedDate: string, status: AuditStatus, today: string): boolean {
  return status !== "completed" && plannedDate < today;
}

export type ChecklistItem = {
  id: string;
  text: string;
  clause: string;
  done: boolean;
  note: string;
};

export type AuditChecklist = {
  items: ChecklistItem[];
};

export function parseChecklist(raw: unknown): AuditChecklist {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { items: [] };
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return { items: [] };
  return {
    items: items
      .filter(
        (it): it is Record<string, unknown> =>
          typeof it === "object" && it !== null && !Array.isArray(it),
      )
      .map((it) => ({
        id: typeof it.id === "string" ? it.id : `${Date.now()}-${Math.random()}`,
        text: typeof it.text === "string" ? it.text : "",
        clause: typeof it.clause === "string" ? it.clause : "",
        done: it.done === true,
        note: typeof it.note === "string" ? it.note : "",
      }))
      .filter((it) => it.text.trim() !== ""),
  };
}

export function toggleChecklistItem(checklist: AuditChecklist, id: string): AuditChecklist {
  return {
    items: checklist.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
  };
}

export function removeChecklistItem(checklist: AuditChecklist, id: string): AuditChecklist {
  return { items: checklist.items.filter((it) => it.id !== id) };
}

export type ImprovementStatus = "proposed" | "approved" | "in_progress" | "completed" | "cancelled";
export type ImprovementCategory = "quality" | "process" | "safety" | "efficiency" | "other";
export type ReviewStatus = "draft" | "completed";

export const IMPROVEMENT_STATUSES: ImprovementStatus[] = [
  "proposed",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
];
export const IMPROVEMENT_CATEGORIES: ImprovementCategory[] = [
  "quality",
  "process",
  "safety",
  "efficiency",
  "other",
];
export const REVIEW_STATUSES: ReviewStatus[] = ["draft", "completed"];

export const IMPROVEMENT_STATUS_LABEL: Record<ImprovementStatus, string> = {
  proposed: "Proposed",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const IMPROVEMENT_CATEGORY_LABEL: Record<ImprovementCategory, string> = {
  quality: "Quality",
  process: "Process",
  safety: "Safety",
  efficiency: "Efficiency",
  other: "Other",
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  draft: "Draft",
  completed: "Completed",
};

export function improvementStatusVariant(status: ImprovementStatus): BadgeVariant {
  switch (status) {
    case "proposed":
      return "info";
    case "approved":
      return "default";
    case "in_progress":
      return "warning";
    case "completed":
      return "success";
    case "cancelled":
      return "destructive";
  }
}

/** Parse kolom JSONB list-string (attendees, decisions, action_items). */
export function parseStringList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

/** Ubah textarea satu-baris-per-item menjadi array untuk kolom JSONB. */
export function linesToList(text: string): string[] {
  return parseStringList(text);
}

export type CaPriority = "low" | "medium" | "high" | "critical";

export const CA_PRIORITIES: CaPriority[] = ["low", "medium", "high", "critical"];

export const CA_PRIORITY_LABEL: Record<CaPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};
