"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarCheck,
  FlaskConical,
  MailCheck,
  MessageSquareReply,
  RefreshCw,
  Rocket,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { WorkspaceHeader } from "@/components/crm/WorkspaceHeader";
import styles from "@/components/crm/Workspace.module.css";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Kpis = {
  totalSent: number;
  totalReplies: number;
  replyRate: number;
  positiveReplies: number;
  positiveReplyRate: number;
  meetingsGenerated: number;
  challengesStarted: number;
  challengesLaunched: number;
  commercialOpportunities: number;
  internalReferrals: number;
  internalReferralRate: number;
  noReplyObserved: number;
};

type DimensionStat = {
  value: string;
  sent: number;
  replies: number;
  positive: number;
  meetings: number;
  challengesLaunched: number;
  commercialOpportunities: number;
  positiveRate: number;
  sampleSize: number;
  confidence: "insufficient" | "emerging" | "directional" | "stronger";
  rankable: boolean;
};

type SuccessCase = {
  outreachId: string;
  organizationName: string;
  category: string | null;
  originalAngle: string | null;
  specificHook: string | null;
  existingAsset: string | null;
  missingLayer: string | null;
  proposedChallenge: string | null;
  proposalFilename: string | null;
  recipientPath: string | null;
  outcome: string;
  status: string;
  occurredAt: string;
  possibleSignal: string | null;
  confidence: string;
  sampleSize: number;
};

type Report = {
  generatedAt: string;
  kpis: Kpis;
  measurementCoverage: Record<string, { availability: string; observed: number }>;
  dataQuality: {
    exactRenderedSends: number;
    reconstructedHistoricalSends: number;
    structuredAngles: number;
    structuredRecipientRoles: number;
    linkedProposals: number;
  };
  dimensions: {
    categories: DimensionStat[];
    angles: DimensionStat[];
    recipientRoles: DimensionStat[];
    subjectPatterns: DimensionStat[];
    sendWindows: DimensionStat[];
    contactPaths: DimensionStat[];
    proposalConcepts: DimensionStat[];
    languages: DimensionStat[];
    emailLengths: DimensionStat[];
  };
  recentSuccessCases: SuccessCase[];
  recentNegativeSignals: {
    outreachId: string;
    organizationName: string;
    signal: string;
    reason: string | null;
    occurredAt: string;
  }[];
  learning: {
    whatWeAreLearning: string[];
    appearsToBeWorking: string[];
    appearsNotToBeWorking: string[];
    emergingPatterns: string[];
    insufficientDataAreas: string[];
    experimentsWorthRunningNext: string[];
  };
  methodology: {
    minimumRankableSample: number;
    attributionLanguage: string;
    unknowns: string;
    objective: string;
  };
};

