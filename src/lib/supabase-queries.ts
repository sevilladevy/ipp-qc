import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import { DEFECT_COLUMNS_QUERY } from "@/lib/format";
import type { ManagementFilters } from "@/lib/management";

const DEFECT_DETAILS_CHUNK_SIZE = 500;

export const REPORT_COLUMNS =
  "id,report_date,shift,no_meja,part_no,part_name,qty_check,total_ok,total_ng,lot_no,jam_mulai,jam_selesai,created_by,created_at";

export function buildReportQueryFilters(filters: ManagementFilters) {
  const conditions: Array<string | [string, string, unknown]> = [];
  if (filters.from) conditions.push(["report_date", "gte", filters.from]);
  if (filters.to) conditions.push(["report_date", "lte", filters.to]);
  if (typeof filters.meja === "number") conditions.push(["no_meja", "eq", filters.meja]);
  if (filters.shift) conditions.push(["shift", "eq", filters.shift]);
  if (filters.inspectorId) conditions.push(["created_by", "eq", filters.inspectorId]);
  return conditions;
}

/**
 * Fetches defect detail rows for a set of report ids.
 *
 * The caller MUST pass its own Supabase client: the authenticated
 * `ctx.supabase` inside server functions, or the browser client inside hooks.
 * This module is shared by both environments, and the browser client
 * (`@/integrations/supabase/client`) is unavailable on the server.
 */
export async function fetchDefectDetailsByReportIds(
  client: SupabaseClient<Database>,
  reportIds: string[],
): Promise<Tables<"inspection_defect_details">[]> {
  const uniqueIds = [...new Set(reportIds)];
  if (!uniqueIds.length) return [];

  const chunks: string[][] = [];
  for (let index = 0; index < uniqueIds.length; index += DEFECT_DETAILS_CHUNK_SIZE) {
    chunks.push(uniqueIds.slice(index, index + DEFECT_DETAILS_CHUNK_SIZE));
  }

  const responses = await Promise.all(
    chunks.map((chunk) =>
      client
        .from("inspection_defect_details")
        .select(`id,report_id,${DEFECT_COLUMNS_QUERY},created_at`)
        .in("report_id", chunk),
    ),
  );

  for (const response of responses) {
    if (response.error) {
      throw response.error;
    }
  }

  return responses.flatMap((response) => response.data ?? []);
}
