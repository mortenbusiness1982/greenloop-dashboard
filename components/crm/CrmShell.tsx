"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardCheck,
  Flag,
  Gift,
  Globe2,
  Home,
  LogOut,
  Map,
  Menu,
  Package,
  Send,
  Settings,
  Store,
  TicketCheck,
  Users,
  X,
} from "lucide-react";
import {
  clearToken,
  DashboardRole,
  getHomeForRole,
  getSession,
  isRouteAllowedForRole,
} from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type NavItem = {
  key: NavItemKey;
  href: string;
  icon: typeof Home;
};

type NavGroup = {
  key: NavGroupKey;
  items: NavItem[];
};

type NavItemKey =
  | "overview"
  | "users"
  | "recyclingActivity"
  | "moderation"
  | "challenges"
  | "rewards"
  | "outreach"
  | "products"
  | "brands"
  | "partners"
  | "binsMaps"
  | "reports"
  | "platformReport"
  | "appAnalytics"
  | "exportCenter"
  | "maps"
  | "settings"
  | "activeRewards"
  | "unlocks"
  | "history";

type NavGroupKey = "overview" | "operations" | "network" | "reports" | "workspace" | "brandOperations" | "fulfillment";

const shellCopy: Record<DashboardLanguage, {
  roles: Record<DashboardRole, string>;
  roleNames: Record<DashboardRole, string>;
  groups: Record<NavGroupKey, string>;
  items: Record<NavItemKey, string>;
  env: Record<string, string>;
  loading: string;
  signedIn: string;
  logout: string;
  openNavigation: string;
  closeNavigation: string;
  closeNavigationOverlay: string;
  languageLabel: string;
  english: string;
  spanish: string;
  environmentTitle: (label: string) => string;
}> = {
  en: {
    roles: {
      admin: "Superadmin CRM",
      brand_admin: "Brand CRM",
      partner: "Partner CRM",
      user: "GreenLoop",
    },
    roleNames: {
      admin: "Admin",
      brand_admin: "Brand admin",
      partner: "Partner",
      user: "User",
    },
    groups: {
      overview: "Overview",
      operations: "Operations",
      network: "Network",
      reports: "Reports",
      workspace: "Workspace",
      brandOperations: "Brand Operations",
      fulfillment: "Fulfillment",
    },
    items: {
      overview: "Overview",
      users: "Users",
      recyclingActivity: "Recycling Activity",
      moderation: "Moderation",
      challenges: "Challenges",
      rewards: "Rewards",
      outreach: "Outreach",
      products: "Products",
      brands: "Brands",
      partners: "Partners",
      binsMaps: "Bins & Maps",
      reports: "Reports",
      platformReport: "Platform Report",
      appAnalytics: "App Analytics",
      exportCenter: "Export Center",
      maps: "Maps",
      settings: "Settings",
      activeRewards: "Active Rewards",
      unlocks: "Unlocks",
      history: "History",
    },
    env: {
      production: "Production",
      preview: "Preview",
      development: "Development",
      local: "Local",
    },
    loading: "Loading GreenLoop workspace...",
    signedIn: "Signed in",
    logout: "Logout",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    closeNavigationOverlay: "Close navigation overlay",
    languageLabel: "Dashboard language",
    english: "English",
    spanish: "Spanish",
    environmentTitle: (label) => `Environment: ${label}`,
  },
  es: {
    roles: {
      admin: "CRM Superadmin",
      brand_admin: "CRM de Marca",
      partner: "CRM de Socio",
      user: "GreenLoop",
    },
    roleNames: {
      admin: "Administrador",
      brand_admin: "Admin de marca",
      partner: "Socio",
      user: "Usuario",
    },
    groups: {
      overview: "Resumen",
      operations: "Operaciones",
      network: "Red",
      reports: "Informes",
      workspace: "Espacio",
      brandOperations: "Operaciones de marca",
      fulfillment: "Canjes",
    },
    items: {
      overview: "Resumen",
      users: "Usuarios",
      recyclingActivity: "Actividad de reciclaje",
      moderation: "Moderación",
      challenges: "Retos",
      rewards: "Recompensas",
      outreach: "Prospección",
      products: "Productos",
      brands: "Marcas",
      partners: "Socios",
      binsMaps: "Contenedores y mapas",
      reports: "Informes",
      platformReport: "Informe de plataforma",
      appAnalytics: "Analítica de app",
      exportCenter: "Centro de exportación",
      maps: "Mapas",
      settings: "Configuración",
      activeRewards: "Recompensas activas",
      unlocks: "Desbloqueos",
      history: "Historial",
    },
    env: {
      production: "Producción",
      preview: "Vista previa",
      development: "Desarrollo",
      local: "Local",
    },
    loading: "Cargando espacio de trabajo GreenLoop...",
    signedIn: "Sesión iniciada",
    logout: "Salir",
    openNavigation: "Abrir navegación",
    closeNavigation: "Cerrar navegación",
    closeNavigationOverlay: "Cerrar panel de navegación",
    languageLabel: "Idioma del dashboard",
    english: "Inglés",
    spanish: "Español",
    environmentTitle: (label) => `Entorno: ${label}`,
  },
};

