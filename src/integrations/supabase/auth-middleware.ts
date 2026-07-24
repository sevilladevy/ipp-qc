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
      console.error("[AUTH] Missing env vars:", { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_PUBLISHABLE_KEY });
      throw new Response("Missing Supabase environment variables.", { status: 500 });
    }

    const request = getRequest();
    if (!request) {
      console.error("[AUTH] No request object");
      throw new Response("No request", { status: 500 });
    }

    const demoUserId = request.headers.get("x-demo-user-id");
    const demoRole = request.headers.get("x-demo-user-role");
    const DEMO_MODE = process.env.VITE_DEMO_MODE === "true";
    const authHeader = request.headers.get("authorization");

    console.log("[AUTH] Request info:", {
      DEMO_MODE,
      hasDemoUserId: !!demoUserId,
      demoRole,
      hasAuthHeader: !!authHeader,
      path: request.url,
    });

    if (DEMO_MODE && demoUserId && (demoRole === "inspector" || demoRole === "supervisor")) {
      const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
      console.log("[AUTH] Demo mode OK, userId:", demoUserId);
      return next({
        context: { supabase, userId: demoUserId, demoMode: true, role: demoRole } as never,
      });
    }

    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("[AUTH] No Bearer token found. DEMO_MODE:", DEMO_MODE);
      throw new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Create client with proper session to ensure RLS context is set
    const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Set the session with the user's token to properly propagate auth context to RLS
    const { data, error: sessionError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: "", // Refresh token not needed for server functions
    });

    if (sessionError) {
      console.error("[AUTH] setSession failed:", sessionError.message);
      throw new Response("Unauthorized: Invalid token", { status: 401 });
    }

    // Verify the user exists
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[AUTH] getUser failed:", userError?.message ?? "No user data");
      throw new Response("Unauthorized: Invalid token", { status: 401 });
    }

    console.log("[AUTH] Auth success, userId:", userData.user.id);
    return next({
      context: { supabase, userId: userData.user.id, demoMode: false } as never,
    });
  },
);
