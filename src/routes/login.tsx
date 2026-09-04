import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, rateLimitInfo } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
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
        <div className="ipp-blob ipp-blob-1" />
        <div className="ipp-blob ipp-blob-2" />
        <div className="ipp-blob ipp-blob-3" />
        <div className="ipp-dots" />

        <div className="ipp-left-content">
          <div className="ipp-logo-stage">
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  className="ipp-input"
                />
              </div>
            </div>

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
