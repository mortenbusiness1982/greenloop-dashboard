"use client";
import {queueNeed} from '@/lib/packagingReview';

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { apiFetch, apiFetchBlob } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useDashboardLanguage } from "@/components/crm/DashboardLanguage";
import { createRefreshController, RefreshState } from "@/lib/refreshController";
import {
  HistoryPage,
  RunRecord,
  ProductOutcome,
  validateHistory,
} from "@/lib/curationMonitoring";

import { CurationReviewDialog } from './CurationReviewDialog';
import { EvidenceThumbnail } from "./EvidenceThumbnail";
import { ReviewTarget, reviewState, reviewLabels, usefulName, compactCounts, catalogueProgress, CatalogueSummary } from '@/lib/curationReview';

type QueueProduct = {
  id: string;
  ean: string;
  name: string | null;
  brandName: string | null;
  scanCount: number;
  state: string;
  materialType: string | null;
  packagingForm: string | null;
  verificationStatus: string | null;
  lastErrorCode: string | null;
};
type QueuePage = { products: QueueProduct[]; nextOffset: number | null };
const copy = {
  en: {
    title: "Recycling Intelligence",
    description:
      "Photos, packaging and catalogue progress.",
    latest: "Latest batch",
    history: "Batch history",
    all: "See all",
    back: "Back",
    refresh: "Refresh data",
    refreshing: "Refreshing…",
    updated: "Updated",
    stale: "Refresh failed. Showing the last available data.",
    waiting: "No successful refresh yet",
    empty: "No routine batches recorded yet.",
    unavailable:
      "Run outcomes have not been reported. Counts and findings are unavailable.",
    reserved: "Reserved",
    attempted: "Attempted",
    inspected: "Products visually reviewed",
    unknown: "unknown",
    published: "Published",
    staged: "Staged proposals",
    deferred: "Deferred",
    failed: "Failed",
    contribution: "User contributions",
    catalogue: "Catalogue",
    skipped: "Unchanged cases skipped",
    start: "Started",
    end: "Ended",
    notRecorded: "Not recorded",
    products: "Products and findings",
    reasonMissing: "No finding recorded yet.",
    scope:
      "Publication covers reviewed packaging components only. Catalogue improvements remain staged until separately approved for production.",
    queue: "Product review queue",
    queueScope:
      "This legacy queue describes primary packaging and pending evidence. Its state is not whole-product coverage and does not count every secondary-component publication.",
    search: "Search product, barcode or brand",
    details: "Details",
    more: "More options",
    export: "Export legacy queue",
    previous: "Previous page",
    next: "Next page",
    queueEmpty: "No products match these filters.",
    loading: "Loading…",
    filter: "Product status",
    scans: "Scans",
    noPhoto: "No photo inspection recorded",
    source: "Source",
    gaps: "Gaps",
    routine: "Routine batch",
    timeZone: "Europe/Madrid",
    allStates: "Needs attention",
  },
  es: {
    title: "Inteligencia de reciclaje",
    description:
      "Fotos, envases y progreso del catálogo.",
    latest: "Último lote",
    history: "Historial de lotes",
    all: "Ver todo",
    back: "Volver",
    refresh: "Actualizar datos",
    refreshing: "Actualizando…",
    updated: "Actualizado",
    stale: "Falló la actualización. Se muestran los últimos datos disponibles.",
    waiting: "Todavía no hay una actualización correcta",
    empty: "Aún no hay lotes rutinarios registrados.",
    unavailable:
      "No se han comunicado los resultados del lote. Los recuentos y hallazgos no están disponibles.",
    reserved: "Reservados",
    attempted: "Intentados",
    inspected: "Productos revisados visualmente",
    unknown: "sin datos",
    published: "Publicados",
    staged: "Propuestas preparadas",
    deferred: "Aplazados",
    failed: "Fallidos",
    contribution: "Aportaciones de usuarios",
    catalogue: "Catálogo",
    skipped: "Casos sin cambios omitidos",
    start: "Inicio",
    end: "Fin",
    notRecorded: "Sin registrar",
    products: "Productos y hallazgos",
    reasonMissing: "Aún no hay un hallazgo registrado.",
    scope:
      "La publicación cubre solo los componentes del envase revisados. Las mejoras del catálogo quedan preparadas hasta una aprobación independiente para producción.",
    queue: "Cola de revisión de productos",
    queueScope:
      "Esta cola anterior describe el envase principal y las evidencias pendientes. Su estado no representa todo el producto ni cuenta todas las publicaciones de componentes secundarios.",
    search: "Buscar producto, código o marca",
    details: "Detalles",
    more: "Más opciones",
    export: "Exportar cola anterior",
    previous: "Página anterior",
    next: "Página siguiente",
    queueEmpty: "No hay productos con estos filtros.",
    loading: "Cargando…",
    filter: "Estado del producto",
    scans: "Escaneos",
    noPhoto: "No se ha registrado inspección de fotos",
    source: "Fuente",
    gaps: "Carencias",
    routine: "Lote rutinario",
    timeZone: "Europe/Madrid",
    allStates: "Requieren atención",
  },
};
const labels: Record<string, [string, string]> = {
  unknown: ["Not recorded", "Sin registrar"],
  selecting: ["Selecting", "Seleccionando"],
  review: ["Under review", "En revisión"],
  recovered_review: ["Recovered review", "Revisión recuperada"],
  blocked: ["Needs attention", "Requiere atención"],
  failed: ["Failed", "Fallido"],
  complete: ["Complete", "Completo"],
  complete_with_exceptions: [
    "Complete with exceptions",
    "Completo con excepciones",
  ],
  partial_complete: ["Partially complete", "Parcialmente completo"],
  failed_deferred: ["Deferred after failure", "Aplazado tras un fallo"],
  reserved: ["Reserved", "Reservado"],
  uncertain: ["Uncertain", "Incierto"],
  rejected: ["Rejected", "Rechazado"],
  staged: ["Staged locally", "Preparado localmente"],
  proposed_not_published: ["Proposed, unpublished", "Propuesto, sin publicar"],
  published: ["Published", "Publicado"],
  deferred: ["Deferred", "Aplazado"],
  revoked: ["Revoked", "Revocado"],
  unclassified: ["Unclassified", "Sin clasificar"],
  processing: ["Processing", "Procesando"],
  rule_missing: ["Rule missing", "Falta regla"],
  resolved: ["Resolved (primary)", "Resuelto (principal)"],
  name: ["Name", "Nombre"],
  brand: ["Brand", "Marca"],
  photo_missing: ["Missing photo", "Falta foto"],
  photo_unreviewed: ["Unreviewed photo", "Foto sin revisar"],
  photo_age_review: ["Older photo review", "Revisar foto antigua"],
  packaging: ["Packaging", "Envase"],
  bin_guidance: ["Local guidance", "Guía local"],
};

