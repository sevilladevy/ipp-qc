// Auth middleware
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.error("[requireSupabaseAuth] Missing env vars:", { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_PUBLISHABLE_KEY });
      throw new Response("Missing Supabase environment variables.", { status: 500 });
    }

    const request = getRequest();
    if (!request) {
      console.error("[requireSupabaseAuth] No request object");
      throw new Response("No request", { status: 500 });
    }

    const demoUserId = request.headers.get("x-demo-user-id");
    const demoRole = request.headers.get("x-demo-user-role");
    const DEMO_MODE = process.env.VITE_DEMO_MODE === "true";

    console.log("[requireSupabaseAuth] Auth attempt:", { DEMO_MODE, hasDemoUserId: !!demoUserId, demoRole });

    if (DEMO_MODE && demoUserId && (demoRole === "inspector" || demoRole === "supervisor")) {
      const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
      console.log("[requireSupabaseAuth] Using demo mode, userId:", demoUserId);
      return next({
        context: { supabase, userId: demoUserId, demoMode: true, role: demoRole } as never,
      });
    }

    const authHeader = request.headers.get("authorization");
    console.log("[requireSupabaseAuth] Auth header present:", !!authHeader);
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("[requireSupabaseAuth] No Bearer token");
      throw new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getUser(token);
    console.log("[requireSupabaseAuth] getUser result:", { hasUser: !!data?.user, error: error?.message });
    if (error || !data?.user) {
      console.error("[requireSupabaseAuth] Auth failed:", error?.message);
      throw new Response("Unauthorized: Invalid token", { status: 401 });
    }

    console.log("[requireSupabaseAuth] Auth success, userId:", data.user.id);
    return next({ context: { supabase, userId: data.user.id, demoMode: false } as never });
  },
);