const navigation: Record<Exclude<DashboardRole, "user">, NavGroup[]> = {
  admin: [
    {
      key: "overview",
      items: [
        { key: "overview", href: "/admin/overview", icon: Home },
      ],
    },
    {
      key: "operations",
      items: [
        { key: "users", href: "/admin/users", icon: Users },
        { key: "recyclingActivity", href: "/admin/activity", icon: Activity },
        { key: "moderation", href: "/admin/moderation", icon: ClipboardCheck },
        { key: "challenges", href: "/admin/challenges", icon: Flag },
        { key: "rewards", href: "/admin/rewards", icon: Gift },
        { key: "outreach", href: "/admin/outreach", icon: Send },
      ],
    },
    {
      key: "network",
      items: [
        { key: "products", href: "/admin/products", icon: Package },
        { key: "brands", href: "/admin/brands", icon: Building2 },
        { key: "partners", href: "/admin/partners", icon: Store },
        { key: "binsMaps", href: "/admin/maps", icon: Map },
      ],
    },
    {
      key: "reports",
      items: [
        { key: "reports", href: "/admin/reports", icon: BarChart3 },
        { key: "platformReport", href: "/admin/reports/platform", icon: Globe2 },
        { key: "appAnalytics", href: "/admin/reports/app-analytics", icon: Activity },
        { key: "exportCenter", href: "/admin/reports/exports", icon: Package },
      ],
    },
  ],
  brand_admin: [
    {
      key: "workspace",
      items: [
        { key: "overview", href: "/brand/overview", icon: Home },
      ],
    },
    {
      key: "brandOperations",
      items: [
        { key: "products", href: "/brand/products", icon: Package },
        { key: "rewards", href: "/brand/rewards", icon: Gift },
        { key: "challenges", href: "/brand/challenges", icon: Flag },
        { key: "reports", href: "/brand/reports", icon: BarChart3 },
        { key: "maps", href: "/brand/maps", icon: Map },
        { key: "settings", href: "/brand/settings", icon: Settings },
      ],
    },
  ],
  partner: [
    {
      key: "fulfillment",
      items: [
        { key: "overview", href: "/partner/overview", icon: Home },
        { key: "activeRewards", href: "/partner/rewards", icon: Gift },
        { key: "unlocks", href: "/partner/unlocks", icon: TicketCheck },
        { key: "history", href: "/partner/history", icon: Activity },
        { key: "settings", href: "/partner/settings", icon: Settings },
      ],
    },
  ],
};

function resolveEnvLabel(language: DashboardLanguage): string {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (!env) return shellCopy[language].env.local;
  return shellCopy[language].env[env] ?? env.charAt(0).toUpperCase() + env.slice(1);
}

function subscribeSession(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("greenloop-auth-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("greenloop-auth-change", onStoreChange);
  };
}

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/brand" || href === "/partner") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const pathSegmentLabels: Record<DashboardLanguage, Record<string, string>> = {
  en: {
    admin: "admin",
    brand: "brand",
    partner: "partner",
    overview: "overview",
    users: "users",
    activity: "recycling activity",
    moderation: "moderation",
    challenges: "challenges",
    rewards: "rewards",
    outreach: "outreach",
    products: "products",
    brands: "brands",
    partners: "partners",
    maps: "maps",
    reports: "reports",
    "app-analytics": "app analytics",
    exports: "export center",
    platform: "platform report",
    settings: "settings",
    unlocks: "unlocks",
    history: "history",
  },
  es: {
    admin: "admin",
    brand: "marca",
    partner: "socio",
    overview: "resumen",
    users: "usuarios",
    activity: "actividad de reciclaje",
    moderation: "moderación",
    challenges: "retos",
    rewards: "recompensas",
    outreach: "prospección",
    products: "productos",
    brands: "marcas",
    partners: "socios",
    maps: "mapas",
    reports: "informes",
    "app-analytics": "analítica de app",
    exports: "centro de exportación",
    platform: "informe de plataforma",
    settings: "configuración",
    unlocks: "desbloqueos",
    history: "historial",
  },
};

function formatPath(pathname: string, language: DashboardLanguage) {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((part) => pathSegmentLabels[language][part] ?? part.replace(/-/g, " "))
    .join(" / ");
}

