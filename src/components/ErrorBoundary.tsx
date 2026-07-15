import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Mail } from "lucide-react";
import { APP_VERSION } from "@/lib/constants";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Custom error handler for logging/reporting */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show error details in development */
  showDevDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId?: string;
  timestamp?: number;
}

interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userAgent?: string;
  url?: string;
}

/**
 * Generate a unique error ID for tracking
 */
function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

/**
 * Log error to console in development
 */
function logErrorToConsole(error: Error, errorInfo?: ErrorInfo): void {
  if (import.meta.env.DEV) {
    console.group(`[ErrorBoundary] Error caught at ${new Date().toISOString()}`);
    console.error("Error:", error);
    if (errorInfo?.componentStack) {
      console.error("Component Stack:", errorInfo.componentStack);
    }
    console.groupEnd();
  }
}

/**
 * Send error report to error tracking service (placeholder)
 */
async function sendErrorReport(report: ErrorReport): Promise<void> {
  // In production, this would send to an error tracking service like Sentry
  if (import.meta.env.PROD) {
    try {
      // Example: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(report) });
      console.log("[ErrorReport]", JSON.stringify(report, null, 2));
    } catch {
      // Silently fail - don't throw in error boundary
    }
  }
}

/**
 * Copy error details to clipboard
 */
function copyErrorDetails(error: Error, errorId: string): void {
  const details = [
    `Error ID: ${errorId}`,
    `Timestamp: ${new Date().toISOString()}`,
    `Version: ${APP_VERSION}`,
    `Message: ${error.message}`,
    error.stack ? `Stack: ${error.stack}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  navigator.clipboard
    .writeText(details)
    .then(() => {
      alert("Detail error berhasil disalin ke clipboard");
    })
    .catch(() => {
      // Fallback: show in prompt
      window.prompt("Detail error:", details);
    });
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
      timestamp: Date.now(),
    } as State;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError } = this.props;

    // Log to console
    logErrorToConsole(error, errorInfo);

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Send error report (async, won't block)
    const report: ErrorReport = {
      errorId: this.state.errorId ?? generateErrorId(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack ?? undefined,
      timestamp: this.state.timestamp ?? Date.now(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      url: typeof window !== "undefined" ? (window.location.href || undefined) : undefined,
    };
    sendErrorReport(report);
  }

  handleRetry = (): void => {
    const { error } = this.state;

    // Log the retry attempt
    if (import.meta.env.DEV) {
      console.log(`[ErrorBoundary] Retrying recovery. Previous error: ${error?.message}`);
    }

    this.setState({ hasError: false, error: null, errorId: undefined, timestamp: undefined });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleCopyError = (): void => {
    const { error, errorId } = this.state;
    if (error && errorId) {
      copyErrorDetails(error, errorId);
    }
  };

  render(): ReactNode {
    const { hasError, error, errorId, timestamp } = this.state;
    const { fallback, showDevDetails = import.meta.env.DEV } = this.props;

    if (hasError) {
      if (fallback) return fallback;

      const formattedDate: string | undefined = timestamp
        ? new Date(timestamp).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : undefined;

      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
          {/* Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Terjadi Kesalahan</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Maaf, terjadi kesalahan yang tidak terduga. Tim kami telah notified tentang masalah ini.
            </p>
          </div>

          {/* Error ID for support */}
          {errorId && (
            <div className="rounded-md border border-border bg-muted/50 px-4 py-2 text-xs">
              <span className="text-muted-foreground">Error ID: </span>
              <code className="font-mono font-medium">{errorId}</code>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Muat Ulang Halaman
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Home className="h-4 w-4" />
              Beranda
            </a>
          </div>

          {/* Error details - expandable */}
          {(showDevDetails || errorId) && (
            <details className="w-full max-w-2xl text-left">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Detail Teknis
              </summary>
              <div className="mt-3 space-y-3">
                {/* Error message */}
                {error && (
                  <div className="rounded-md bg-destructive/5 border border-destructive/20 p-3">
                    <p className="text-sm font-medium text-destructive">{error.message}</p>
                  </div>
                )}

                {/* Technical details */}
                <div className="rounded-md bg-muted p-3">
                  {formattedDate && (
                    <p className="mb-2 text-xs text-muted-foreground">
                      Waktu: {formattedDate}
                    </p>
                  )}
                  {error?.stack && showDevDetails && (
                    <pre className="max-h-48 overflow-auto text-xs text-muted-foreground whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  )}
                </div>

                {/* Copy button */}
                {errorId && (
                  <button
                    onClick={this.handleCopyError}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Salin detail error
                  </button>
                )}
              </div>
            </details>
          )}

          {/* Contact support */}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span>
              Hubungi support dengan menyertakan Error ID jika masalah persists
            </span>
          </div>

          {/* Version info */}
          <p className="text-[10px] text-muted-foreground">v{APP_VERSION}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook version of ErrorBoundary for functional components
 */
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = (err: Error) => {
    setError(err);
    throw err; // Re-throw to trigger ErrorBoundary
  };

  const resetError = () => {
    setError(null);
  };

  return { error, handleError, resetError };
}