function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<RefreshState>({
    refreshing: false,
    error: null,
    lastUpdated: null,
  });
  const controller = useRef<ReturnType<
    typeof createRefreshController<T>
  > | null>(null);
  useEffect(() => {
    const c = createRefreshController(
      load,
      setData,
      (s) =>
        setState((old) => ({
          ...s,
          lastUpdated: s.lastUpdated ?? old.lastUpdated,
        })),
      { window, document },
    );
    controller.current = c;
    void c.refresh();
    return () => c.dispose();
  }, [load]);
  return { data, state, refresh: () => controller.current?.refresh() };
}
async function read<T>(path: string, signal: AbortSignal) {
  const token = getToken();
  if (!token) throw Error("Sign in required / Inicia sesión");
  return apiFetch<T>(path, { token, signal, cache: "no-store" });
}

export function AdminRecyclingIntelligenceWorkspace() {
  const { language } = useDashboardLanguage();
  const t = copy[language];
  const reviewOpener=useRef<HTMLElement|null>(null);
  function openReview(target:ReviewTarget){reviewOpener.current=document.activeElement as HTMLElement;setReviewTarget(target);}
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget|null>(null);
  const loadSummary = useCallback(async (signal:AbortSignal) => {
    const value=await read<{summary:CatalogueSummary}>('/admin/recycling-intelligence/summary?countryCode=ES',signal);
    return catalogueProgress(value.summary);
  },[]);
  const summary=useResource(loadSummary);
  const label = (s: string) => labels[s]?.[language === "es" ? 1 : 0] || s;
  const format = (value: string | number | null) =>
    value
      ? new Intl.DateTimeFormat(language === "es" ? "es-ES" : "en-GB", {
          dateStyle: "medium",
          timeStyle: "medium",
          timeZone: "Europe/Madrid",
        }).format(new Date(value))
      : t.notRecorded;
  const [historyOpen, setHistoryOpen] = useState(false),
    [selected, setSelected] = useState<RunRecord | null>(null),
    [cursor, setCursor] = useState<string | null>(null),
    [previous, setPrevious] = useState<(string | null)[]>([]);
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [offset, setOffset] = useState(0),
    [exportError, setExportError] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const loadHistory = useCallback(
    async (signal: AbortSignal) => ({
      ...validateHistory(
        await read<HistoryPage>(
          "/admin/recycling-intelligence/runs?limit=20" +
            (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
          signal,
        ),
      ),
      dataCursor: cursor,
      fetchedAt: Date.now(),
    }),
    [cursor],
  );
  const history = useResource(loadHistory);
  const loadQueue = useCallback(
    (signal: AbortSignal) =>
      read<QueuePage>(
        "/admin/recycling-intelligence/queue?" +
          new URLSearchParams({
            monitoring: "1",
            countryCode: "ES",
            limit: "50",
            offset: String(offset),
            status: filter,
            search: query,
          }),
        signal,
      ),
    [offset, filter, query],
  );
  const queue = useResource(loadQueue);
  const [latestUpdated, setLatestUpdated] = useState<number | null>(null);
  const [latest, setLatest] = useState<RunRecord | null>(null);
  useEffect(() => {
    if (history.data?.dataCursor === null) {
      setLatest(history.data.runs[0] || null);
      setLatestUpdated(history.data.fetchedAt);
    }
  }, [history.data]);
  const activeSelected = selected
    ? history.data?.runs.find((r) => r.runId === selected.runId) || selected
    : null;
  const busy = history.state.refreshing || queue.state.refreshing;
  const refresh = () => {
    void history.refresh();
    void queue.refresh();
    void summary.refresh();
  };
  function openHistory() {
    setHistoryOpen(true);
    setSelected(null);
  }
  function closeHistory() {
    setHistoryOpen(false);
    setSelected(null);
    setCursor(null);
    setPrevious([]);
  }
  async function exportQueue() {
    try {
      const token = getToken();
      if (!token) throw Error("Sign in required / Inicia sesión");
      const blob = await apiFetchBlob(
        "/admin/recycling-intelligence/report.csv?countryCode=ES",
        { token },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "greenloop-legacy-queue.csv";
      a.click();
      URL.revokeObjectURL(url);
      setExportError(null);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    }
  }
  function freshness(state: RefreshState) {
    return (
      <div className="text-xs text-slate-500" aria-live="polite">
        {state.refreshing
          ? t.refreshing
          : state.lastUpdated
            ? `${t.updated}: ${format(state.lastUpdated)} · ${t.timeZone}`
            : t.waiting}
        {state.error ? (
          <p role="alert" className="mt-1 text-red-700">
            {t.stale} {state.error}
          </p>
        ) : null}
      </div>
    );
  }
  function rows(products: ProductOutcome[], runId:string, compact = false) {
    return <ul className="divide-y divide-slate-100">{products.map(p=><li key={p.barcode}>
      <button onClick={()=>openReview({barcode:p.barcode,runId,outcome:p})} className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50">
        <span className="min-w-0"><strong className="block break-words text-sm">{usefulName(p.name,p.barcode)|| (language==='es'?'Producto sin identificar':'Unidentified product')}</strong>
        <span className="mt-1 block text-xs text-slate-500">{p.barcode}</span>
        <span className="mt-1 block text-sm text-amber-800">{reviewLabels[language][reviewState(p)]}</span>
        {!compact?<span className="mt-1 block break-words text-sm text-slate-600">{p.reason||t.reasonMissing}</span>:null}</span>
        <ChevronRight size={20} className="shrink-0 text-slate-500"/>
      </button></li>)}</ul>;
  }
  function batch(run: RunRecord, compact = false) {
    return (
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium">
            {run.report?.startedAt ? t.start : t.reserved}:{" "}
            {format(run.report?.startedAt || run.reservedAt)} · {t.timeZone}
          </p>
          <span className="text-xs text-slate-600">
            {run.report ? label(run.report.status) : t.unavailable}
          </span>
        </div>
        {run.report && run.counts ? (
          <>
            <dl className="my-4 flex flex-wrap gap-x-6 gap-y-3 border-b border-slate-100 pb-3">
              {Object.entries(compactCounts(run.counts)).filter(([k])=>k!=='unknown').map(([k,v])=><div key={k}><dd className="text-lg font-semibold tabular-nums">{v}</dd><dt className="text-xs text-slate-600">{({processed:language==='es'?'Procesados':'Processed',photosPublished:language==='es'?'Fotos publicadas':'Photos published',staged:language==='es'?'Propuestas guardadas':'Staged proposals',unresolved:language==='es'?'Sin resolver':'Unresolved',failed:t.failed} as Record<string,string>)[k]}</dt></div>)}
              <div><dd className="text-lg font-semibold tabular-nums">{run.metadataApplications??t.notRecorded}</dd><dt className="text-xs text-slate-600">{language==='es'?'Correcciones activas del catálogo':'Active catalogue corrections'}</dt></div>
            </dl>
            {run.counts.attemptedUnknown?<p className="text-xs text-amber-800">+ {run.counts.attemptedUnknown} {t.unknown}</p>:null}
            {run.counts.staged>0?<button className="mb-2 min-h-11 text-sm font-semibold text-emerald-800 underline" onClick={()=>{const p=run.report!.products.find(p=>p.outcome==='staged'||p.outcome==='proposed_not_published');if(p)openReview({barcode:p.barcode,runId:run.runId,outcome:p});}}>{language==='es'?'Revisar':'Review'} {run.counts.staged} {language==='es'?(run.counts.staged===1?'propuesta':'propuestas'):(run.counts.staged===1?'proposal':'proposals')}</button>:null}
            {!compact?<details className="mb-3 text-xs text-slate-500"><summary className="min-h-11 cursor-pointer py-3">{language==='es'?'Detalles del lote':'Batch details'}</summary><p>{t.reserved}: {run.counts.reserved} · {t.inspected}: {run.counts.inspected} · {t.skipped}: {run.report.skippedUnchanged}</p><p>{t.contribution}: {run.counts.bySource.contribution.attempted} · {t.catalogue}: {run.counts.bySource.catalogue.attempted}</p><p>{t.end}: {format(run.report.endedAt)} · {run.runId}</p></details>:null}
            {rows(
              compact ? run.report.products.slice(0, 3) : run.report.products,
              run.runId, compact,
            )}
          </>
        ) : (
          <p className="my-3 text-sm text-amber-800">{t.unavailable}</p>
        )}
      </>
    );
  }
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--gl-ink)]">
            {t.title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            {t.description}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label={t.refresh}
            title={t.refresh}
            disabled={busy}
            onClick={refresh}
            className="rounded-md border border-slate-200 p-2 disabled:opacity-50"
          >
            <RefreshCw size={18} className={busy ? "animate-spin" : ""} />
          </button>
          <details className="relative">
            <summary
              aria-label={t.more}
              className="cursor-pointer list-none rounded-md border border-slate-200 p-2"
            >
              <MoreHorizontal size={18} />
            </summary>
            <button
              type="button"
              onClick={() => void exportQueue()}
              className="absolute right-0 z-10 mt-1 w-52 rounded-md border bg-white p-3 text-left text-sm shadow"
            >
              {t.export}
            </button>
          </details>
        </div>
      </header>
      <section aria-label={language==='es'?'Progreso del catálogo':'Catalogue progress'} className="bg-white px-4 py-3">
        <h2 className="font-semibold">{language==='es'?'Progreso del catálogo':'Catalogue progress'}</h2>
        {summary.data?<><div className="my-2 flex flex-wrap items-baseline gap-x-3"><strong className="text-2xl tabular-nums">{summary.data.percent===null?t.notRecorded:new Intl.NumberFormat(language,{maximumFractionDigits:1}).format(summary.data.percent)+'%'}</strong><span className="text-sm">{summary.data.classified.toLocaleString(language)} / {summary.data.totalProducts.toLocaleString(language)} {language==='es'?'productos categorizados':'products categorized'}</span></div>
        {summary.data.percent!==null?<div role="progressbar" aria-valuemin={0} aria-valuenow={summary.data.classified} aria-valuemax={summary.data.totalProducts} aria-label={language==='es'?'Productos categorizados':'Categorized products'} className="h-2 w-full overflow-hidden rounded bg-slate-200"><div className="h-full rounded bg-emerald-700" style={{width:summary.data.percent+'%'}}/></div>:null}
        <p className="mt-2 text-sm">{summary.data.remaining.toLocaleString(language)} {language==='es'?'sin categorizar':'remaining uncategorized'} · {summary.data.verified.toLocaleString(language)} {language==='es'?'revisados o verificados':'reviewed or verified'}</p><p className="mt-1 text-xs text-slate-500">{language==='es'?'Componente principal registrado · Todo el catálogo · No mide la exactitud del envase':'Primary component recorded · Entire catalogue · Does not measure packaging accuracy'}</p>
        <p className="mt-1 text-xs text-slate-500">{language==='es'?'Guía resuelta para productos escaneados':'Resolved guidance for scanned products'}: {summary.data.resolvedScannedProducts.toLocaleString(language)} / {summary.data.scannedProducts.toLocaleString(language)}</p></>:!summary.state.error?<p className="py-3 text-sm">{t.loading}</p>:null}
        {summary.state.error?<p role="alert" className="mt-2 text-sm text-amber-800">{summary.data?t.stale:language==='es'?'No se pudo cargar el progreso.':'Catalogue progress could not be loaded.'}</p>:null}
      </section>
      {exportError ? (
        <p role="alert" className="text-sm text-red-700">
          {exportError}
        </p>
      ) : null}
      <section
        className="bg-white p-4"
        aria-label={historyOpen ? t.history : t.latest}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {historyOpen ? t.history : t.latest}
          </h2>
          {historyOpen ? (
            <button
              onClick={activeSelected ? () => setSelected(null) : closeHistory}
              className="flex items-center gap-1 text-sm font-medium"
            >
              <ChevronLeft size={16} />
              {t.back}
            </button>
          ) : (
            <button
              onClick={openHistory}
              className="text-sm font-semibold text-[var(--gl-green)]"
            >
              {t.all}
            </button>
          )}
        </div>
        {history.state.error?<p role="alert" className="text-sm text-amber-800">{t.stale}</p>:null}
        {!history.data && !history.state.error ? (
          <p className="py-5 text-sm text-slate-500">{t.loading}</p>
        ) : null}
        {history.data?.runs.length === 0 ? (
          <p className="py-5 text-sm text-slate-500">{t.empty}</p>
        ) : null}
        {!historyOpen && latest ? (
          <div className="mt-3">{batch(latest, true)}</div>
        ) : null}
        {historyOpen && activeSelected ? (
          <div className="mt-3">{batch(activeSelected)}</div>
        ) : null}
        {historyOpen && !activeSelected ? (
          <>
            <ul className="mt-3 divide-y divide-slate-100">
              {history.data?.runs.map((run) => (
                <li key={run.runId}>
                  <button
                    onClick={() => setSelected(run)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left"
                  >
                    <span className="text-sm">
                      {format(run.report?.startedAt || run.reservedAt)} ·{" "}
                      {t.timeZone}
                      <span className="mt-1 block text-xs text-slate-500">
                        {run.report ? label(run.report.status) : t.unavailable}
                        {run.counts
                          ? ` · ${t.attempted}: ${run.counts.attempted} · ${t.published}: ${run.counts.published}`
                          : ""}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between">
              <button
                aria-label={t.previous}
                disabled={!previous.length || history.state.refreshing}
                onClick={() => {
                  setCursor(previous[previous.length - 1]);
                  setPrevious(previous.slice(0, -1));
                }}
                className="text-sm disabled:opacity-40"
              >
                {t.previous}
              </button>
              <button
                aria-label={t.next}
                disabled={!history.data?.nextCursor || history.state.refreshing}
                onClick={() => {
                  setPrevious([...previous, cursor]);
                  setCursor(history.data!.nextCursor);
                }}
                className="text-sm disabled:opacity-40"
              >
                {t.next}
              </button>
            </div>
          </>
        ) : null}

      </section>
      <section className="bg-white p-4">
        <h2 className="font-semibold">{t.queue}</h2>

        <div className="my-3 flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              aria-label={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm"
            />
          </label>
          <select
            aria-label={t.filter}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setOffset(0);
            }}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            {[
              "all",
              "unclassified",
              "processing",
              "review",
              "rule_missing",
              "failed",
              "resolved",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? t.allStates : label(s)}
              </option>
            ))}
          </select>
        </div>
        {freshness(queue.state)}
        {!queue.data && !queue.state.error ? (
          <p className="py-5 text-sm">{t.loading}</p>
        ) : null}
        {queue.data?.products.length === 0 ? (
          <p className="py-5 text-sm text-slate-500">{t.queueEmpty}</p>
        ) : null}
        <ul className="mt-2 divide-y divide-slate-100">
          {queue.data?.products.map((p) => (
            <li key={p.id}>
              <button onClick={()=>openReview({barcode:p.ean})} className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50">
                <EvidenceThumbnail barcode={p.ean} language={language} revision={queue.state.lastUpdated}/><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{usefulName(p.name,p.ean)||(language==='es'?'Producto sin identificar':'Unidentified product')}</strong><span className="mt-1 block text-xs text-slate-500">{p.ean}{p.brandName&&!/^(greenloop|unknown)$/i.test(p.brandName)?' · '+p.brandName:''}</span><span className="mt-1 block text-sm text-slate-600">{queueNeed(p,language==='es')}</span></span><ChevronRight size={20} className="shrink-0"/>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between text-sm">
          <button
            disabled={offset === 0 || queue.state.refreshing}
            onClick={() => setOffset(Math.max(0, offset - 50))}
            className="disabled:opacity-40"
          >
            {t.previous}
          </button>
          <button
            disabled={queue.data?.nextOffset == null || queue.state.refreshing}
            onClick={() => setOffset(queue.data!.nextOffset!)}
            className="disabled:opacity-40"
          >
            {t.next}
          </button>
        </div>
      </section>
      {reviewTarget?<CurationReviewDialog target={reviewTarget} language={language} onClose={()=>{setReviewTarget(null);requestAnimationFrame(()=>reviewOpener.current?.focus());}}/>:null}
    </div>
  );
}
