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
