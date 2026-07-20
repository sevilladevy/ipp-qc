import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachAuthHeader } from "@/integrations/supabase/auth-client-middleware";
import {
  getSupabaseAdminClientOrNull,
  isSupabaseAdminConfigured,
  supabaseAdmin,
} from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type AppSupabaseClient = SupabaseClient<Database>;

type ServerContext = {
  supabase: AppSupabaseClient;
  userId: string;
  demoMode?: boolean;
  role?: "inspector" | "supervisor";
};

async function assertSupervisor(ctx: ServerContext) {
  if (ctx.demoMode && ctx.role === "supervisor") return;
  if (ctx.demoMode)
    throw new Response("Hanya supervisor yang bisa mengakses halaman ini", { status: 403 });

  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Response("Gagal memverifikasi role", { status: 500 });
  const isSupervisor = (data ?? []).some((r) => r.role === "supervisor");
  if (!isSupervisor)
    throw new Response("Hanya supervisor yang bisa mengakses halaman ini", { status: 403 });
}

async function listAllAuthUsers() {
  const admin = getSupabaseAdminClientOrNull();
  if (!admin) return [];
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    return data?.users ?? [];
  } catch {
    return [];
  }
}

async function listAppUsers(supabase: AppSupabaseClient) {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, created_at"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (pErr) throw new Response(pErr.message, { status: 500 });
  if (rErr) throw new Response(rErr.message, { status: 500 });

  const rows = new Map<
    string,
    {
      id: string;
      email: string;
      full_name: string | null;
      role: "inspector" | "supervisor";
      created_at: string;
      last_sign_in_at: string | null;
    }
  >();
  for (const p of profiles ?? []) {
    rows.set(p.id, {
      id: p.id,
      email: p.email ?? "",
      full_name: p.full_name,
      role: "inspector",
      created_at: p.created_at,
      last_sign_in_at: null,
    });
  }
  for (const r of roles ?? []) {
    const role = r.role as "inspector" | "supervisor";
    const ex = rows.get(r.user_id);
    if (ex) ex.role = role;
    else
      rows.set(r.user_id, {
        id: r.user_id,
        email: "",
        full_name: null,
        role,
        created_at: new Date(0).toISOString(),
        last_sign_in_at: null,
      });
  }
  return [...rows.values()].sort((a, b) => a.email.localeCompare(b.email));
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as ServerContext;
    await assertSupervisor(ctx);

    if (ctx.demoMode) {
      return {
        total: 1,
        users: [
          {
            id: ctx.userId,
            email: ctx.role === "supervisor" ? "supervisor@demo.com" : "inspector@demo.com",
            full_name: ctx.role === "supervisor" ? "Demo Supervisor" : "Demo Inspector",
            role: ctx.role || "inspector",
            created_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
          },
        ],
      };
    }

    const users = new Map<string, Awaited<ReturnType<typeof listAppUsers>>[number]>();
    try {
      for (const u of await listAppUsers(ctx.supabase)) users.set(u.id, u);
    } catch {
      // ignore app user fetch errors
    }
    try {
      for (const u of await listAllAuthUsers()) {
        const ex = users.get(u.id);
        if (ex) {
          ex.email = u.email ?? ex.email;
          ex.last_sign_in_at = u.last_sign_in_at ?? null;
        } else
          users.set(u.id, {
            id: u.id,
            email: u.email ?? "",
            full_name: (u.user_metadata?.full_name as string) ?? null,
            role: "inspector",
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
          });
      }
    } catch {
      // ignore auth user fetch errors
    }

    const merged = [...users.values()].sort((a, b) =>
      (a.email || a.full_name || a.id).localeCompare(b.email || b.full_name || b.id),
    );
    return { total: merged.length, users: merged };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .inputValidator(
    (input: {
      email: string;
      password: string;
      fullName: string;
      role: "inspector" | "supervisor";
    }) => {
      if (!input.email?.includes("@")) throw new Response("Email tidak valid", { status: 400 });
      if (input.password.length < 6)
        throw new Response("Password minimal 6 karakter", { status: 400 });
      if (!input.fullName?.trim()) throw new Response("Nama lengkap wajib diisi", { status: 400 });
      return input;
    },
  )
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as ServerContext;
    await assertSupervisor(ctx);
    if (ctx.demoMode) throw new Response("Fitur tidak tersedia dalam demo mode", { status: 403 });
    if (!isSupabaseAdminConfigured())
      throw new Response("SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi", { status: 500 });

    console.log("[DEBUG] Creating user:", data.email);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) {
      console.error("[DEBUG] Create error:", error);
      throw new Response(error?.message ?? "Gagal membuat user", { status: 400 });
    }
    console.log("[DEBUG] User created:", created.user.id);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: data.role }, { onConflict: "user_id,role" });
    console.log("[DEBUG] Role upsert:", roleErr);

    return { id: created.user.id };
  });

export const promoteToSupervisor = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input.userId) throw new Response("userId wajib", { status: 400 });
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as ServerContext;
    await assertSupervisor(ctx);
    if (ctx.demoMode) throw new Response("Fitur tidak tersedia dalam demo mode", { status: 403 });
    if (!isSupabaseAdminConfigured())
      throw new Response("SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi", { status: 500 });

    const { data: ex } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .eq("role", "supervisor")
      .maybeSingle();
    if (ex) return { ok: true };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: "supervisor" });
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input.userId) throw new Response("userId wajib", { status: 400 });
    return input;
  })
  .handler(async ({ context, data }) => {
    const ctx = context as unknown as ServerContext;
    await assertSupervisor(ctx);
    if (ctx.demoMode) throw new Response("Fitur tidak tersedia dalam demo mode", { status: 403 });
    if (!isSupabaseAdminConfigured())
      throw new Response("SUPABASE_SERVICE_ROLE_KEY tidak dikonfigurasi", { status: 500 });
    if (data.userId === ctx.userId)
      throw new Response("Tidak bisa hapus akun sendiri", { status: 400 });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Response(error.message, { status: 500 });
    return { ok: true };
  });
