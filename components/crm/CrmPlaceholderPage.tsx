import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";

type Workspace = "admin" | "brand" | "partner";

type ModuleInfo = {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  capabilities: string[];
  status: "live" | "planned";
};

const adminModules: Record<string, ModuleInfo> = {
  overview: {
    title: "Superadmin Overview",
    description: "Command center for platform health, KPIs, recent activity, and operational alerts.",
    capabilities: ["High-level KPIs", "Recent platform activity", "Pending moderation", "Top cities and trends"],
    status: "planned",
  },
  users: {
    title: "Users",
    description: "Support workspace for account inspection, wallets, avatar reset, roles, and user history.",
    primaryHref: "/admin/users",
    primaryLabel: "Open live users workspace",
    capabilities: ["Search/filter users", "Manual EcoPoints adjustment", "Avatar reset", "User activity export"],
    status: "live",
  },
  activity: {
    title: "Activity",
    description: "Platform-wide recycling activity, scan diagnostics, date/city/user filters, and exports.",
    primaryHref: "/admin/activity",
    primaryLabel: "Open live activity workspace",
    capabilities: ["Date filters", "City/user filters", "Recycling event table", "Filtered CSV export"],
    status: "live",
  },
  rewards: {
    title: "Reward Engine",
    description: "Full reward creation, editing, placement, unlock support, and reward history.",
    primaryHref: "/admin",
    primaryLabel: "Open current reward manager",
    capabilities: ["Reward table", "Create/edit rewards", "Reward unlock history", "Archive/status workflow"],
    status: "planned",
  },
  challenges: {
    title: "Challenge Manager",
    description: "Global, community, and personal challenge operations with analytics and linked rewards.",
    primaryHref: "/admin",
    primaryLabel: "Open current challenge manager",
    capabilities: ["Challenge table", "Create/edit challenges", "Community shared progress", "Per-user global progress"],
    status: "planned",
  },
  moderation: {
    title: "Moderation",
    description: "Trust and fraud review queue with pending, approved, and rejected recycling events.",
    primaryHref: "/admin/moderation",
    primaryLabel: "Open live moderation queue",
    capabilities: ["Pending/approved/rejected tabs", "Risk signals", "Bulk approve/reject", "Evidence review"],
    status: "live",
  },
  products: {
    title: "Products",
    description: "Product catalog, barcode diagnostics, verification queue, brand assignment, and imports.",
    capabilities: ["Product table", "CSV import", "Verification queue", "Placeholder barcode detection"],
    status: "planned",
  },
  brands: {
    title: "Brands",
    description: "Brand customer management, products, brand admins, campaigns, and scoped analytics.",
    capabilities: ["Brand list/detail", "Assigned products", "Brand admins", "Brand analytics"],
    status: "planned",
  },
  partners: {
    title: "Partners",
    description: "Reward partner management, fulfillment stats, active rewards, and partner notes.",
    capabilities: ["Partner list/detail", "Active rewards", "Unlock history", "Partner status"],
    status: "planned",
  },
  reports: {
    title: "Reports Hub",
    description: "Central report workspace for platform, brand, user, geo, reward, challenge, and exports.",
    primaryHref: "/admin/activity",
    primaryLabel: "Open current platform reports",
    capabilities: ["Platform reports", "Brand reports", "User reports", "Geo reports", "Export center"],
    status: "planned",
  },
  maps: {
    title: "Maps / Geo Intelligence",
    description: "Full-screen recycling heatmap and location intelligence with city/date/product filters.",
    capabilities: ["Recycling heatmap", "City/date filters", "Top locations", "Geo export"],
    status: "planned",
  },
  bins: {
    title: "Bins / Locations",
    description: "Recycling infrastructure data for bin coordinates, types, sources, and verification.",
    capabilities: ["Bin list/map", "Coordinates", "Verification status", "Municipal data support"],
    status: "planned",
  },
  settings: {
    title: "Settings",
    description: "Operational configuration for support, legal links, points defaults, and feature flags.",
    capabilities: ["Support email", "Legal links", "Points configuration", "Feature flags"],
    status: "planned",
  },
  audit: {
    title: "Audit Log",
    description: "Admin change history for sensitive operational actions.",
    capabilities: ["Actor", "Action", "Before/after values", "Affected entity"],
    status: "planned",
  },
};

