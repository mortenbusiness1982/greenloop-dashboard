"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  CircleGauge,
  Download,
  LoaderCircle,
  Play,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type QueueState = "all" | "unclassified" | "processing" | "review" | "rule_missing" | "failed" | "resolved";

type Summary = {
  countryCode: string;
  totalProducts: number;
  scannedProducts: number;
  classified: number;
  verified: number;
  awaitingReview: number;
  unclassified: number;
  processing: number;
  failed: number;
  ruleMissing: number;
  resolvedScannedProducts: number;
  unresolvedScanCount: number;
  coveragePercent: number;
  today: { attempts: number; succeeded: number; failed: number; approximateCostUsd: number };
};

type Settings = {
  automaticProcessingEnabled: boolean;
  dailyAiLimit: number;
  batchSize: number;
  reviewConfidenceThreshold: number;
  reportFrequency: "off" | "daily" | "weekly";
  reportEmail: string | null;
};

type QueueProduct = {
  id: string;
  ean?: string | null;
  name?: string | null;
  brandName?: string | null;
  scanCount: number;
  state: Exclude<QueueState, "all">;
  componentKey?: string | null;
  packagingForm?: string | null;
  materialType?: string | null;
  sourceType?: string | null;
  confidence?: number | null;
  verificationStatus?: string | null;
  imageUrl?: string | null;
  lastEnrichmentStatus?: string | null;
  lastErrorCode?: string | null;
  lastEnrichmentAt?: string | null;
};

const materials = ["pet", "hdpe", "ldpe", "pp", "ps", "plastic", "aluminium", "steel", "metal", "glass", "paper", "cardboard", "composite", "compostable", "other"];
const forms = ["bottle", "can", "jar", "carton", "box", "tray", "wrapper", "bag", "cup", "container", "other"];

const copy = {
  en: {
    eyebrow: "Catalog intelligence",
    title: "Recycling Intelligence",
    description: "Monitor packaging classification, review evidence and control how quickly GreenLoop works through unresolved scanned products.",
    reload: "Reload",
    export: "Download report",
    process: "Process next batch",
    processing: "Processing...",
    coverage: "Resolved guidance",
    classified: "Classified",
    verified: "Verified",
    review: "Awaiting review",
    unknown: "Unclassified",
    failures: "Failed",
    ruleMissing: "Missing rules",
    scannedProducts: "scanned products",
    today: "AI attempts today",
    settings: "Processing controls",
    auto: "Automatic backlog processing",
    autoHelp: "Runs every 15 minutes and prioritizes the most-scanned unresolved products.",
    dailyLimit: "Daily AI limit",
    batchSize: "Batch size",
    threshold: "Review threshold",
    save: "Save controls",
    queue: "Classification queue",
    queueHelp: "Products are ordered by scan impact. AI suggestions remain unverified until reviewed.",
    search: "Search product, barcode or brand",
    tabs: { all: "Needs attention", unclassified: "Unclassified", processing: "Processing", review: "Review", rule_missing: "Rule missing", failed: "Failed", resolved: "Resolved" },
    product: "Product",
    state: "State",
    evidence: "Classification evidence",
    attempts: "Last attempt",
    scans: "Scans",
    actions: "Actions",
    retry: "Retry",
    edit: "Classify / review",
    cancel: "Cancel",
    verify: "Verify classification",
    addRule: "Add rule",
    createRule: "Create verified recycling rule",
    authority: "Official authority",
    sourceUrl: "Official source URL",
    wasteStream: "Waste stream",
    binColor: "Bin color",
    ruleDone: "Recycling rule created.",
    empty: "No products match this queue.",
    loading: "Loading classification queue...",
    loadError: "Unable to load recycling intelligence.",
    saved: "Controls saved.",
    batchDone: (processed: number, classified: number) => `Processed ${processed}; classified ${classified}.`,
    verifiedDone: "Classification verified.",
  },
  es: {
    eyebrow: "Inteligencia de catálogo",
    title: "Inteligencia de reciclaje",
    description: "Supervisa la clasificación de envases, revisa evidencias y controla el procesamiento de productos escaneados sin resolver.",
    reload: "Recargar",
    export: "Descargar informe",
    process: "Procesar siguiente lote",
    processing: "Procesando...",
    coverage: "Guía resuelta",
    classified: "Clasificados",
    verified: "Verificados",
    review: "Pendientes de revisión",
    unknown: "Sin clasificar",
    failures: "Fallidos",
    ruleMissing: "Reglas ausentes",
    scannedProducts: "productos escaneados",
    today: "Intentos de IA hoy",
    settings: "Controles de procesamiento",
    auto: "Procesamiento automático",
    autoHelp: "Se ejecuta cada 15 minutos y prioriza los productos sin resolver más escaneados.",
    dailyLimit: "Límite diario de IA",
    batchSize: "Tamaño del lote",
    threshold: "Umbral de revisión",
    save: "Guardar controles",
    queue: "Cola de clasificación",
    queueHelp: "Los productos se ordenan por impacto. Las sugerencias de IA siguen sin verificar hasta revisarlas.",
    search: "Buscar producto, código o marca",
    tabs: { all: "Requieren atención", unclassified: "Sin clasificar", processing: "Procesando", review: "Revisión", rule_missing: "Falta regla", failed: "Fallidos", resolved: "Resueltos" },
    product: "Producto",
    state: "Estado",
    evidence: "Evidencia de clasificación",
    attempts: "Último intento",
    scans: "Escaneos",
    actions: "Acciones",
    retry: "Reintentar",
    edit: "Clasificar / revisar",
    cancel: "Cancelar",
    verify: "Verificar clasificación",
    addRule: "Añadir regla",
    createRule: "Crear regla de reciclaje verificada",
    authority: "Autoridad oficial",
    sourceUrl: "URL de fuente oficial",
    wasteStream: "Flujo de residuos",
    binColor: "Color del contenedor",
    ruleDone: "Regla de reciclaje creada.",
    empty: "No hay productos en esta cola.",
    loading: "Cargando cola de clasificación...",
    loadError: "No se pudo cargar la inteligencia de reciclaje.",
    saved: "Controles guardados.",
    batchDone: (processed: number, classified: number) => `Procesados ${processed}; clasificados ${classified}.`,
    verifiedDone: "Clasificación verificada.",
  },
} as const;