const copy = {
  en: {
    eyebrow: "Reply Intelligence Manager",
    title: "Outreach intelligence",
    description: "From exact sends to replies, meetings, challenges and commercial outcomes.",
    hub: "Reports hub",
    outreach: "Outreach desk",
    refresh: "Refresh",
    updated: "Updated",
    loading: "Loading outreach intelligence…",
    error: "Unable to load outreach intelligence",
    kpis: {
      sent: "Total sent", replies: "Replies", positive: "Positive replies", meetings: "Meetings generated",
      challenges: "Challenges launched", commercial: "Commercial opportunities", referrals: "Internal referrals",
    },
    learning: "What we are learning",
    experiments: "Experiments worth running next",
    dataQuality: "Evidence coverage",
    exact: "Exact rendered sends",
    historical: "Historical reconstructions",
    angles: "Structured angles",
    roles: "Structured roles",
    proposals: "Linked proposals",
    measurement: "Tracking availability",
    performance: {
      categories: "Categories", angles: "Angles", roles: "Recipient roles", subjects: "Subject patterns",
      windows: "Send windows", paths: "Contact paths", proposals: "Proposal concepts", lengths: "Email length",
    },
    headers: { value: "Pattern", sent: "Sent", replies: "Replies", positive: "Positive", rate: "Positive rate", downstream: "Downstream", evidence: "Evidence" },
    notRankable: "Not rankable",
    success: "Recent success cases",
    noSuccess: "No meaningful positive outcome is linked yet.",
    negatives: "Recent negative signals",
    noNegatives: "No negative funnel signals are recorded.",
    possibleSignal: "Possible signal",
    sample: "sample",
    methodology: "Methodology",
    unavailable: "Unavailable",
    partiallyObserved: "Partially observed",
  },
  es: {
    eyebrow: "Gestor de inteligencia de respuestas",
    title: "Inteligencia de outreach",
    description: "Desde el envío exacto hasta respuestas, reuniones, retos y oportunidades comerciales.",
    hub: "Centro de informes",
    outreach: "Mesa de outreach",
    refresh: "Actualizar",
    updated: "Actualizado",
    loading: "Cargando inteligencia de outreach…",
    error: "No se pudo cargar la inteligencia de outreach",
    kpis: {
      sent: "Enviados", replies: "Respuestas", positive: "Respuestas positivas", meetings: "Reuniones generadas",
      challenges: "Retos lanzados", commercial: "Oportunidades comerciales", referrals: "Referencias internas",
    },
    learning: "Qué estamos aprendiendo",
    experiments: "Próximos experimentos recomendados",
    dataQuality: "Cobertura de evidencia",
    exact: "Envíos renderizados exactos",
    historical: "Reconstrucciones históricas",
    angles: "Ángulos estructurados",
    roles: "Roles estructurados",
    proposals: "Propuestas vinculadas",
    measurement: "Disponibilidad de medición",
    performance: {
      categories: "Categorías", angles: "Ángulos", roles: "Roles", subjects: "Patrones de asunto",
      windows: "Ventanas de envío", paths: "Rutas de contacto", proposals: "Conceptos de propuesta", lengths: "Longitud del email",
    },
    headers: { value: "Patrón", sent: "Enviados", replies: "Respuestas", positive: "Positivas", rate: "Tasa positiva", downstream: "Resultado", evidence: "Evidencia" },
    notRankable: "No clasificable",
    success: "Casos de éxito recientes",
    noSuccess: "Todavía no hay resultados positivos significativos vinculados.",
    negatives: "Señales negativas recientes",
    noNegatives: "No hay señales negativas registradas en el embudo.",
    possibleSignal: "Señal posible",
    sample: "muestra",
    methodology: "Metodología",
    unavailable: "No disponible",
    partiallyObserved: "Observación parcial",
  },
};

function locale(language: DashboardLanguage) {
  return language === "es" ? "es-ES" : "en-GB";
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function KpiCard({ label, value, detail, icon: Icon }: { label: string; value: number; detail?: string; icon: typeof MailCheck }) {
  return (
    <div className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gl-ink-soft)]">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--gl-ink)]">{value.toLocaleString()}</p>
          {detail ? <p className="mt-1 text-xs text-[var(--gl-ink-soft)]">{detail}</p> : null}
        </div>
        <span className="rounded-xl bg-[var(--gl-card-cream)] p-2.5 text-[var(--gl-green)]"><Icon size={19} /></span>
      </div>
    </div>
  );
}