const brandModules: Record<string, ModuleInfo> = {
  overview: {
    title: "Brand Overview",
    description: "Brand-scoped command center for verified units, engagement, top products, cities, and trends.",
    primaryHref: "/brand",
    primaryLabel: "Open current brand analytics",
    capabilities: ["Verified units", "Engaged consumers", "Top products", "Top cities"],
    status: "planned",
  },
  products: {
    title: "Brand Products",
    description: "Brand-owned product catalog, verification, edits, imports, and catalog exports.",
    primaryHref: "/brand/products",
    primaryLabel: "Open live product workspace",
    capabilities: ["Product table", "Add/edit products", "CSV import", "Catalog download"],
    status: "live",
  },
  rewards: {
    title: "Brand Rewards",
    description: "Brand-related rewards and campaign benefits, scoped to the signed-in brand.",
    capabilities: ["Brand rewards", "Campaign benefits", "No internal notes", "Brand-scoped visibility"],
    status: "planned",
  },
  challenges: {
    title: "Brand Challenges / Campaigns",
    description: "Campaign performance, participants, completion rate, incremental units, and linked rewards.",
    primaryHref: "/brand",
    primaryLabel: "Open current campaign reports",
    capabilities: ["Participants", "Completion rate", "Campaign timeline", "Linked rewards"],
    status: "planned",
  },
  reports: {
    title: "Brand Reports",
    description: "Brand-scoped recycling, campaign, behavior, geo, product, and export reports.",
    primaryHref: "/brand",
    primaryLabel: "Open current reports",
    capabilities: ["Recycling report", "Campaign report", "Behavior report", "Geo report", "Exports"],
    status: "planned",
  },
  maps: {
    title: "Brand Maps",
    description: "Brand-scoped recycling map and geo intelligence.",
    primaryHref: "/brand",
    primaryLabel: "Open current map view",
    capabilities: ["Brand-only events", "City filters", "Geo trends", "Map export"],
    status: "planned",
  },
  settings: {
    title: "Brand Settings",
    description: "Brand profile and account-level configuration.",
    capabilities: ["Brand profile", "Contacts", "Brand admins", "Account settings"],
    status: "planned",
  },
};

const partnerModules: Record<string, ModuleInfo> = {
  overview: {
    title: "Partner Overview",
    description: "Fulfillment command center for active rewards, unlocks, used rewards, and recent activity.",
    primaryHref: "/partner",
    primaryLabel: "Open current partner queue",
    capabilities: ["Active rewards", "Pending unlocks", "Used rewards", "Expired rewards"],
    status: "planned",
  },
  rewards: {
    title: "Active Rewards",
    description: "Rewards assigned to the partner account.",
    primaryHref: "/partner",
    primaryLabel: "Open current reward queue",
    capabilities: ["Assigned rewards", "Reward details", "Fulfillment rules", "Partner-scoped visibility"],
    status: "planned",
  },
  unlocks: {
    title: "Reward Unlocks",
    description: "Active or pending unlocks that need fulfillment support.",
    primaryHref: "/partner",
    primaryLabel: "Open current unlock queue",
    capabilities: ["Pending unlocks", "Promo/link details", "Expiration", "Fulfillment status"],
    status: "planned",
  },
  history: {
    title: "Fulfillment History",
    description: "Used, expired, cancelled, and historical reward activity.",
    primaryHref: "/partner",
    primaryLabel: "Open current history",
    capabilities: ["Used rewards", "Expired rewards", "Cancelled rewards", "Historical fulfillment"],
    status: "planned",
  },
  settings: {
    title: "Partner Settings",
    description: "Partner profile and contact configuration.",
    capabilities: ["Partner profile", "Contacts", "Notification preferences", "Account settings"],
    status: "planned",
  },
};

const moduleMaps = {
  admin: adminModules,
  brand: brandModules,
  partner: partnerModules,
};

function titleFromSegments(workspace: Workspace, segments: string[]) {
  const fallback = segments.length ? segments[segments.length - 1] : "overview";
  return `${workspace} ${fallback}`.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CrmPlaceholderPage({
  workspace,
  segments,
}: {
  workspace: Workspace;
  segments: string[];
}) {
  const root = segments[0] || "overview";
  const moduleInfo = moduleMaps[workspace][root];
  const nestedPath = segments.join(" / ").replace(/-/g, " ");
  const info =
    moduleInfo ||
    ({
      title: titleFromSegments(workspace, segments),
      description: "Reserved CRM workspace for the next phase of GreenLoop back-office coverage.",
      capabilities: ["Dedicated page", "Filters and table space", "Role-scoped data", "Future API wiring"],
      status: "planned",
    } satisfies ModuleInfo);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium capitalize text-slate-600">
              {workspace} / {nestedPath || "overview"}
            </div>
            <h1 className="text-2xl font-semibold text-slate-950">{info.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{info.description}</p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              info.status === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {info.status === "live" ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
            {info.status === "live" ? "Live module" : "Placeholder route"}
          </div>
        </div>

        {info.primaryHref && (
          <Link
            href={info.primaryHref}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {info.primaryLabel || "Open live workspace"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {info.capabilities.map((capability) => (
          <div key={capability} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{capability}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {info.status === "live"
                ? "This capability already exists in the current dashboard flow."
                : "Reserved for the dedicated CRM implementation phase."}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-950">Implementation note</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This route is now part of the CRM information architecture. Backend behavior has not been invented here; the
          next migration step is to move the existing working widgets into this full-page module or wire the required
          inspected endpoint.
        </p>
      </section>
    </div>
  );
}
