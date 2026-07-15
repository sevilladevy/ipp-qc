import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Cog,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Package,
  PlusSquare,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APP_VERSION, STORAGE_KEYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  supervisorOnly?: boolean;
  children?: { to: string; label: string; icon: typeof Cog }[];
}

const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/input", label: "Input", icon: PlusSquare },
  { to: "/laporan", label: "Laporan", icon: ListChecks },
  { to: "/analitik", label: "Analitik", icon: BarChart3 },
  {
    to: "/master",
    label: "Master",
    icon: Settings,
    supervisorOnly: true,
    children: [
      { to: "/master/users", label: "User Dan Role", icon: Users },
      { to: "/master/meja", label: "Meja Inspeksi", icon: Cog },
      { to: "/master/part", label: "Part Dan Kategori", icon: Package },
      { to: "/master/defect-types", label: "NG Name", icon: AlertTriangle },
    ],
  },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, isSupervisor, signOut } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSidebarCollapsed(window.localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (loading || user) return;
    router.navigate({ to: "/login", replace: true });
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-cyan-50 text-foreground">
      <Sidebar
        isSupervisor={isSupervisor}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar isSupervisor={isSupervisor} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative z-10 flex flex-1 flex-col transition-[padding] duration-200",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-sky-200/70 bg-white/70 px-3 backdrop-blur-lg">
          <button
            className="rounded-md p-1.5 text-slate-600 transition-colors hover:bg-sky-100 hover:text-sky-700 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-sky-700">
              PT. Injeksi Plastik Pasifik
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-[11px] text-slate-600 leading-tight">{user.email}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">
                {isSupervisor ? "Supervisor" : "Inspector"}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:bg-sky-50"
              title="Logout"
            >
              <LogOut className="h-3 w-3" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="relative z-10 flex-1 p-3 pb-16 sm:p-4 lg:pb-4">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-sky-200/70 bg-white/90 backdrop-blur-lg lg:hidden">
        {NAV.filter((item) => !item.supervisorOnly || isSupervisor)
          .slice(0, 5)
          .map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </div>
  );
}

function Sidebar({
  isSupervisor,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  isSupervisor: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "/master": true });
  const showLabels = Boolean(onNavigate) || !collapsed;

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-full flex-col border-r border-sky-300/40 bg-gradient-to-b from-slate-900 via-slate-900 to-sky-950 text-slate-100 transition-[width] duration-200 lg:flex",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center border-b border-sky-400/25",
          showLabels ? "gap-2 px-3" : "justify-center px-2",
        )}
      >
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-sky-300/40 bg-white/15"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand" : "Collapse"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <img src="/Logo.png" alt="IPP" className="h-6 w-6 object-contain" />
        </button>
        {showLabels && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-bold tracking-tight text-cyan-50">IPP</p>
            <p className="text-[9px] uppercase tracking-wider text-cyan-100/70">Daily Report</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
        {NAV.map((item) => {
          if (item.supervisorOnly && !isSupervisor) return null;
          const Icon = item.icon;

          if (item.children) {
            const open = openGroups[item.to];
            return (
              <div key={item.to}>
                <button
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [item.to]: !prev[item.to] }))}
                  title={!showLabels ? item.label : undefined}
                  className={cn(
                    "flex w-full items-center rounded-md py-1.5 text-xs font-medium text-slate-200/90 transition-colors hover:bg-white/12 hover:text-cyan-100",
                    showLabels ? "gap-2 px-2.5" : "justify-center px-2",
                    isActive(item.to) && "bg-cyan-400/20 text-cyan-50",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {showLabels && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
                      />
                    </>
                  )}
                </button>
                {open && showLabels && (
                  <div className="ml-2 mt-0.5 space-y-0.5 border-l border-cyan-400/35 pl-1.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(child.to);
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                            active
                              ? "bg-cyan-400/20 text-cyan-100"
                              : "text-slate-300/80 hover:bg-white/12 hover:text-cyan-100",
                          )}
                        >
                          <ChildIcon className="h-3 w-3" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={!showLabels ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md py-1.5 text-xs font-medium transition-colors",
                showLabels ? "gap-2 px-2.5" : "justify-center px-2",
                active
                  ? "bg-cyan-400/20 text-cyan-50"
                  : "text-slate-200/90 hover:bg-white/12 hover:text-cyan-100",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {showLabels && item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "border-t border-cyan-400/25 text-[9px] uppercase tracking-wider text-cyan-100/55",
          showLabels ? "p-2" : "px-2 py-2 text-center",
        )}
      >
        {showLabels ? `${APP_VERSION} · Compact` : APP_VERSION}
      </div>
    </aside>
  );
}