function formatDate(value: string | null | undefined, language: "en" | "es") {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(language === "es" ? "es-ES" : "en-GB");
}

function StateBadge({ state }: { state: QueueProduct["state"] }) {
  const tones: Record<QueueProduct["state"], string> = {
    unclassified: "bg-slate-100 text-slate-700",
    processing: "bg-blue-50 text-blue-700",
    review: "bg-amber-50 text-amber-800",
    rule_missing: "bg-orange-50 text-orange-800",
    failed: "bg-red-50 text-red-700",
    resolved: "bg-emerald-50 text-emerald-700",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[state]}`}>{state.replace("_", " ")}</span>;
}

export function AdminRecyclingIntelligenceWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const t = copy[language];
  const [summary, setSummary] = useState<Summary | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [products, setProducts] = useState<QueueProduct[]>([]);
  const [status, setStatus] = useState<QueueState>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<QueueProduct | null>(null);
  const [editMaterial, setEditMaterial] = useState("other");
  const [editForm, setEditForm] = useState("other");
  const [ruleProduct, setRuleProduct] = useState<QueueProduct | null>(null);
  const [ruleAuthority, setRuleAuthority] = useState("");
  const [ruleSourceUrl, setRuleSourceUrl] = useState("");
  const [ruleWasteStream, setRuleWasteStream] = useState("light_packaging");
  const [ruleColor, setRuleColor] = useState("yellow");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return router.replace("/login");
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status, countryCode: "ES", limit: "250" });
      if (search.trim()) params.set("search", search.trim());
      const [summaryResult, queueResult] = await Promise.all([
        apiFetch<{ summary: Summary; settings: Settings }>("/admin/recycling-intelligence/summary?countryCode=ES", { token }),
        apiFetch<{ products: QueueProduct[] }>(`/admin/recycling-intelligence/queue?${params}`, { token }),
      ]);
      setSummary(summaryResult.summary);
      setSettings(summaryResult.settings);
      setProducts(queueResult.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [router, search, status, t.loadError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const tabs = useMemo(() => Object.entries(t.tabs) as Array<[QueueState, string]>, [t.tabs]);

  async function runBatch() {
    const token = getToken();
    if (!token || !settings) return;
    setWorking(true);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch<{ result: { processed: number; classified: number } }>("/admin/recycling-intelligence/process", {
        token,
        method: "POST",
        body: { limit: settings.batchSize },
      });
      setNotice(t.batchDone(response.result.processed, response.result.classified));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setWorking(false);
    }
  }

  async function saveSettings() {
    const token = getToken();
    if (!token || !settings) return;
    setWorking(true);
    setError(null);
    try {
      const response = await apiFetch<{ settings: Settings }>("/admin/recycling-intelligence/settings", {
        token,
        method: "PUT",
        body: settings,
      });
      setSettings(response.settings);
      setNotice(t.saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setWorking(false);
    }
  }

  async function retryProduct(product: QueueProduct) {
    const token = getToken();
    if (!token) return;
    setWorking(true);
    setError(null);
    try {
      await apiFetch(`/admin/recycling-intelligence/products/${product.id}/retry`, { token, method: "POST", body: {} });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setWorking(false);
    }
  }

  function openReview(product: QueueProduct) {
    setEditing(product);
    setEditMaterial(product.materialType || "other");
    setEditForm(product.packagingForm || "other");
  }

  async function verifyProduct() {
    const token = getToken();
    if (!token || !editing) return;
    setWorking(true);
    setError(null);
    try {
      await apiFetch(`/admin/recycling-intelligence/products/${editing.id}/components/${editing.componentKey || "primary"}`, {
        token,
        method: "PUT",
        body: {
          componentRole: "primary",
          packagingForm: editForm,
          materialType: editMaterial,
          classificationConfidence: 1,
          verificationStatus: "verified",
          isPrimary: true,
          sourceReference: "admin_dashboard_review",
        },
      });
      setEditing(null);
      setNotice(t.verifiedDone);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setWorking(false);
    }
  }

  async function createRule() {
    const token = getToken();
    if (!token || !ruleProduct?.materialType || !ruleProduct.packagingForm) return;
    setWorking(true);
    setError(null);
    try {
      await apiFetch("/admin/recycling-intelligence/rules", {
        token,
        method: "POST",
        body: {
          countryCode: "ES",
          materialType: ruleProduct.materialType,
          packagingForm: ruleProduct.packagingForm,
          wasteStream: ruleWasteStream,
          containerType: "street_container",
          displayColor: ruleColor,
          conditions: {},
          exclusions: [],
          sourceTier: 1,
          sourceType: "official",
          authority: ruleAuthority,
          sourceUrl: ruleSourceUrl,
          verificationStatus: "verified",
          priority: 100,
        },
      });
      setRuleProduct(null);
      setRuleAuthority("");
      setRuleSourceUrl("");
      setNotice(t.ruleDone);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setWorking(false);
    }
  }

  async function downloadReport() {
    const token = getToken();
    if (!token) return;
    try {
      const blob = await apiFetchBlob("/admin/recycling-intelligence/report.csv?countryCode=ES", { token });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `greenloop-recycling-intelligence-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--gl-green)]">{t.eyebrow}</p>
          <h1 className="text-3xl font-semibold text-[var(--gl-ink)]">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--gl-ink-muted)]">{t.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm font-semibold"><RefreshCw size={16} />{t.reload}</button>
          <button type="button" onClick={() => void downloadReport()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm font-semibold"><Download size={16} />{t.export}</button>
          <button type="button" onClick={() => void runBatch()} disabled={working} className="inline-flex items-center gap-2 rounded-lg bg-[var(--gl-green)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{working ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={16} />}{working ? t.processing : t.process}</button>
        </div>
      </header>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div> : null}

      <section className="rounded-lg border border-[var(--gl-hairline)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-lg bg-[var(--gl-green-soft)] text-[var(--gl-green)]"><CircleGauge size={24} /></span><div><p className="text-sm font-semibold text-[var(--gl-ink-muted)]">{t.coverage}</p><p className="text-3xl font-semibold">{summary?.coveragePercent ?? 0}%</p></div></div>
          <p className="text-sm text-[var(--gl-ink-muted)]">{summary?.resolvedScannedProducts ?? 0} / {summary?.scannedProducts ?? 0} {t.scannedProducts}</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-[var(--gl-green)] transition-[width]" style={{ width: `${Math.min(summary?.coveragePercent ?? 0, 100)}%` }} /></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric icon={BrainCircuit} label={t.classified} value={summary?.classified ?? 0} />
        <Metric icon={ShieldCheck} label={t.verified} value={summary?.verified ?? 0} />
        <Metric icon={CheckCircle2} label={t.review} value={summary?.awaitingReview ?? 0} tone="amber" />
        <Metric icon={Search} label={t.unknown} value={summary?.unclassified ?? 0} />
        <Metric icon={AlertTriangle} label={t.ruleMissing} value={summary?.ruleMissing ?? 0} tone="amber" />
        <Metric icon={AlertTriangle} label={t.failures} value={summary?.failed ?? 0} tone="red" />
      </section>

      <section className="rounded-lg border border-[var(--gl-hairline)] bg-white p-5 shadow-sm">
        <div className="mb-4"><h2 className="text-lg font-semibold">{t.settings}</h2><p className="text-sm text-[var(--gl-ink-muted)]">{t.today}: {summary?.today.attempts ?? 0}{settings ? ` / ${settings.dailyAiLimit}` : ""}</p></div>
        {settings ? <div className="grid gap-4 lg:grid-cols-[minmax(300px,1.7fr)_repeat(2,minmax(140px,1fr))_auto] lg:items-end">
          <label className="flex min-h-16 items-center gap-3 rounded-lg border border-[var(--gl-hairline)] px-4 py-3"><input type="checkbox" checked={settings.automaticProcessingEnabled} onChange={(event) => setSettings({ ...settings, automaticProcessingEnabled: event.target.checked })} className="size-5 accent-[var(--gl-green)]" /><span><span className="block text-sm font-semibold">{t.auto}</span><span className="block text-xs text-[var(--gl-ink-muted)]">{t.autoHelp}</span></span></label>
          <NumberField label={t.dailyLimit} value={settings.dailyAiLimit} min={0} max={5000} onChange={(value) => setSettings({ ...settings, dailyAiLimit: value })} />
          <NumberField label={t.batchSize} value={settings.batchSize} min={1} max={100} onChange={(value) => setSettings({ ...settings, batchSize: value })} />
          <button type="button" onClick={() => void saveSettings()} disabled={working} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--gl-green)] px-4 text-sm font-semibold text-white disabled:opacity-50"><Save size={16} />{t.save}</button>
        </div> : null}
      </section>

      <section className="rounded-lg border border-[var(--gl-hairline)] bg-white shadow-sm">
        <div className="border-b border-[var(--gl-hairline)] p-4"><h2 className="text-lg font-semibold">{t.queue}</h2><p className="text-sm text-[var(--gl-ink-muted)]">{t.queueHelp}</p></div>
        <div className="flex flex-col gap-3 border-b border-[var(--gl-hairline)] p-4">
          <div className="flex flex-wrap gap-2">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setStatus(key)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === key ? "bg-[var(--gl-green)] text-white" : "border border-[var(--gl-hairline)] bg-white text-[var(--gl-ink-soft)]"}`}>{label}</button>)}</div>
          <div className="relative max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gl-ink-muted)]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} className="w-full rounded-lg border border-[var(--gl-hairline)] py-2 pl-9 pr-3 text-sm" /></div>
        </div>
        <div className="overflow-x-auto"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-[var(--gl-card-cream)] text-xs uppercase text-[var(--gl-ink-muted)]"><tr><th className="px-4 py-3">{t.product}</th><th className="px-4 py-3">{t.state}</th><th className="px-4 py-3">{t.evidence}</th><th className="px-4 py-3">{t.attempts}</th><th className="px-4 py-3 text-right">{t.scans}</th><th className="px-4 py-3">{t.actions}</th></tr></thead>
          <tbody>{loading ? <MessageRow text={t.loading} /> : products.length === 0 ? <MessageRow text={t.empty} /> : products.map((product) => <tr key={product.id} className="border-t border-[var(--gl-hairline)] align-top hover:bg-[var(--gl-card-cream)]/70"><td className="px-4 py-3"><p className="font-semibold">{product.name || product.ean || "Unknown"}</p><p className="text-xs text-[var(--gl-ink-muted)]">{product.brandName || "-"} · {product.ean || "-"}</p></td><td className="px-4 py-3"><StateBadge state={product.state} /></td><td className="px-4 py-3"><p className="font-medium">{product.materialType || "-"} {product.packagingForm ? `· ${product.packagingForm}` : ""}</p><p className="text-xs text-[var(--gl-ink-muted)]">{product.sourceType || "No evidence"}{product.confidence != null ? ` · ${Math.round(product.confidence * 100)}%` : ""}</p></td><td className="px-4 py-3"><p>{product.lastEnrichmentStatus || "Never attempted"}</p><p className="text-xs text-[var(--gl-ink-muted)]">{product.lastErrorCode || formatDate(product.lastEnrichmentAt, language)}</p></td><td className="px-4 py-3 text-right font-semibold">{product.scanCount}</td><td className="px-4 py-3"><div className="flex gap-2">{["unclassified", "failed"].includes(product.state) ? <button type="button" disabled={working} onClick={() => void retryProduct(product)} className="rounded-md border border-[var(--gl-hairline)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50">{t.retry}</button> : null}{product.verificationStatus !== "verified" && product.state !== "processing" ? <button type="button" onClick={() => openReview(product)} className="rounded-md bg-[var(--gl-green-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--gl-green-deep)]">{t.edit}</button> : null}{product.state === "rule_missing" ? <button type="button" onClick={() => setRuleProduct(product)} className="rounded-md bg-[var(--gl-amber-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--gl-amber-ink)]">{t.addRule}</button> : null}</div></td></tr>)}</tbody>
        </table></div>
      </section>

      {editing ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"><h2 className="text-xl font-semibold">{editing.name || editing.ean}</h2><p className="mt-1 text-sm text-[var(--gl-ink-muted)]">Confirm or correct the physical packaging. This marks the result as GreenLoop verified.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><SelectField label="Material" value={editMaterial} values={materials} onChange={setEditMaterial} /><SelectField label="Packaging form" value={editForm} values={forms} onChange={setEditForm} /></div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-[var(--gl-hairline)] px-4 py-2 text-sm font-semibold">{t.cancel}</button><button type="button" disabled={working} onClick={() => void verifyProduct()} className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t.verify}</button></div></div></div> : null}
      {ruleProduct ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]"><Waypoints size={20} /></span><div><h2 className="text-xl font-semibold">{t.createRule}</h2><p className="text-sm text-[var(--gl-ink-muted)]">ES · {ruleProduct.materialType} · {ruleProduct.packagingForm}</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><SelectField label={t.wasteStream} value={ruleWasteStream} values={["light_packaging", "glass_packaging", "paper_cardboard", "organics", "residual", "deposit_return", "special_collection"]} onChange={setRuleWasteStream} /><SelectField label={t.binColor} value={ruleColor} values={["yellow", "blue", "green", "brown", "gray", "orange", "red", "white", "other"]} onChange={setRuleColor} /><TextField label={t.authority} value={ruleAuthority} onChange={setRuleAuthority} /><TextField label={t.sourceUrl} value={ruleSourceUrl} onChange={setRuleSourceUrl} type="url" /></div><p className="mt-4 text-xs text-[var(--gl-ink-muted)]">Only create this rule from an official source. It will apply nationally in Spain to this material and packaging form.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setRuleProduct(null)} className="rounded-lg border border-[var(--gl-hairline)] px-4 py-2 text-sm font-semibold">{t.cancel}</button><button type="button" disabled={working || ruleAuthority.trim().length < 2 || !/^https:\/\//i.test(ruleSourceUrl)} onClick={() => void createRule()} className="rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{t.createRule}</button></div></div></div> : null}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "green" }: { icon: typeof BrainCircuit; label: string; value: number; tone?: "green" | "amber" | "red" }) {
  const colors = tone === "red" ? "bg-red-50 text-red-700" : tone === "amber" ? "bg-amber-50 text-amber-800" : "bg-[var(--gl-green-soft)] text-[var(--gl-green)]";
  return <div className="rounded-lg border border-[var(--gl-hairline)] bg-white p-4 shadow-sm"><span className={`grid size-9 place-items-center rounded-lg ${colors}`}><Icon size={19} /></span><p className="mt-3 text-2xl font-semibold">{value.toLocaleString()}</p><p className="text-xs font-semibold text-[var(--gl-ink-muted)]">{label}</p></div>;
}

function NumberField({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return <label className="block text-sm font-semibold"><span className="mb-1.5 block text-[var(--gl-ink-soft)]">{label}</span><input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="h-10 w-full rounded-lg border border-[var(--gl-hairline)] px-3" /></label>;
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold"><span className="mb-1.5 block">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2">{values.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-sm font-semibold"><span className="mb-1.5 block">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-[var(--gl-hairline)] px-3 py-2" /></label>;
}

function MessageRow({ text }: { text: string }) {
  return <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--gl-ink-muted)]">{text}</td></tr>;
}
