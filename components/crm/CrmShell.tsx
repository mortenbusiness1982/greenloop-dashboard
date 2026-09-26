"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  BrainCircuit,
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
  Trophy,
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

import styles from "./CrmShell.module.css";
import { WorkspaceHeaderTarget } from "./WorkspaceHeader";

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
  | "leaderboards"
  | "rewards"
  | "outreach"
  | "products"
  | "recyclingIntelligence"
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
  | "history"
  | "certificate";

type NavGroupKey = "overview" | "operations" | "network" | "reports" | "workspace" | "brandOperations" | "fulfillment" | "organization";

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
      organization: "Organization Portal",
      user: "GreenLoop",
    },
    roleNames: {
      admin: "Admin",
      brand_admin: "Brand admin",
      partner: "Partner",
      organization: "Organization",
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
      organization: "Organization",
    },
    items: {
      overview: "Overview",
      users: "Users",
      recyclingActivity: "Recycling Activity",
      moderation: "Moderation",
    challenges: "Challenges",
    leaderboards: "Leaderboards",
      rewards: "Rewards",
      outreach: "Outreach",
      products: "Products",
      recyclingIntelligence: "Recycling Intelligence",
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
      certificate: "Certificate",
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
      organization: "Portal de organización",
      user: "GreenLoop",
    },
    roleNames: {
      admin: "Administrador",
      brand_admin: "Admin de marca",
      partner: "Socio",
      organization: "Organización",
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
      organization: "Organización",
    },
    items: {
      overview: "Resumen",
      users: "Usuarios",
      recyclingActivity: "Actividad de reciclaje",
      moderation: "Moderación",
    challenges: "Retos",
    leaderboards: "Clasificaciones",
      rewards: "Recompensas",
      outreach: "Prospección",
      products: "Productos",
      recyclingIntelligence: "Inteligencia de reciclaje",
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
      certificate: "Certificado",
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
        { key: "leaderboards", href: "/admin/leaderboards", icon: Trophy },
        { key: "rewards", href: "/admin/rewards", icon: Gift },
        { key: "outreach", href: "/admin/outreach", icon: Send },
      ],
    },
    {
      key: "network",
      items: [
        { key: "products", href: "/admin/products", icon: Package },
        { key: "recyclingIntelligence", href: "/admin/recycling-intelligence", icon: BrainCircuit },
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
  organization: [
    {
      key: "organization",
      items: [
        { key: "overview", href: "/organization/overview", icon: Home },
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
  if (href === "/admin" || href === "/brand" || href === "/partner" || href === "/organization") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const pathSegmentLabels: Record<DashboardLanguage, Record<string, string>> = {
  en: {
    admin: "admin",
    brand: "brand",
    partner: "partner",
    organization: "organization",
    overview: "overview",
    users: "users",
    activity: "recycling activity",
    moderation: "moderation",
    challenges: "challenges",
    rewards: "rewards",
    outreach: "outreach",
    products: "products",
    "recycling-intelligence": "recycling intelligence",
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
    certificate: "certificate",
  },
  es: {
    admin: "admin",
    brand: "marca",
    partner: "socio",
    organization: "organización",
    overview: "resumen",
    users: "usuarios",
    activity: "actividad de reciclaje",
    moderation: "moderación",
    challenges: "retos",
    rewards: "recompensas",
    outreach: "prospección",
    products: "productos",
    "recycling-intelligence": "inteligencia de reciclaje",
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
    certificate: "certificado",
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
  const [headerTarget, setHeaderTarget] = useState<HTMLDivElement | null>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (sidebarOpen) drawer.current?.showModal();
    else if (drawer.current?.open) drawer.current.close();
  }, [sidebarOpen]);
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

  const sidebar = (mobile = false) => (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Link href={getHomeForRole(session.role)} className={styles.brandLink} onClick={() => setSidebarOpen(false)}>
          <Image src="/greenloop-mark.png" alt="GreenLoop" width={30} height={30} priority unoptimized className="h-[30px] w-[30px] shrink-0" />
          <div className={styles.brandText}><p className="font-semibold">GreenLoop</p><p>{copy.roles[session.role]}</p></div>
        </Link>
        {mobile ? <button type="button" className={styles.icon} onClick={() => setSidebarOpen(false)} aria-label={copy.closeNavigation}><X size={18} /></button> : null}
      </div>
      <nav className={styles.nav} aria-label={copy.roles[session.role]}>
        {groups.map((group) => <div key={group.key} className={styles.group}>
          <div className={styles.groupLabel}>{copy.groups[group.key]}</div>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href) && !groups.some((candidate) => candidate.items.some((other) => other.href.length > item.href.length && isActive(pathname, other.href)));
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={styles.navLink} aria-current={active ? "page" : undefined} title={copy.items[item.key]}>
              <Icon aria-hidden /><span className={styles.navText}>{copy.items[item.key]}</span>
            </Link>;
          })}
        </div>)}
      </nav>
      <footer className={styles.account}>
        <span className={styles.avatar} aria-hidden>{(session.email || "G").slice(0, 1).toUpperCase()}</span>
        <div className={styles.identity}><p title={session.email || copy.signedIn}>{session.email || copy.signedIn}</p><p>{copy.roleNames[session.role]}</p></div>
        <button type="button" onClick={logout} className={styles.icon} aria-label={copy.logout} title={copy.logout}><LogOut size={16} /></button>
      </footer>
    </aside>
  );

  return (
    <WorkspaceHeaderTarget.Provider value={headerTarget}>
      <div className={styles.shell}>
        <div className={styles.desktop}>{sidebar()}</div>
        <dialog ref={drawer} className={styles.dialog} aria-label={copy.openNavigation}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const stops = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex="0"]')).filter(element => element.offsetParent !== null);
            const first = stops[0], last = stops[stops.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }}
          onCancel={() => setSidebarOpen(false)}
          onClose={() => { setSidebarOpen(false); menuButton.current?.focus({ preventScroll: true }); }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const bounds = event.currentTarget.getBoundingClientRect();
              if (event.clientX > bounds.right || event.clientY > bounds.bottom) setSidebarOpen(false);
            }
          }}>
          {sidebar(true)}
        </dialog>
        <div className={styles.content}>
          <header className={styles.bar}>
            <button ref={menuButton} type="button" className={styles.icon + " " + styles.mobileButton} onClick={() => setSidebarOpen(true)} aria-label={copy.openNavigation} aria-expanded={sidebarOpen}><Menu size={20} /></button>
            <Link className={styles.breadcrumb} href={getHomeForRole(session.role)} title={copy.environmentTitle(envLabel)}>{copy.roleNames[session.role]} /</Link>
            <div ref={setHeaderTarget} className={styles.titleSlot} data-fallback={formatPath(pathname, language)} />
            <div className={styles.language} role="group" aria-label={copy.languageLabel} title={copy.languageLabel}>
              <Globe2 size={14} className="ml-1 text-[var(--gl-ink-muted)]" aria-hidden />
              {(["en", "es"] as DashboardLanguage[]).map((option) => <button key={option} type="button" onClick={() => setLanguage(option)} title={option === "en" ? copy.english : copy.spanish} aria-pressed={option === language}>{option.toUpperCase()}</button>)}
            </div>
          </header>
          <main className={styles.main + " crm-workspace"}>{children}</main>
        </div>
      </div>
    </WorkspaceHeaderTarget.Provider>
  );
}
