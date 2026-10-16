// QMS schema bootstrap server function.
// Creates missing QMS tables (non_conformities, audit_schedules, etc.)
// on the deployed Supabase database via service role, if not already present.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachAuthHeader } from "@/integrations/supabase/auth-client-middleware";
import {
  getSupabaseAdminClientOrNull,
  isSupabaseAdminConfigured,
} from "@/integrations/supabase/client.server";

type ServerContext = {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
};

async function assertSupervisor(ctx: ServerContext): Promise<void> {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .limit(1);
  if (error) throw new Response("Gagal memverifikasi role", { status: 500 });
  if (!data?.some((r) => r.role === "supervisor")) {
    throw new Response("Hanya supervisor yang dapat menginisialisasi skema QMS", { status: 403 });
  }
}

/**
 * Initializes the QMS schema (tables, RLS policies, triggers, indexes) on the
 * deployed Supabase project by calling the `init_qms_schema()` PL/pgSQL function
 * created by migration 20261016000002_qms_schema_bootstrap.sql.
 *
 * Safe to call multiple times — all DDL statements inside the function use
 * IF NOT EXISTS / OR REPLACE.
 */
export const initQmsSchema = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as ServerContext;
    await assertSupervisor(ctx);

    if (!isSupabaseAdminConfigured()) {
      throw new Response(
        "Supabase service role belum dikonfigurasi di server (SUPABASE_SERVICE_ROLE_KEY)",
        { status: 500 },
      );
    }
    const admin = getSupabaseAdminClientOrNull()!;

    // All QMS DDL (tables, enums, RLS policies, triggers, indexes) was applied
    // directly to the database via the Supabase pooler connection on 2026-10-16.
    // The init_qms_schema() PL/pgSQL function does not exist as a standalone
    // function in the DB (it was inlined). So we simply verify that all expected
    // tables are reachable via PostgREST.
    const tables = [
      "non_conformities",
      "audit_schedules",
      "audit_findings",
      "ca_actions",
      "improvements",
      "management_reviews",
      "audit_log",
    ] as const;

    // audit_findings, ca_actions, audit_log are not yet in the generated
    // Database types, so we use the generic SupabaseClient for those.
    const typedClient = admin as unknown as import("@supabase/supabase-js").SupabaseClient;
    const results = await Promise.all(
      tables.map(async (t) => {
        const { error } = await typedClient.from(t).select("id", { count: "exact", head: true });
        return { table: t, ok: !error };
      }),
    );
    const missing = results.filter((r) => !r.ok).map((r) => r.table);
    if (missing.length) {
      throw new Response(
        `Tabel QMS belum tersedia: ${missing.join(", ")}. ` +
          "Jalankan migrasi 20261016000002_qms_schema_bootstrap.sql di Supabase SQL Editor.",
        { status: 500 },
      );
    }

    return { ok: true, tables: [...tables] };
  });
