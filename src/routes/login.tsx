import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getRememberedEmail, isSessionOnly, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading: authLoading, signIn, switchAuthStorage, rateLimitInfo } = useAuth();
  const router = useRouter();

  // Bounce already-authenticated users away from the login form.
  useEffect(() => {
    if (!authLoading && user) {
      router.navigate({ to: "/", replace: true });
    }
  }, [authLoading, user, router]);
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Reflect the storage mode the Supabase client actually booted with
  const [remember, setRemember] = useState(() => !isSessionOnly());
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  function handleRememberChange(checked: boolean) {
    // Reboot auth on the new storage immediately (no page reload, no
    // session to migrate while logged out, typed input is preserved).
    setRemember(checked);
    switchAuthStorage(!checked);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    setLoading(true);
    const { error, reloaded } = await signIn(email, password, remember);
    // Session persistence changed: the page reloads with the right
    // storage, so skip toast + navigation (the reload takes over).
    if (reloaded) return;
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Login berhasil");
    router.navigate({ to: "/" });
  }

  return (
    <div className="ipp-root">
      {/* LEFT PANEL */}
      <div className="ipp-left">
        <div className="ipp-blob ipp-blob-1" aria-hidden="true" />
        <div className="ipp-blob ipp-blob-2" aria-hidden="true" />
        <div className="ipp-blob ipp-blob-3" aria-hidden="true" />
        <div className="ipp-dots" aria-hidden="true" />

        <div className="ipp-left-content">
          <div className="ipp-logo-stage" aria-hidden="true">
            <div className="ipp-halo ipp-halo-1" />
            <div className="ipp-halo ipp-halo-2" />
            <div className="ipp-halo ipp-halo-3" />
            <div className="ipp-logo-disc">
              <img src="/Logo.png" alt="IPP Logo" className="ipp-logo-img" />
            </div>
          </div>
          <div className="ipp-brand">
            <h1 className="ipp-brand-name">Injeksi Plastik Pasifik</h1>
            <p className="ipp-brand-tagline">Quality Inspection Daily Report</p>
          </div>
        </div>

        <div className="ipp-left-footer">
          <div className="ipp-status-pip" />
          <span>PT. Injeksi Plastik Pasifik · 2026</span>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="ipp-right">
        <div className="ipp-card">
          <div className="ipp-card-bar" />

          {/* Mobile logo */}
          <div className="ipp-mobile-logo">
            <div className="ipp-logo-disc ipp-logo-disc-sm">
              <img src="/Logo.png" alt="IPP Logo" className="ipp-logo-img-sm" />
            </div>
          </div>

          <div className="ipp-form-eyebrow">Selamat Datang</div>
          <h2 className="ipp-form-title">Akses Sistem</h2>
          <p className="ipp-form-sub">Silakan login untuk mengakses sistem inspeksi kualitas.</p>

          <form onSubmit={handleSubmit} className="ipp-form">
            <div className={`ipp-field ${focused === "email" ? "ipp-focused" : ""}`}>
              <label className="ipp-label" htmlFor="login-email">
                Email Address
              </label>
              <div className="ipp-input-wrap">
                <svg
                  className="ipp-ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  placeholder="inspector@ipp.co.id"
                  autoComplete="email"
                  required
                  className="ipp-input"
                />
              </div>
            </div>

            <div className={`ipp-field ${focused === "password" ? "ipp-focused" : ""}`}>
              <label className="ipp-label" htmlFor="login-password">
                Password
              </label>
              <div className="ipp-input-wrap">
                <svg
                  className="ipp-ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  className="ipp-input has-toggle"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="ipp-eye"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <svg
                      className="ipp-eye-ico"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      className="ipp-eye-ico"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <label className="ipp-remember">
              <input
                id="login-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => handleRememberChange(e.target.checked)}
                className="ipp-checkbox"
              />
              <span>Ingat saya di perangkat ini</span>
            </label>

            {rateLimitInfo && rateLimitInfo.isLimited && (
              <div className="ipp-field">
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  <strong>Terlalu banyak percobaan login.</strong>
                  <p className="mt-1">
                    Sisa percobaan: {rateLimitInfo.remaining}. Coba lagi dalam{" "}
                    {Math.ceil(rateLimitInfo.resetIn / 60)} menit.
                  </p>
                </div>
              </div>
            )}

            {rateLimitInfo && !rateLimitInfo.isLimited && rateLimitInfo.remaining < 3 && (
              <div className="ipp-field">
                <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground">
                  <strong>Peringatan:</strong> Sisa percobaan: {rateLimitInfo.remaining} sebelum
                  terkunci.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (rateLimitInfo?.isLimited ?? false)}
              className="ipp-btn"
            >
              <div className="ipp-btn-shine" />
              <span className="ipp-btn-inner">
                {loading ? (
                  <>
                    <svg className="ipp-spinner" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="31.416"
                        strokeDashoffset="10"
                      />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <span>Masuk Sistem</span>
                    <svg
                      className="ipp-arrow"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="ipp-divider" />
        </div>
      </div>
    </div>
  );
}