export function CrmShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage } = useDashboardLanguage();
  const copy = shellCopy[language];
  const [session, setSession] = useState<ReturnType<typeof getSession> | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const envLabel = useMemo(() => resolveEnvLabel(language), [language]);

  useEffect(() => {
    const refreshSession = () => setSession(getSession());
    refreshSession();
    return subscribeSession(refreshSession);
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isRouteAllowedForRole(pathname, session.role)) {
      router.replace(getHomeForRole(session.role));
      return;
    }
  }, [pathname, router, session]);

  const groups = useMemo(() => {
    if (!session || session.role === "user") return [];
    return navigation[session.role];
  }, [session]);

  const logout = () => {
    clearToken();
    router.replace("/login");
  };

  if (session === undefined || !session || session.role === "user") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--gl-bg-cream)] text-sm text-[var(--gl-ink-muted)]">
        {copy.loading}
      </div>
    );
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-[var(--gl-hairline)] bg-[var(--gl-paper)]">
      <div className="flex h-16 items-center justify-between border-b border-[var(--gl-hairline)] px-5">
        <Link href={getHomeForRole(session.role)} className="flex min-w-0 items-center gap-3">
          <Image
            src="/greenloop-mark.png"
            alt="GreenLoop"
            width={36}
            height={36}
            priority
            unoptimized
            className="h-9 w-9 shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--gl-ink)]">GreenLoop</p>
            <p className="flex items-center gap-1.5 text-xs text-[var(--gl-ink-muted)]">
              <span className="truncate">{copy.roles[session.role]}</span>
              <span
                className="inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  background: "var(--gl-green-soft)",
                  borderColor: "var(--gl-hairline)",
                  color: "var(--gl-green-deep)",
                }}
                title={copy.environmentTitle(envLabel)}
              >
                {envLabel}
              </span>
            </p>
          </div>
        </Link>
        <button
          className="rounded-md p-2 text-[var(--gl-ink-muted)] hover:bg-[var(--gl-card-cream)] hover:text-[var(--gl-ink)] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label={copy.closeNavigation}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.key} className="mb-5">
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--gl-ink-muted)]">
              {copy.groups[group.key]}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? ""
                        : "text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)] hover:text-[var(--gl-ink)]"
                    }`}
                    style={
                      active
                        ? {
                            background: "var(--gl-green-soft)",
                            color: "var(--gl-green-deep)",
                          }
                        : undefined
                    }
                    aria-current={active ? "page" : undefined}
                  >
                    {active ? (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                        style={{ background: "var(--gl-green)" }}
                      />
                    ) : null}
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{copy.items[item.key]}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[var(--gl-bg-cream)] text-[var(--gl-ink)]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block">{sidebar}</div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-[var(--gl-green-forest)]/40"
            onClick={() => setSidebarOpen(false)}
            aria-label={copy.closeNavigationOverlay}
          />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--gl-hairline)] bg-[var(--gl-paper)]/95 px-4 backdrop-blur md:gap-6 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-md p-2 text-[var(--gl-ink-muted)] hover:bg-[var(--gl-card-cream)] hover:text-[var(--gl-ink)] lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label={copy.openNavigation}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">
                {copy.roles[session.role]}
              </p>
              <p className="truncate text-sm font-semibold capitalize text-[var(--gl-ink)]">
                {formatPath(pathname, language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div
              className="inline-flex items-center gap-1 rounded-full border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-1 shadow-[0_1px_2px_rgba(20,32,26,0.06)]"
              aria-label={copy.languageLabel}
              title={copy.languageLabel}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--gl-paper)] text-[var(--gl-green-deep)]">
                <Globe2 className="h-3.5 w-3.5" aria-hidden />
              </span>
              {(["en", "es"] as DashboardLanguage[]).map((option) => {
                const active = option === language;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLanguage(option)}
                    className="rounded-full px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition"
                    style={
                      active
                        ? { background: "var(--gl-green)", color: "white", boxShadow: "0 1px 2px rgba(20, 32, 26, 0.12)" }
                        : { color: "var(--gl-ink-muted)" }
                    }
                    title={option === "en" ? copy.english : copy.spanish}
                    aria-pressed={active}
                  >
                    {option.toUpperCase()}
                  </button>
                );
              })}
            </div>
            <div className="hidden text-right sm:block">
              <p className="truncate text-sm font-medium text-[var(--gl-ink)]">
                {session.email || copy.signedIn}
              </p>
              <p className="text-xs capitalize text-[var(--gl-ink-muted)]">
                {copy.roleNames[session.role]}
              </p>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-3 py-2 text-sm font-medium text-[var(--gl-ink)] hover:bg-[var(--gl-card-cream)]"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.logout}</span>
            </button>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
