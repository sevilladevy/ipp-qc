import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { nextNcNumber } from "@/lib/qms";

export type NonConformity = Tables<"non_conformities">;
export type NcInsert = TablesInsert<"non_conformities">;
export type NcUpdate = TablesUpdate<"non_conformities">;

export const NC_QUERY_KEY = ["non_conformities"] as const;

export function useNonConformities() {
  return useQuery({
    queryKey: NC_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("non_conformities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NonConformity[];
    },
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
  if (error) throw error;
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_schedules")
        .select("*")
        .order("planned_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AuditSchedule[];
    },
    staleTime: 30_000,
  });
}

export function useAuditFindings(auditId: string | null) {
  return useQuery({
    queryKey: auditFindingsKey(auditId),
    queryFn: async () => {
      if (!auditId) return [] as AuditFinding[];
      const { data, error } = await supabase
        .from("audit_findings")
        .select("*")
        .eq("audit_id", auditId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AuditFinding[];
    },
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
    return data as AuditFinding;
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("improvements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Improvement[];
    },
    staleTime: 30_000,
  });
}

export function useManagementReviews() {
  return useQuery({
    queryKey: REVIEW_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("management_reviews")
        .select("*")
        .order("review_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ManagementReview[];
    },
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
