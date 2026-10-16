import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { nextNcNumber } from "@/lib/qms";

export type NonConformity = Tables<"non_conformities">;
export type NcInsert = TablesInsert<"non_conformities">;
export type NcUpdate = TablesUpdate<"non_conformities">;

export const NC_QUERY_KEY = ["non_conformities"] as const;

// ---------------------------------------------------------------------------
// Graceful handling of "table not yet created on the deployed database" (404).
// The QMS tables are materialised by the `init_qms_schema()` function in
// supabase/migrations/20261016000002_qms_schema_bootstrap.sql. Until that
// migration has been applied, every SELECT against those tables fails with a
// PostgREST 404. Rather than letting React Query's default retry policy spam
// the network/console, detect this specific failure class, log ONE console
// warning, and resolve the query with an empty array.
// ---------------------------------------------------------------------------

function isMissingTableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { code?: string; message?: string };
  // PostgREST "Could not find the relation" error code
  if (e.code === "PGRST204") return true;
  // Defensive: some adapters surface the HTTP status in the message
  if (typeof e.message === "string" && /PGRST204|relation .* does not exist/i.test(e.message))
    return true;
  return false;
}

let warnedMissingTables = false;

function warnOnce(table: string, error: unknown) {
  if (warnedMissingTables) return;
  warnedMissingTables = true;
  console.warn(
    `[QMS] Tabel "${table}" belum tersedia di database (404). ` +
      "Jalankan inisialisasi skema QMS (initQmsSchema) atau migrasi 20261016000002_qms_schema_bootstrap.sql.",
    error,
  );
}

/**
 * Runs a QMS table query; if it fails specifically because the table doesn't
 * exist yet, logs a single warning and returns `[]`. Any other error is
 * rethrown so React Query handles it normally (with its default retry policy).
 */
async function fetchQmsTable<T>(
  table: string,
  run: () => Promise<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const { data, error } = await run();
  if (error) {
    if (isMissingTableError(error)) {
      warnOnce(table, error);
      return [];
    }
    throw error;
  }
  return data ?? [];
}

export function useNonConformities() {
  return useQuery({
    queryKey: NC_QUERY_KEY,
    queryFn: () =>
      fetchQmsTable("non_conformities", async () => {
        const { data, error } = await supabase
          .from("non_conformities")
          .select("*")
          .order("created_at", { ascending: false });
        return { data: data as NonConformity[] | null, error };
      }),
    staleTime: 30_000,
  });
}

