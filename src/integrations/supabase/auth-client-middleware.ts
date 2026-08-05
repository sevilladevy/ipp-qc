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

  // Normal Supabase auth
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return await next({
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  }).catch(handleRequestError);
});

// Centralized handler for server-function auth failures. An expired or
// invalid Supabase token surfaces as a 401 from the server; clearing the
// stale session and redirecting to login breaks the React Query retry loop
// and returns the user to a clean authenticated state.
async function handleRequestError(error: unknown): Promise<never> {
  if (!isUnauthorizedError(error)) throw error;

  if (typeof window !== "undefined") {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore sign-out failures */
    }
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-")) localStorage.removeItem(key);
    }
    sessionStorage.removeItem("demo_session");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }
  throw error;
}