function PerformanceTable({ title, rows, language }: { title: string; rows: DimensionStat[]; language: DashboardLanguage }) {
  const c = copy[language];
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
      <div className="border-b border-[var(--gl-hairline)] px-5 py-4">
        <h2 className="font-semibold text-[var(--gl-ink)]">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-soft)]">
            <tr>
              <th className="px-5 py-3 font-semibold">{c.headers.value}</th>
              <th className="px-3 py-3 font-semibold">{c.headers.sent}</th>
              <th className="px-3 py-3 font-semibold">{c.headers.replies}</th>
              <th className="px-3 py-3 font-semibold">{c.headers.positive}</th>
              <th className="px-3 py-3 font-semibold">{c.headers.rate}</th>
              <th className="px-3 py-3 font-semibold">{c.headers.downstream}</th>
              <th className="px-5 py-3 font-semibold">{c.headers.evidence}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--gl-hairline)]">
            {rows.slice(0, 6).map((row) => (
              <tr key={row.value} className="align-top">
                <td className="max-w-[260px] px-5 py-3 font-medium text-[var(--gl-ink)]">{row.value}</td>
                <td className="px-3 py-3">{row.sent}</td>
                <td className="px-3 py-3">{row.replies}</td>
                <td className="px-3 py-3">{row.positive}</td>
                <td className="px-3 py-3 font-semibold text-[var(--gl-green)]">{row.positiveRate.toLocaleString(locale(language))}%</td>
                <td className="px-3 py-3 text-xs text-[var(--gl-ink-soft)]">{row.meetings} mtg · {row.challengesLaunched} challenge · {row.commercialOpportunities} opp</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.rankable ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                    {row.rankable ? `${humanize(row.confidence)} · n=${row.sampleSize}` : `${c.notRankable} · n=${row.sampleSize}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminOutreachIntelligenceWorkspace() {
  const router = useRouter();
  const { language } = useDashboardLanguage();
  const c = copy[language];
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ ok: boolean; report: Report }>("/admin/outreach/intelligence/report", { token });
      setReport(response.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.error);
    } finally {
      setLoading(false);
    }
  }, [c.error, router]);

  useEffect(() => { void load(); }, [load]);

  const kpis = report?.kpis;
  return (
    <div className={`${styles.root} space-y-5`}>
      <WorkspaceHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--gl-green)]">{c.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--gl-ink)]">{c.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--gl-ink-soft)]">{c.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/reports" className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">{c.hub}</Link>
          <Link href="/admin/outreach" className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink-soft)] hover:bg-[var(--gl-card-cream)]">{c.outreach}</Link>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{c.refresh}</button>
        </div>
      </WorkspaceHeader>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {loading && !report ? <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-8 text-sm text-[var(--gl-ink-soft)]">{c.loading}</div> : null}

      {report ? <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] px-4 py-3 text-xs text-[var(--gl-ink-soft)]">
          <span>{c.updated}: {new Date(report.generatedAt).toLocaleString(locale(language))}</span>
          <span>{report.methodology.attributionLanguage}</span>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label={c.kpis.sent} value={kpis?.totalSent || 0} icon={MailCheck} />
          <KpiCard label={c.kpis.replies} value={kpis?.totalReplies || 0} detail={`${kpis?.replyRate || 0}%`} icon={MessageSquareReply} />
          <KpiCard label={c.kpis.positive} value={kpis?.positiveReplies || 0} detail={`${kpis?.positiveReplyRate || 0}%`} icon={Sparkles} />
          <KpiCard label={c.kpis.meetings} value={kpis?.meetingsGenerated || 0} icon={CalendarCheck} />
          <KpiCard label={c.kpis.challenges} value={kpis?.challengesLaunched || 0} detail={`${kpis?.challengesStarted || 0} started`} icon={Rocket} />
          <KpiCard label={c.kpis.commercial} value={kpis?.commercialOpportunities || 0} icon={ArrowUpRight} />
          <KpiCard label={c.kpis.referrals} value={kpis?.internalReferrals || 0} detail={`${kpis?.internalReferralRate || 0}%`} icon={UsersRound} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
            <div className="flex items-center gap-2"><Sparkles size={18} className="text-[var(--gl-green)]" /><h2 className="font-semibold text-[var(--gl-ink)]">{c.learning}</h2></div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--gl-ink-soft)]">
              {[...report.learning.whatWeAreLearning, ...report.learning.appearsToBeWorking, ...report.learning.emergingPatterns].map((item) => <li key={item} className="rounded-xl bg-[var(--gl-card-cream)] px-4 py-3">{item}</li>)}
            </ul>
            <div className="mt-5 flex items-center gap-2"><FlaskConical size={18} className="text-[var(--gl-coral)]" /><h3 className="font-semibold text-[var(--gl-ink)]">{c.experiments}</h3></div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--gl-ink-soft)]">{report.learning.experimentsWorthRunningNext.map((item) => <li key={item}>• {item}</li>)}</ul>
          </div>

          <div className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
            <h2 className="font-semibold text-[var(--gl-ink)]">{c.dataQuality}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                [c.exact, report.dataQuality.exactRenderedSends], [c.historical, report.dataQuality.reconstructedHistoricalSends],
                [c.angles, report.dataQuality.structuredAngles], [c.roles, report.dataQuality.structuredRecipientRoles],
                [c.proposals, report.dataQuality.linkedProposals],
              ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[var(--gl-card-cream)] p-3"><dt className="text-xs text-[var(--gl-ink-soft)]">{label}</dt><dd className="mt-1 text-xl font-semibold text-[var(--gl-ink)]">{value}</dd></div>)}
            </dl>
            <h3 className="mt-5 text-sm font-semibold text-[var(--gl-ink)]">{c.measurement}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(report.measurementCoverage).map(([name, coverage]) => <span key={name} className="rounded-full border border-[var(--gl-hairline)] px-3 py-1.5 text-xs text-[var(--gl-ink-soft)]">{humanize(name)} · {coverage.availability === "unavailable" ? c.unavailable : c.partiallyObserved} ({coverage.observed})</span>)}
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          <PerformanceTable title={c.performance.categories} rows={report.dimensions.categories} language={language} />
          <PerformanceTable title={c.performance.angles} rows={report.dimensions.angles} language={language} />
          <PerformanceTable title={c.performance.roles} rows={report.dimensions.recipientRoles} language={language} />
          <PerformanceTable title={c.performance.subjects} rows={report.dimensions.subjectPatterns} language={language} />
          <PerformanceTable title={c.performance.windows} rows={report.dimensions.sendWindows} language={language} />
          <PerformanceTable title={c.performance.paths} rows={report.dimensions.contactPaths} language={language} />
          <PerformanceTable title={c.performance.proposals} rows={report.dimensions.proposalConcepts} language={language} />
          <PerformanceTable title={c.performance.lengths} rows={report.dimensions.emailLengths} language={language} />
        </section>

        <section className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
          <h2 className="font-semibold text-[var(--gl-ink)]">{c.success}</h2>
          {report.recentSuccessCases.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{report.recentSuccessCases.map((item) => (
            <article key={`${item.outreachId}-${item.status}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{item.category || "Unknown category"}</p><h3 className="mt-1 text-lg font-semibold text-[var(--gl-ink)]">{item.organizationName}</h3></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800">{humanize(item.status)}</span></div>
              <dl className="mt-4 space-y-2 text-sm"><div><dt className="font-semibold text-[var(--gl-ink)]">Angle</dt><dd className="text-[var(--gl-ink-soft)]">{item.originalAngle || "Unknown"}</dd></div><div><dt className="font-semibold text-[var(--gl-ink)]">Outcome</dt><dd className="text-[var(--gl-ink-soft)]">{humanize(item.outcome)}</dd></div>{item.existingAsset ? <div><dt className="font-semibold text-[var(--gl-ink)]">Existing asset</dt><dd className="text-[var(--gl-ink-soft)]">{item.existingAsset}</dd></div> : null}{item.proposedChallenge ? <div><dt className="font-semibold text-[var(--gl-ink)]">Proposed challenge</dt><dd className="text-[var(--gl-ink-soft)]">{item.proposedChallenge}</dd></div> : null}</dl>
              {item.possibleSignal ? <p className="mt-4 rounded-xl bg-white/80 p-3 text-sm text-[var(--gl-ink-soft)]"><strong className="text-[var(--gl-ink)]">{c.possibleSignal}:</strong> {item.possibleSignal}</p> : null}
              <p className="mt-3 text-xs text-emerald-900">{humanize(item.confidence)} · {c.sample} n={item.sampleSize}</p>
            </article>
          ))}</div> : <p className="mt-4 text-sm text-[var(--gl-ink-soft)]">{c.noSuccess}</p>}
        </section>

        <section className="rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
          <h2 className="font-semibold text-[var(--gl-ink)]">{c.negatives}</h2>
          {report.recentNegativeSignals.length ? <div className="mt-4 divide-y divide-[var(--gl-hairline)]">{report.recentNegativeSignals.map((item) => <div key={`${item.outreachId}-${item.signal}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span className="font-medium text-[var(--gl-ink)]">{item.organizationName}</span><span className="text-[var(--gl-ink-soft)]">{humanize(item.signal)}{item.reason ? ` · ${humanize(item.reason)}` : ""}</span></div>)}</div> : <p className="mt-4 text-sm text-[var(--gl-ink-soft)]">{c.noNegatives}</p>}
        </section>

        <section className="rounded-xl border border-dashed border-[var(--gl-hairline)] p-4 text-xs leading-5 text-[var(--gl-ink-soft)]"><strong className="text-[var(--gl-ink)]">{c.methodology}:</strong> {report.methodology.objective} {report.methodology.unknowns}</section>
      </> : null}
    </div>
  );
}
