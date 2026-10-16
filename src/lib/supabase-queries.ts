import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { DEFECT_COLUMNS_QUERY } from "@/lib/format";

const DEFECT_DETAILS_CHUNK_SIZE = 500;

// Dashboard/report summary type - only fields actually queried
export type ReportSummary = {
  id: string;
  report_date: string;
  shift: "A" | "B" | "C";
  no_meja: number;
  part_no: string;
  part_name: string;
  qty_check: number;
  total_ok: number | null;
  total_ng: number;
  created_by: string | null;
  created_at: string;
};

export const REPORT_COLUMNS =
  "id,report_date,shift,no_meja,part_no,part_name,qty_check,total_ok,total_ng,lot_no,created_by,created_at";

export async function fetchDefectDetailsByReportIds(
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
      supabase
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
