type FilterLoadEvent = {
  scope: "dashboard" | "analytics";
  signature: string;
  durationMs: number;
  rows: number;
  at: string;
};

type DevObservabilityState = {
  authLockWarnings: number;
  filterLoadEvents: FilterLoadEvent[];
  initialized: boolean;
  originalWarn?: typeof console.warn;
  lastFilterEventKey?: string;
  lastFilterEventAtMs?: number;
};

declare global {
  interface Window {
    __IPP_DEV_OBS__?: DevObservabilityState;
  }
}

function getState() {
  if (typeof window === "undefined") return null;
  if (!window.__IPP_DEV_OBS__) {
    window.__IPP_DEV_OBS__ = {
      authLockWarnings: 0,
      filterLoadEvents: [],
      initialized: false,
    };
  }
  return window.__IPP_DEV_OBS__;
}

export function initDevObservability() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const state = getState();
  if (!state || state.initialized) return;

  const originalWarn = console.warn.bind(console);
  state.originalWarn = originalWarn;
  console.warn = (...args: unknown[]) => {
    const text = args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(" ");

    if (text.includes('Lock "lock:sb-') && text.includes("was not released within 5000ms")) {
      state.authLockWarnings += 1;
      if (state.authLockWarnings === 1 || state.authLockWarnings % 5 === 0) {
        console.info(
          `[dev-observability] Supabase auth lock warning count: ${state.authLockWarnings}`,
        );
      }
    }

    originalWarn(...args);
  };

  state.initialized = true;
}

export function logFilterLoadDuration(
  scope: "dashboard" | "analytics",
  signature: string,
  durationMs: number,
  rows: number,
) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const state = getState();
  if (!state) return;
  const normalizedDuration = Number(durationMs.toFixed(2));

  // Suppress ultra-fast noise that typically comes from Strict Mode or
  // lifecycle churn before real network fetch completes.
  if (normalizedDuration < 25) return;

  const eventKey = `${scope}|${signature}|${rows}`;
  const nowMs = Date.now();
  if (
    state.lastFilterEventKey === eventKey &&
    typeof state.lastFilterEventAtMs === "number" &&
    nowMs - state.lastFilterEventAtMs < 120_000
  ) {
    return;
  }

  const event: FilterLoadEvent = {
    scope,
    signature,
    durationMs: normalizedDuration,
    rows,
    at: new Date().toISOString(),
  };

  state.filterLoadEvents.push(event);
  if (state.filterLoadEvents.length > 50) {
    state.filterLoadEvents = state.filterLoadEvents.slice(-50);
  }
  state.lastFilterEventKey = eventKey;
  state.lastFilterEventAtMs = nowMs;

  console.info(
    `[dev-observability] ${scope} filter load ${event.durationMs}ms | rows=${rows} | ${signature}`,
  );
}
