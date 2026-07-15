import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Maps Supabase error codes to HTTP status codes and user-friendly messages
 */
export interface AppError {
  status: number;
  message: string;
  code?: string;
}

/**
 * Known Supabase/PostgreSQL error codes
 */
export const SUPABASE_ERROR_CODES = {
  // PostgreSQL constraint violations
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  NOT_NULL_VIOLATION: "23502",
  CHECK_VIOLATION: "23514",

  // Supabase-specific
  USER_ALREADY_EXISTS: "23505", // Same as unique violation

  // Authentication
  INVALID_CREDENTIALS: "invalid_credentials",
  USER_NOT_FOUND: "user_not_found",
} as const;

/**
 * Maps error codes to user-friendly messages
 */
export function getErrorMessage(error: PostgrestError): string {
  switch (error.code) {
    case SUPABASE_ERROR_CODES.UNIQUE_VIOLATION:
      return "Data duplikat. Record sudah ada sebelumnya.";
    case SUPABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return "Data tidak dapat dihapus karena masih digunakan di tempat lain.";
    case SUPABASE_ERROR_CODES.NOT_NULL_VIOLATION:
      return `Field wajib tidak boleh kosong.`;
    case SUPABASE_ERROR_CODES.CHECK_VIOLATION:
      return "Data tidak memenuhi kondisi validasi.";
    default:
      return error.message;
  }
}

/**
 * Maps error codes to appropriate HTTP status codes
 */
export function getErrorStatus(error: PostgrestError): number {
  switch (error.code) {
    case SUPABASE_ERROR_CODES.UNIQUE_VIOLATION:
      return 409; // Conflict
    case SUPABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return 409;
    case SUPABASE_ERROR_CODES.NOT_NULL_VIOLATION:
      return 400;
    case SUPABASE_ERROR_CODES.CHECK_VIOLATION:
      return 400;
    default:
      return 400;
  }
}

/**
 * Converts a Supabase error to an AppError
 */
export function toAppError(error: PostgrestError): AppError {
  return {
    status: getErrorStatus(error),
    message: getErrorMessage(error),
    code: error.code,
  };
}

/**
 * Creates a Response from a Supabase error
 */
export function supabaseErrorToResponse(error: PostgrestError): Response {
  const appError = toAppError(error);
  return new Response(appError.message, { status: appError.status });
}

/**
 * Safely parses an error, handling both Supabase errors and generic errors
 */
export function parseError(error: unknown): AppError {
  // Check if it's a Supabase PostgrestError
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    const pgError = error as PostgrestError;
    if (typeof pgError.code === "string") {
      return toAppError(pgError);
    }
  }

  // Fallback for other error types
  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: "Terjadi kesalahan yang tidak diketahui",
  };
}
