import { createServerFn } from "@tanstack/react-start";
import { attachAuthHeader } from "@/integrations/supabase/auth-client-middleware";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesInsert } from "@/integrations/supabase/types";
import { KODE_TO_COLUMN } from "@/lib/format";
import { toAppError } from "@/lib/errors";

type InputPayload = {
  date: string;
  shift: "A" | "B" | "C";
  noMeja: number;
  partNo: string;
  partName: string;
  lotNo: string;
  qtyCheck: number;
  jamMulai: string;
  jamSelesai: string;
  defects: Record<string, number>;
};

type DefectInsert = TablesInsert<"inspection_defect_details">;
type ReportInsert = TablesInsert<"inspection_reports">;

export const saveInspectionReport = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth] as any)
  .inputValidator((input: InputPayload) => {
    if (!input.date) throw new Response("Tanggal wajib diisi", { status: 400 });
    if (!input.noMeja) throw new Response("Pilih meja inspeksi", { status: 400 });
    if (!input.partNo?.trim()) throw new Response("Part No wajib diisi", { status: 400 });
    if (!input.partName?.trim()) throw new Response("Nama part wajib diisi", { status: 400 });
    if (!input.jamMulai?.trim()) throw new Response("Jam mulai wajib diisi", { status: 400 });
    if (!input.jamSelesai?.trim()) throw new Response("Jam selesai wajib diisi", { status: 400 });
    if (input.qtyCheck <= 0) throw new Response("Qty check harus > 0", { status: 400 });
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const { data: meja, error: mejaError } = await ctx.supabase
      .from("inspection_tables")
      .select("no_meja, status")
      .eq("no_meja", data.noMeja)
      .maybeSingle();

    if (mejaError) {
      const appError = toAppError(mejaError);
      throw new Response(appError.message, { status: appError.status });
    }

    if (!meja) {
      throw new Response("Meja inspeksi tidak ditemukan di master", { status: 400 });
    }

    if (meja.status !== "Aktif") {
      throw new Response("Meja yang dipilih tidak aktif", { status: 400 });
    }

    const { data: part, error: partError } = await ctx.supabase
      .from("parts")
      .select("part_no, part_name, is_active")
      .eq("part_no", data.partNo.trim())
      .maybeSingle();

    if (partError) {
      const appError = toAppError(partError);
      throw new Response(appError.message, { status: appError.status });
    }

    if (!part || !part.is_active) {
      throw new Response("Part tidak ditemukan di master atau tidak aktif", { status: 400 });
    }

    const ng = Object.values(data.defects).reduce((sum, v) => sum + Math.max(0, v || 0), 0);

    if (ng > data.qtyCheck) {
      throw new Response("Total defect tidak boleh melebihi qty check", { status: 400 });
    }

    const reportRow: ReportInsert = {
      report_date: data.date,
      shift: data.shift,
      no_meja: data.noMeja,
      part_no: data.partNo.trim(),
      part_name: part.part_name,
      lot_no: data.lotNo?.trim() || null,
      qty_check: data.qtyCheck,
      total_ng: ng,
      jam_mulai: data.jamMulai,
      jam_selesai: data.jamSelesai,
      created_by: ctx.userId,
    };

    const { data: report, error: reportError } = await ctx.supabase
      .from("inspection_reports")
      .insert(reportRow)
      .select("id")
      .single();

    if (reportError) {
      const appError = toAppError(reportError);
      throw new Response(appError.message, { status: appError.status });
    }

    if (ng <= 0) {
      return { id: report.id };
    }

    const detailRow: DefectInsert = { report_id: report.id, extra_defects: {} };
    const extra: Record<string, number> = {};

    for (const [kodeDefect, rawValue] of Object.entries(data.defects)) {
      const value = Math.max(0, rawValue || 0);
      if (value <= 0) continue;

      const column = KODE_TO_COLUMN[kodeDefect];
      if (column) {
        detailRow[column] = value;
      } else {
        extra[kodeDefect] = value;
      }
    }

    detailRow.extra_defects = extra;

    const { error: detailError } = await ctx.supabase
      .from("inspection_defect_details")
      .insert(detailRow);

    if (!detailError) {
      return { id: report.id };
    }

    // Rollback the report if detail insert failed
    const { error: rollbackError } = await ctx.supabase
      .from("inspection_reports")
      .delete()
      .eq("id", report.id);

    let message = `Penyimpanan dibatalkan karena detail defect gagal: ${detailError.message}.`;
    if (rollbackError) {
      const rollbackAppError = toAppError(rollbackError);
      message = `Gagal menyimpan detail defect dan rollback report gagal: ${rollbackAppError.message}.`;
    }

    throw new Response(message, { status: 500 });
  });

type UpdatePayload = {
  id: string;
  report_date: string;
  shift: "A" | "B" | "C";
  no_meja: number;
  qty_check: number;
  total_ng: number;
  jam_mulai: string;
  jam_selesai: string;
};

export const updateInspectionReport = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth] as any)
  .inputValidator((input: UpdatePayload) => {
    if (!input.id) throw new Response("ID laporan tidak ditemukan", { status: 400 });
    if (!input.report_date) throw new Response("Tanggal wajib diisi", { status: 400 });
    if (!input.shift) throw new Response("Shift wajib diisi", { status: 400 });
    if (!input.no_meja) throw new Response("Meja wajib diisi", { status: 400 });
    if (input.qty_check <= 0) throw new Response("Qty check harus > 0", { status: 400 });
    if (input.total_ng < 0) throw new Response("NG tidak boleh negatif", { status: 400 });
    if (input.total_ng > input.qty_check) {
      throw new Response("NG tidak boleh lebih besar dari Qty Check", { status: 400 });
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const { data: existing } = await ctx.supabase
      .from("inspection_reports")
      .select("id, created_by")
      .eq("id", data.id)
      .maybeSingle();

    if (!existing) {
      throw new Response("Laporan tidak ditemukan", { status: 404 });
    }

    const totalOk = data.qty_check - data.total_ng;

    const { error } = await ctx.supabase
      .from("inspection_reports")
      .update({
        report_date: data.report_date,
        shift: data.shift,
        no_meja: data.no_meja,
        qty_check: data.qty_check,
        total_ok: totalOk,
        total_ng: data.total_ng,
        jam_mulai: data.jam_mulai,
        jam_selesai: data.jam_selesai,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      const appError = toAppError(error);
      throw new Response(appError.message, { status: appError.status });
    }

    return { id: data.id };
  });

export const deleteInspectionReport = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth] as any)
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Response("ID laporan tidak ditemukan", { status: 400 });
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as any;
    const { error: reportError } = await ctx.supabase
      .from("inspection_reports")
      .delete()
      .eq("id", data.id);

    if (reportError) {
      const appError = toAppError(reportError);
      throw new Response(appError.message, { status: appError.status });
    }

    return { id: data.id };
  });
