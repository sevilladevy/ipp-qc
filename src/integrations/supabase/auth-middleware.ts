// Auth middleware
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-side rate limit store (survives across requests, keyed by identifier)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? "5", 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS ?? "60000", 10);

function getRateLimitKey(identifier: string): string {
  return `auth:${identifier.toLowerCase()}`;
}

export function checkServerRateLimit(identifier: string): void {
  const key = getRateLimitKey(identifier);
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() > entry.resetAt) return;
  if (entry.count >= RATE_LIMIT_MAX) {
    const resetIn = Math.ceil((entry.resetAt - Date.now()) / 60000);
    const msg =
      resetIn > 0
        ? `Terlalu banyak percobaan login. Silakan coba lagi dalam ${resetIn} menit.`
        : "Terlalu banyak percobaan login. Silakan coba lagi.";
    const err = new Error(msg) as Error & { status?: number };
    err.status = 429;
    throw err;
  }
}

export function recordServerFailedAttempt(identifier: string): void {
  const key = getRateLimitKey(identifier);
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    rateLimitStore.set(key, { count: entry.count + 1, resetAt: entry.resetAt });
  }
}

export function clearServerRateLimit(identifier: string): void {
  rateLimitStore.delete(getRateLimitKey(identifier));
}

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

    const authHeader = request.headers.get("authorization");

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
