import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachAuthHeader } from "@/integrations/supabase/auth-client-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeDateRange } from "@/lib/date-range";
import { REPORT_COLUMNS } from "@/lib/supabase-queries";
import type { Database } from "@/integrations/supabase/types";

type GetReportsInput = {
  from: string;
  to: string;
  meja?: number;
  part?: string;
  shift?: string;
  inspectorId?: string;
};

export const getReports = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .validator((input: GetReportsInput) => {
    if (!input.from || !input.to) {
      throw new Response("Date range required", { status: 400 });
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as { supabase: SupabaseClient<Database>; userId: string };
    if (!ctx.supabase || !ctx.userId) {
      throw new Response("Invalid auth context", { status: 500 });
    }

    const { from, to } = sanitizeDateRange(data.from, data.to);

    let query = ctx.supabase
      .from("inspection_reports")
      .select(REPORT_COLUMNS)
      .gte("report_date", from)
      .lte("report_date", to)
      .order("report_date", { ascending: true });

    if (data.meja) {
      query = query.eq("no_meja", data.meja);
    }
    if (data.shift) {
      query = query.eq("shift", data.shift);
    }
    if (data.inspectorId) {
      query = query.eq("created_by", data.inspectorId);
    }
    // Note: part filter is case-insensitive substring match, done client-side
    // due to Supabase ILIKE limitations with select()
    query = query.limit(1000);

    const { data: reports, error } = await query;
    if (error) throw new Response(error.message, { status: 500 });

    return { reports: reports ?? [] };
  });
