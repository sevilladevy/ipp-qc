/**
 * Rate limiting utilities for authentication endpoints
 * Implements a sliding window rate limiter
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

// In-memory store for rate limiting (server-side)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Configuration for auth rate limiting
 * Can be overridden via environment variables
 */
export const AUTH_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: parseInt(import.meta.env.VITE_RATE_LIMIT_AUTH_MAX ?? "5", 10),
  windowMs: parseInt(import.meta.env.VITE_RATE_LIMIT_AUTH_WINDOW_MS ?? "60000", 10), // 1 minute
};

/**
 * Generate a rate limit key for an identifier (email, IP, etc.)
 */
function getRateLimitKey(identifier: string): string {
  return `auth:${identifier.toLowerCase()}`;
}

/**
 * Check if an identifier has exceeded the rate limit
 */
export function isRateLimited(identifier: string): boolean {
  const key = getRateLimitKey(identifier);
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return false;
  }

  // Check if window has expired
  if (Date.now() > entry.resetAt) {
    rateLimitStore.delete(key);
    return false;
  }

  return entry.count >= AUTH_RATE_LIMIT_CONFIG.maxAttempts;
}

/**
 * Get remaining attempts for an identifier
 */
export function getRemainingAttempts(identifier: string): number {
  const key = getRateLimitKey(identifier);
  const entry = rateLimitStore.get(key);

  if (!entry || Date.now() > entry.resetAt) {
    return AUTH_RATE_LIMIT_CONFIG.maxAttempts;
  }

  return Math.max(0, AUTH_RATE_LIMIT_CONFIG.maxAttempts - entry.count);
}

/**
 * Get time until rate limit resets (in seconds)
 */
export function getRateLimitResetSeconds(identifier: string): number {
  const key = getRateLimitKey(identifier);
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return 0;
  }

  return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
}

/**
 * Record a failed attempt for an identifier
 */
export function recordFailedAttempt(identifier: string): void {
  const key = getRateLimitKey(identifier);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + AUTH_RATE_LIMIT_CONFIG.windowMs,
    });
  } else {
    // Increment existing entry
    entry.count++;
    rateLimitStore.set(key, entry);
  }
}

/**
 * Clear rate limit for an identifier (e.g., after successful login)
 */
export function clearRateLimit(identifier: string): void {
  const key = getRateLimitKey(identifier);
  rateLimitStore.delete(key);
}

/**
 * Clean up expired entries (call periodically in server context)
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get rate limit info for an identifier
 */
export function getRateLimitInfo(identifier: string): {
  isLimited: boolean;
  remaining: number;
  resetIn: number;
  limit: number;
} {
  return {
    isLimited: isRateLimited(identifier),
    remaining: getRemainingAttempts(identifier),
    resetIn: getRateLimitResetSeconds(identifier),
    limit: AUTH_RATE_LIMIT_CONFIG.maxAttempts,
  };
}

/**
 * Server-side rate limit check that throws if limited
 */
export function checkRateLimit(identifier: string): void {
  if (isRateLimited(identifier)) {
    const resetIn = getRateLimitResetSeconds(identifier);
    const message =
      resetIn > 0
        ? `Terlalu banyak percobaan login. Silakan coba lagi dalam ${Math.ceil(resetIn / 60)} menit.`
        : "Terlalu banyak percobaan login. Silakan coba lagi.";

    const error = new Error(message);
    (error as Error & { status?: number }).status = 429;
    throw error;
  }
}
