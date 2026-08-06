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
      throw new Response("Missing Supabase environment variables.", { status: 500 });
    }

    const request = getRequest();
    if (!request) {
      throw new Response("No request", { status: 500 });
    }

    const demoUserId = request.headers.get("x-demo-user-id");
    const demoRole = request.headers.get("x-demo-user-role");
    const DEMO_MODE = process.env.VITE_DEMO_MODE === "true";
    const authHeader = request.headers.get("authorization");

    if (DEMO_MODE && demoUserId && (demoRole === "inspector" || demoRole === "supervisor")) {
      const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!);
      return next({
        context: { supabase, userId: demoUserId, demoMode: true, role: demoRole } as never,
      });
    }

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Response("Unauthorized: Missing authorization header", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Create client with the token directly in the global headers
    // This allows RLS policies to work without needing setSession
    const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify the user using getUser which validates the JWT
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error("[auth-middleware] Token validation failed:", userError?.message);
      throw new Response("Unauthorized: Invalid token", { status: 401 });
    }

    return next({
      context: { supabase, userId: userData.user.id, demoMode: false } as never,
    });
  },
);
