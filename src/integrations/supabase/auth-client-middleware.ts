// Client-side auth middleware - attaches Supabase token OR demo headers to server requests
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof Response) return error.status === 401;
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status;
    if (status === 401) return true;
    const response = (error as { response?: unknown }).response;
    if (response instanceof Response && response.status === 401) return true;
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      if (message.includes("Unauthorized") || message.includes("401")) return true;
    }
  }
  return false;
}

export const attachAuthHeader = createMiddleware({ type: "function" }).client(async ({ next }) => {
  // Demo headers are only valid when demo mode is enabled (must match the
  // server-side requireSupabaseAuth check). A stale demo_session must never
  // hijack real authenticated requests, otherwise server functions return 401.
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
  if (DEMO_MODE) {
    const demoSessionRaw =
      typeof window !== "undefined" ? sessionStorage.getItem("demo_session") : null;
    if (demoSessionRaw) {
      try {
        const { role } = JSON.parse(demoSessionRaw);
        const demoUserId = `demo-${role}-${Date.now()}`;
        return await next({
          headers: {
            "x-demo-user-id": demoUserId,
            "x-demo-user-role": role,
          },
        }).catch(handleRequestError);
      } catch {
        /* ignore */
      }
    }
  }

  // Normal Supabase auth - try to get and refresh session
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    // If no session or error, send empty headers
    if (error || !session) {
      return next({}).catch(handleRequestError);
    }

    // Check if token is expired
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const isExpired = expiresAt ? now >= expiresAt : false;

    if (isExpired) {
      // Try to refresh the token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError || !refreshData.session) {
        // Refresh failed - clear session and don't send auth header
        console.warn("Session expired and refresh failed:", refreshError?.message);
        return next({}).catch(handleRequestError);
      }

      return next({
        headers: { Authorization: `Bearer ${refreshData.session.access_token}` },
      }).catch(handleRequestError);
    }

    // Token is still valid
    return next({
      headers: session.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    }).catch(handleRequestError);
  } catch (e) {
    console.error("Auth attach error:", e);
    return next({}).catch(handleRequestError);
  }
});

// Centralized handler for server-function auth failures. An expired or
// invalid Supabase token surfaces as a 401 from the server; clearing the
// stale session and redirecting to login breaks the React Query retry loop
// and returns the user to a clean authenticated state.
async function handleRequestError(error: unknown): Promise<never> {
  const unauthorized = isUnauthorizedError(error);

  if (typeof window !== "undefined") {
    console.error("[auth-middleware] server request rejected", {
      unauthorized,
      name: (error as { name?: unknown })?.name,
      message: (error as { message?: unknown })?.message,
      httpStatus: (error as { status?: unknown })?.status,
    });
  }

  if (!unauthorized) {
    if (typeof window !== "undefined") {
      console.error("[auth-middleware] non-auth error — rethrowing");
    }
    throw error;
  }

  // Handle 401 - redirect to login
  if (typeof window !== "undefined") {
    // Clear all local auth data (both storages for remember-me support)
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of Object.keys(storage)) {
        if (key.startsWith("sb-")) storage.removeItem(key);
      }
    }
    sessionStorage.removeItem("demo_session");
    // Sign out is fire-and-forget (can fail if token already invalid)
    void supabase.auth.signOut().catch(() => {});
    // Redirect to login if not already there
    if (!window.location.pathname.startsWith("/login")) {
      console.error("[auth-middleware] redirecting to /login");
      window.location.assign("/login?session=expired");
    }
  }
  throw error;
}
