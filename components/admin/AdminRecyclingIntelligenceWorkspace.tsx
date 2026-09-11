"use client";
import {proposalProgress,ProposalProgress} from '@/lib/proposalProgress';
import {Outcomes,validateOutcomes} from '@/lib/curationOutcomes';
import {WorkflowPage,WorkflowProduct,validateWorkflowPage,missingFieldLabel,bulkCandidate} from '@/lib/workflowQueue';
import {BulkProductReview} from './BulkProductReview';
import type {ReviewData} from '@/lib/curationReview';
import {actionableBatchProducts} from '@/lib/curationReview';

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

const workflowLabels:Record<string,Record<string,string>>={
 en:{all:'All products',pending:'Awaiting your review',unprocessed:'Not processed yet',resolved:'Resolved',unresolved:'Processed, needs information'},
 es:{all:'Todos los productos',pending:'Pendientes de tu revisión',unprocessed:'Sin procesar',resolved:'Resueltos',unresolved:'Procesados, falta información'},
};
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
  const loadOutcomes=useCallback(async(signal:AbortSignal)=>validateOutcomes(await read<Outcomes>('/admin/recycling-intelligence/outcomes',signal)),[]);
  const outcomes=useResource(loadOutcomes);
  const [pendingOpen,setPendingOpen]=useState(false);
  const [completeness,setCompleteness]=useState('all');
  const [chosen,setChosen]=useState<WorkflowProduct[]>([]),[bulk,setBulk]=useState<WorkflowProduct[]|null>(null);
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
    [filter, setFilter] = useState("pending"),
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
  const queueKey=JSON.stringify([filter,query,offset,completeness]);
  useEffect(()=>{setChosen([]);},[filter,query,offset,completeness]);
  const loadQueue = useCallback(
    async (signal: AbortSignal) => ({...validateWorkflowPage(await read<WorkflowPage>(
        "/admin/recycling-intelligence/workflow-queue?" +
          new URLSearchParams({
            limit: "50",
            offset: String(offset),
            status: filter,
            search: query,
            completeness,
          }),
        signal,
      )),selectionKey:queueKey}),
    [offset, filter, query,queueKey,completeness],
  );
  const queueResource = useResource(loadQueue);
  const queue={...queueResource,data:queueResource.data?.selectionKey===queueKey?queueResource.data:null};
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
  const [proposalStates,setProposalStates]=useState<Record<string,ProposalProgress>>({});
  const [reviewRefresh,setReviewRefresh]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    const runs=[latest,activeSelected].filter((r):r is RunRecord=>!!r);
    const targets=new Map(runs.flatMap(r=>(r.report?.products||[]).filter(p=>p.outcome==='staged'||p.outcome==='proposed_not_published').map(p=>[r.runId+':'+p.barcode,{runId:r.runId,barcode:p.barcode}] as const)));
    async function check(){
      for(const [key,target] of targets){
        if(controller.signal.aborted)return;
        let status:ProposalProgress='unavailable';
        try{
          const data=await read<ReviewData&{manualReview?:{rejected:boolean}}>('/admin/recycling-intelligence/review/'+target.barcode+'?run='+encodeURIComponent(target.runId),AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]));
          if(data.barcode===target.barcode)status=proposalProgress(data);
        }catch{}
        if(!controller.signal.aborted)setProposalStates(old=>({...old,[key]:status}));
      }
    }
    void check();return()=>controller.abort();
  },[latest,activeSelected,reviewRefresh]);
  const busy = history.state.refreshing || queue.state.refreshing;
  const refresh = () => {
    void history.refresh();
    void queue.refresh();
    void summary.refresh();
    void outcomes.refresh();
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
        <span className="mt-1 block text-sm text-amber-800">{proposalStates[runId+':'+p.barcode]==='recorded'?(language==='es'?'Cambios guardados':'Changes saved'):proposalStates[runId+':'+p.barcode]==='rejected'?(language==='es'?'Rechazada':'Rejected'):reviewLabels[language][reviewState(p)]}</span>
        {!compact?<span className="mt-1 block break-words text-sm text-slate-600">{p.reason||t.reasonMissing}</span>:null}</span>
        <ChevronRight size={20} className="shrink-0 text-slate-500"/>
      </button></li>)}</ul>;
  }
  function batch(run: RunRecord, compact = false) {
    const pending=actionableBatchProducts(run.report?.products||[],proposalStates,run.runId);
    const visible=compact?pending:(run.report?.products||[]);
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
              {Object.entries(compactCounts(run.counts)).filter(([k])=>k!=='unknown').map(([k,v])=><div key={k}><dd className="text-lg font-semibold tabular-nums">{k==='staged'?pending.length:v}</dd><dt className="text-xs text-slate-600">{({processed:language==='es'?'Procesados':'Processed',photosPublished:language==='es'?'Fotos publicadas':'Photos published',staged:language==='es'?'Propuestas pendientes':'Pending proposals',unresolved:language==='es'?'Sin resolver':'Unresolved',failed:t.failed} as Record<string,string>)[k]}</dt></div>)}
              <div><dd className="text-lg font-semibold tabular-nums">{run.metadataApplications??t.notRecorded}</dd><dt className="text-xs text-slate-600">{language==='es'?'Correcciones activas del catálogo':'Active catalogue corrections'}</dt></div>
            </dl>
            {run.counts.attemptedUnknown?<p className="text-xs text-amber-800">+ {run.counts.attemptedUnknown} {t.unknown}</p>:null}
            {pending.length>0?<button className="mb-2 min-h-11 text-sm font-semibold text-emerald-800 underline" onClick={()=>openReview({barcode:pending[0].barcode,runId:run.runId,outcome:pending[0]})}>{language==='es'?'Revisar':'Review'} {pending.length} {language==='es'?(pending.length===1?'propuesta':'propuestas'):(pending.length===1?'proposal':'proposals')}</button>:run.counts.staged>0?<p className="mb-2 text-sm text-emerald-800">{language==='es'?'No quedan propuestas pendientes':'No proposals pending'}</p>:null}
            {!compact?<details className="mb-3 text-xs text-slate-500"><summary className="min-h-11 cursor-pointer py-3">{language==='es'?'Detalles del lote':'Batch details'}</summary><p>{t.reserved}: {run.counts.reserved} · {t.inspected}: {run.counts.inspected} · {t.skipped}: {run.report.skippedUnchanged}</p><p>{t.contribution}: {run.counts.bySource.contribution.attempted} · {t.catalogue}: {run.counts.bySource.catalogue.attempted}</p><p>{t.end}: {format(run.report.endedAt)} · {run.runId}</p></details>:null}
            {compact&&!pending.length?<p className="py-2 text-sm text-stone-600">{language==='es'?'Nada que revisar en este lote.':'Nothing to review in this batch.'}</p>:null}
            {!compact?<h3 className="mt-3 text-sm font-semibold">{language==='es'?'Historial del lote':'Batch history'}</h3>:null}
            {rows(
              compact ? visible.slice(0, 3) : visible,
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
      <section aria-label={language==='es'?'Resultados actuales':'Current results'} className="bg-white px-4 py-3">
       <h2 className="font-semibold">{language==='es'?'Resultados actuales':'Current results'}</h2>
       {outcomes.data?<><dl className="grid grid-cols-2 gap-4 py-3 sm:grid-cols-4">
        <div><dd className="text-2xl font-semibold">{outcomes.data.productsImproved}</dd><dt className="text-sm">{language==='es'?'Productos mejorados en vivo':'Products improved live'}</dt></div>
        <div><dd className="text-2xl font-semibold">{outcomes.data.pendingCount}</dd><dt><button className="min-h-11 text-left text-sm text-emerald-800 underline" onClick={()=>setPendingOpen(v=>!v)}>{language==='es'?'Pendientes de tu decisión':'Awaiting your decision'}</button></dt></div>
        <div><dd className="text-2xl font-semibold">{outcomes.data.missingInformation}</dd><dt className="text-sm">{language==='es'?'Con información incompleta':'Products missing information'}</dt></div>
        <div><dd className="text-2xl font-semibold">{outcomes.data.photosAdded}</dd><dt className="text-sm">{language==='es'?'Fotos publicadas':'Photos added'}</dt></div>
       </dl><p className="text-xs text-slate-500">{language==='es'?'Estado actual · Catálogo completo':'Current state · Entire catalogue'} · {format(outcomes.data.asOf)}</p>
       <details className="mt-2 text-sm"><summary className="cursor-pointer">{language==='es'?'Información que falta':'Missing information breakdown'}</summary><p className="py-2">{language==='es'?'Nombre':'Name'}: {outcomes.data.gaps.name} · {language==='es'?'Marca':'Brand'}: {outcomes.data.gaps.brand} · {language==='es'?'Foto':'Photo'}: {outcomes.data.gaps.photo} · {language==='es'?'Envase':'Packaging'}: {outcomes.data.gaps.packaging}</p></details>
       {pendingOpen?<ul className="divide-y">{outcomes.data.pending.map(p=><li key={p.barcode}><button className="min-h-14 w-full py-3 text-left text-sm" onClick={()=>openReview({barcode:p.barcode,runId:p.runId})}><strong>{usefulName(p.name,p.barcode)||p.barcode}</strong><span className="ml-2 text-slate-500">{p.fields.map(f=>f==='brand'?(language==='es'?'Marca':'Brand'):f==='name'?(language==='es'?'Nombre':'Name'):(language==='es'?'Envase':'Packaging')).join(', ')}</span></button></li>)}</ul>:null}
       </>:!outcomes.state.error?<p className="py-3 text-sm">{t.loading}</p>:null}
       {outcomes.state.error?<p role="alert" className="text-sm text-amber-800">{language==='es'?'No se pudieron actualizar los resultados.':'Current results could not be refreshed.'}</p>:null}
      </section>
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
      <details
        className="bg-white p-4"
        aria-label={historyOpen ? t.history : t.latest}
      >
        <summary className="min-h-11 cursor-pointer font-semibold">{t.latest}<span className="ml-3 text-sm font-normal text-stone-600">{latest?.counts?`${latest.counts.attempted} ${language==='es'?'procesados':'processed'} · ${format(latest.report?.startedAt||latest.reservedAt)}`:history.data?t.empty:t.loading}</span></summary>
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

      </details>
      <details className="bg-white p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">{t.queue}<span className="ml-3 text-sm font-normal text-stone-600">{outcomes.data?`${outcomes.data.pendingCount} ${language==='es'?'por revisar':'awaiting review'}`:''}</span></summary>

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
              "pending",
              "unprocessed",
              "resolved",
              "unresolved",
              "all",
            ].map((s) => (
              <option key={s} value={s}>
                {workflowLabels[language==='es'?'es':'en'][s]}{queue.data ? ` (${queue.data.counts[s]})` : ''}
              </option>
            ))}
          </select>
          <select aria-label={language==='es'?'Completitud':'Completeness'} value={completeness} onChange={e=>{setCompleteness(e.target.value);setOffset(0);}} className="min-h-11 rounded border border-stone-300 bg-white px-3 text-sm">
           {[['all','All completeness','Cualquier completitud'],['below50','Below 50%','Menos del 50%'],['50','Exactly 50%','Exactamente 50%'],['above50','Above 50%','Más del 50%'],['100','100% complete','100% completo']].map(o=><option key={o[0]} value={o[0]}>{o[language==='es'?2:1]}</option>)}
          </select>
        </div>
        <div className="my-3 flex flex-wrap items-center gap-3">
         <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={!queue.data?.products.some(bulkCandidate)} checked={!!queue.data?.products.filter(bulkCandidate).length&&queue.data.products.filter(bulkCandidate).slice(0,20).every(p=>chosen.some(c=>c.ean===p.ean))} onChange={e=>setChosen(e.target.checked?(queue.data?.products.filter(bulkCandidate).slice(0,20)||[]):[])}/>{language==='es'?'Seleccionar elegibles de esta página (máx. 20)':'Select eligible on this page (max 20)'}</label>
         <button disabled={!chosen.length} onClick={()=>setBulk([...chosen])} className="min-h-11 rounded bg-emerald-800 px-4 text-sm text-white disabled:opacity-50">{language==='es'?'Revisar selección':'Review selected'} ({chosen.length})</button>
        </div>
        {freshness(queue.state)}
        {queue.data?<p className="mt-2 text-sm text-slate-600" aria-live="polite">{queue.data.total.toLocaleString(language)} {language==='es'?(queue.data.total===1?'producto':'productos'):(queue.data.total===1?'product':'products')}</p>:null}
        {!queue.data && !queue.state.error ? (
          <p className="py-5 text-sm">{t.loading}</p>
        ) : null}
        {queue.data?.products.length === 0 ? (
          <p className="py-5 text-sm text-slate-500">{t.queueEmpty}</p>
        ) : null}
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {queue.data?.products.map((p) => (
            <li key={p.id} className="min-w-0 rounded-lg border border-stone-200 p-3">
              <div className="flex items-center justify-between gap-2"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" aria-label={(language==='es'?'Seleccionar ':'Select ')+(p.name||p.ean)} disabled={!bulkCandidate(p)||chosen.length>=20&&!chosen.some(c=>c.ean===p.ean)} checked={chosen.some(c=>c.ean===p.ean)} onChange={e=>setChosen(rows=>e.target.checked?[...rows,p]:rows.filter(c=>c.ean!==p.ean))}/>{language==='es'?'Seleccionar':'Select'}</label><strong className="text-lg tabular-nums">{p.completeness===undefined?'—':p.completeness+'%'}</strong></div>
              <div role="progressbar" aria-label={language==='es'?'Completitud del producto':'Product completeness'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.completeness} className="h-1.5 overflow-hidden rounded bg-stone-200"><div className="h-full bg-emerald-700" style={{width:(p.completeness||0)+'%'}}/></div>
              <button onClick={()=>openReview({barcode:p.ean,...(p.runId?{runId:p.runId}:{})})} className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50">
                <EvidenceThumbnail barcode={p.ean} language={language} revision={queue.state.lastUpdated}/><span className="min-w-0 flex-1"><strong className="block break-words text-sm">{usefulName(p.name,p.ean)||(language==='es'?'Producto sin identificar':'Unidentified product')}</strong><span className="mt-1 block text-xs text-slate-500">{p.ean}{p.brandName&&!/^(greenloop|unknown)$/i.test(p.brandName)?' · '+p.brandName:''}</span><span className="mt-1 block text-sm text-slate-600">{p.state==='unresolved'?(missingFieldLabel(p.missingFields,language)||workflowLabels[language][p.state]):workflowLabels[language][p.state]}</span></span><ChevronRight size={20} className="shrink-0"/>
              </button>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">{[['name','Name','Nombre'],['brand','Brand','Marca'],['photo','Photo','Foto'],['packaging','Packaging','Envase']].map(f=><li key={f[0]} className={p.missingFields?.includes(f[0])?'text-red-800':'text-emerald-800'}>{p.missingFields?.includes(f[0])?'○ ':'✓ '}{f[language==='es'?2:1]}</li>)}</ul>
              <p className="mt-2 text-xs text-stone-600">{bulkCandidate(p)?(language==='es'?'Completo · Propuesta por verificar':'Complete · Proposal to verify'):p.state==='pending'?(language==='es'?'Completa la información antes de aprobar en grupo':'Fill missing information before bulk approval'):p.state==='resolved'?(language==='es'?'Resuelto · Sin decisión pendiente':'Resolved · No decision pending'):(language==='es'?'Información pendiente · Abre para completar':'Information missing · Open to complete')}</p>
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
      </details>
      {bulk?<BulkProductReview products={bulk} language={language} onSaved={barcode=>{setChosen(rows=>rows.filter(p=>p.ean!==barcode));refresh();}} onClose={()=>{setBulk(null);refresh();}}/>:null}
      {reviewTarget?<CurationReviewDialog target={reviewTarget} language={language} onClose={()=>{setReviewTarget(null);setReviewRefresh(v=>v+1);refresh();requestAnimationFrame(()=>reviewOpener.current?.focus());}}/>:null}
    </div>
  );
}
