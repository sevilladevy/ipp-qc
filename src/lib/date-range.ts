import { format } from "date-fns";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

export function sanitizeDateRange(from?: string, to?: string, now = new Date()) {
  const fallback = todayIso(now);
  const safeFrom = ISO_DATE_RE.test(from ?? "") ? (from as string) : fallback;
  const safeTo = ISO_DATE_RE.test(to ?? "") ? (to as string) : fallback;

  if (safeFrom <= safeTo) return { from: safeFrom, to: safeTo };
  return { from: safeTo, to: safeFrom };
}