export function useQmsProfiles() {
  return useQuery({
    queryKey: ["qms-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,full_name,email");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

async function existingNumbers(prefix: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("non_conformities")
    .select("nc_number")
    .like("nc_number", `${prefix}%`);
  if (error) {
    // Table missing → no existing numbers; safe to treat as an empty list so
    // createNc can still generate a candidate number (the subsequent INSERT
    // will surface the real "table missing" error to the caller).
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data ?? []).map((r) => r.nc_number);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export function useNcMutations() {
  const qc = useQueryClient();

  function invalidate() {
    qc.invalidateQueries({ queryKey: NC_QUERY_KEY });
  }

  async function createNc(
    input: Omit<NcInsert, "nc_number" | "created_by">,
    createdBy: string | null,
  ): Promise<NonConformity> {
    const now = new Date();
    const prefix = `NC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const numbers = await existingNumbers(prefix);
      const nc_number = nextNcNumber(numbers, now.getFullYear(), now.getMonth() + 1);
      const { data, error } = await supabase
        .from("non_conformities")
        .insert({ ...input, nc_number, created_by: createdBy })
        .select("*")
        .single();
      if (!error) {
        invalidate();
        return data as NonConformity;
      }
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
    throw lastError instanceof Error ? lastError : new Error("Gagal membuat NC (duplikat nomor)");
  }

  async function updateNc(id: string, patch: NcUpdate): Promise<NonConformity> {
    const { data, error } = await supabase
      .from("non_conformities")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    invalidate();
    return data as NonConformity;
  }

  async function deleteNc(id: string): Promise<void> {
    const { error } = await supabase.from("non_conformities").delete().eq("id", id);
    if (error) throw error;
    invalidate();
  }

  return { createNc, updateNc, deleteNc, invalidate };
}

export type AuditSchedule = Tables<"audit_schedules">;
export type AuditFinding = Tables<"audit_findings">;
export type AuditScheduleInsert = TablesInsert<"audit_schedules">;
export type AuditScheduleUpdate = TablesUpdate<"audit_schedules">;
export type AuditFindingInsert = TablesInsert<"audit_findings">;
export type AuditFindingUpdate = TablesUpdate<"audit_findings">;

export const AUDIT_QUERY_KEY = ["audit_schedules"] as const;
export const auditFindingsKey = (auditId: string | null) => ["audit_findings", auditId] as const;

export function useAuditSchedules() {
  return useQuery({
    queryKey: AUDIT_QUERY_KEY,
    queryFn: () =>
      fetchQmsTable("audit_schedules", async () => {
        const { data, error } = await supabase
          .from("audit_schedules")
          .select("*")
          .order("planned_date", { ascending: true });
        return { data: data as AuditSchedule[] | null, error };
      }),
    staleTime: 30_000,
  });
}

export function useAuditFindings(auditId: string | null) {
  return useQuery({
    queryKey: auditFindingsKey(auditId),
    queryFn: () =>
      auditId == null
        ? Promise.resolve([] as AuditFinding[])
        : fetchQmsTable("audit_findings", async () => {
            const { data, error } = await supabase
              .from("audit_findings")
              .select("*")
              .eq("audit_id", auditId)
              .order("created_at", { ascending: true });
            return { data: data as AuditFinding[] | null, error };
          }),
    enabled: auditId != null,
    staleTime: 30_000,
  });
}

export function useAuditMutations() {
  const qc = useQueryClient();

  function invalidate(auditId?: string | null) {
    qc.invalidateQueries({ queryKey: AUDIT_QUERY_KEY });
    if (auditId) qc.invalidateQueries({ queryKey: auditFindingsKey(auditId) });
  }

  async function createSchedule(
    input: AuditScheduleInsert,
    createdBy: string | null,
  ): Promise<AuditSchedule> {
    const { data, error } = await supabase
      .from("audit_schedules")
      .insert({ ...input, created_by: createdBy })
      .select("*")
      .single();
    if (error) throw error;
    invalidate();
    return data as AuditSchedule;
  }

  async function updateSchedule(id: string, patch: AuditScheduleUpdate): Promise<AuditSchedule> {
    const { data, error } = await supabase
      .from("audit_schedules")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    invalidate();
    return data as AuditSchedule;
  }

  async function deleteSchedule(id: string): Promise<void> {
    const { error } = await supabase.from("audit_schedules").delete().eq("id", id);
    if (error) throw error;
    invalidate(id);
  }

  async function createFinding(input: AuditFindingInsert): Promise<AuditFinding> {
    const { data, error } = await supabase
      .from("audit_findings")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    invalidate(input.audit_id);
    return data as AuditFinding;
  }

  async function updateFinding(id: string, auditId: string, patch: AuditFindingUpdate) {
    const { data, error } = await supabase
      .from("audit_findings")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    invalidate(auditId);
    return data;
  }

  async function deleteFinding(id: string, auditId: string): Promise<void> {
    const { error } = await supabase.from("audit_findings").delete().eq("id", id);
    if (error) throw error;
    invalidate(auditId);
  }

  return {
    createSchedule,
    updateSchedule,
    deleteSchedule,
    createFinding,
    updateFinding,
    deleteFinding,
    invalidate,
  };
}

export type Improvement = Tables<"improvements">;
export type ImprovementInsert = TablesInsert<"improvements">;
export type ImprovementUpdate = TablesUpdate<"improvements">;
export type ManagementReview = Tables<"management_reviews">;
export type ReviewInsert = TablesInsert<"management_reviews">;
export type ReviewUpdate = TablesUpdate<"management_reviews">;

export const IMPROVEMENT_QUERY_KEY = ["improvements"] as const;
export const REVIEW_QUERY_KEY = ["management_reviews"] as const;

export function useImprovements() {
  return useQuery({
    queryKey: IMPROVEMENT_QUERY_KEY,
    queryFn: () =>
      fetchQmsTable("improvements", async () => {
        const { data, error } = await supabase
          .from("improvements")
          .select("*")
          .order("created_at", { ascending: false });
        return { data: data as Improvement[] | null, error };
      }),
    staleTime: 30_000,
  });
}

export function useManagementReviews() {
  return useQuery({
    queryKey: REVIEW_QUERY_KEY,
    queryFn: () =>
      fetchQmsTable("management_reviews", async () => {
        const { data, error } = await supabase
          .from("management_reviews")
          .select("*")
          .order("review_date", { ascending: false });
        return { data: data as ManagementReview[] | null, error };
      }),
    staleTime: 30_000,
  });
}

export function useImprovementMutations() {
  const qc = useQueryClient();

  function invalidate() {
    qc.invalidateQueries({ queryKey: IMPROVEMENT_QUERY_KEY });
  }

  async function createImprovement(
    input: ImprovementInsert,
    createdBy: string | null,
  ): Promise<Improvement> {
    const { data, error } = await supabase
      .from("improvements")
      .insert({ ...input, created_by: createdBy })
      .select("*")
      .single();
    if (error) throw error;
    invalidate();
    return data as Improvement;
  }

  async function updateImprovement(id: string, patch: ImprovementUpdate): Promise<Improvement> {
    const { data, error } = await supabase
      .from("improvements")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    invalidate();
    return data as Improvement;
  }

  async function deleteImprovement(id: string): Promise<void> {
    const { error } = await supabase.from("improvements").delete().eq("id", id);
    if (error) throw error;
    invalidate();
  }

  return { createImprovement, updateImprovement, deleteImprovement, invalidate };
}

export function useReviewMutations() {
  const qc = useQueryClient();

  function invalidate() {
    qc.invalidateQueries({ queryKey: REVIEW_QUERY_KEY });
  }

  async function createReview(input: ReviewInsert, createdBy: string | null) {
    const { data, error } = await supabase
      .from("management_reviews")
      .insert({ ...input, created_by: createdBy })
      .select("*")
      .single();
    if (error) throw error;
    invalidate();
    return data as ManagementReview;
  }

  async function updateReview(id: string, patch: ReviewUpdate) {
    const { data, error } = await supabase
      .from("management_reviews")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    invalidate();
    return data as ManagementReview;
  }

  async function deleteReview(id: string): Promise<void> {
    const { error } = await supabase.from("management_reviews").delete().eq("id", id);
    if (error) throw error;
    invalidate();
  }

  return { createReview, updateReview, deleteReview, invalidate };
}
