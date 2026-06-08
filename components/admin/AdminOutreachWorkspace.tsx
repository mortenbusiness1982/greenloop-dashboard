"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type OutreachStatus = "drafted" | "approved" | "sending" | "sent" | "failed" | "skipped";

type OutreachAttachment = {
  filename?: string;
  path?: string;
  content?: string;
  content_type?: string;
  contentType?: string;
};

type OutreachEmail = {
  id: string;
  campaign_name?: string | null;
  lead_name?: string | null;
  lead_email: string;
  organization_name?: string | null;
  audience_type?: string | null;
  subject: string;
  html_body?: string | null;
  status: OutreachStatus;
  approved_at?: string | null;
  sent_at?: string | null;
  failed_at?: string | null;
  resend_email_id?: string | null;
  error_message?: string | null;
  reply_status?: string | null;
  attachments?: OutreachAttachment[] | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type OutreachListResponse = {
  ok: boolean;
  emails: OutreachEmail[];
};

type OutreachMutationResponse = {
  ok: boolean;
  email: OutreachEmail;
};

type OutreachForm = {
  campaign_name: string;
  lead_name: string;
  lead_email: string;
  organization_name: string;
  audience_type: string;
  subject: string;
  html_body: string;
  researchNotes: string;
  attachmentsText: string;
  metadataText: string;
};

const TEST_RECIPIENT = "mortenbusiness@gmail.com";

const statusOptions: OutreachStatus[] = ["drafted", "approved", "sent", "failed", "skipped"];

const copy: Record<DashboardLanguage, {
  eyebrow: string;
  title: string;
  description: string;
  loadError: string;
  saveError: string;
  actionError: string;
  saved: string;
  approved: string;
  approveAllDone: (count: number) => string;
  draftCreated: string;
  skipped: string;
  testSent: (id?: string | null) => string;
  realSent: (id?: string | null) => string;
  sendConfirm: (email: string) => string;
  invalidJson: (field: string) => string;
  filters: {
    allStatuses: string;
    allAudiences: string;
    campaign: string;
    campaignPlaceholder: string;
  };
  kpis: {
    total: string;
    drafted: string;
    approved: string;
    sent: string;
    failed: string;
  };
  list: {
    title: string;
    empty: string;
    loading: string;
    created: string;
    approved: string;
    sent: string;
    failed: string;
    error: string;
    noSubject: string;
  };
  editor: {
    title: string;
    newTitle: string;
    empty: string;
    recipient: string;
    status: string;
    organizationName: string;
    audienceType: string;
    leadName: string;
    leadEmail: string;
    campaignName: string;
    subject: string;
    htmlBody: string;
    preview: string;
    researchNotes: string;
    sourceLinks: string;
    noSourceLinks: string;
    realRecipientWarning: string;
    resendId: string;
    errorMessage: string;
  };
  actions: {
    reload: string;
    newDraft: string;
    save: string;
    createDraft: string;
    approve: string;
    approveAll: string;
    quickApprove: string;
    sendTest: string;
    sendReal: string;
    skip: string;
    sending: string;
  };
  statuses: Record<OutreachStatus, string>;
}> = {
  en: {
    eyebrow: "Outreach",
    title: "Outreach approval desk",
    description: "Review AI-generated outreach drafts, edit the message, approve it, send a safe test, then manually send the approved real email.",
    loadError: "Unable to load outreach drafts",
    saveError: "Unable to save outreach draft",
    actionError: "Outreach action failed",
    saved: "Draft saved.",
    approved: "Draft approved.",
    approveAllDone: (count) => `${count} drafts approved.`,
    draftCreated: "Draft created.",
    skipped: "Draft marked not suitable.",
    testSent: (id) => `Test email sent to ${TEST_RECIPIENT}${id ? ` (${id})` : ""}.`,
    realSent: (id) => `Real email sent${id ? ` (${id})` : ""}.`,
    sendConfirm: (email) => `This will send to ${email}. Continue?`,
    invalidJson: (field) => `${field} must be valid JSON.`,
    filters: {
      allStatuses: "All statuses",
      allAudiences: "All audiences",
      campaign: "Campaign",
      campaignPlaceholder: "Filter by campaign",
    },
    kpis: {
      total: "Total",
      drafted: "Drafted",
      approved: "Approved",
      sent: "Sent",
      failed: "Failed",
    },
    list: {
      title: "Drafts",
      empty: "No outreach records match these filters.",
      loading: "Loading outreach records...",
      created: "Created",
      approved: "Approved",
      sent: "Sent",
      failed: "Failed",
      error: "Error",
      noSubject: "No subject",
    },
    editor: {
      title: "Draft detail / editor",
      newTitle: "New outreach draft",
      empty: "Select a draft to review its research context, edit the subject/body, approve it, or send a test.",
      recipient: "Real recipient",
      status: "Status",
      organizationName: "Organization name",
      audienceType: "Audience type",
      leadName: "Contact name",
      leadEmail: "Real recipient email",
      campaignName: "Campaign name",
      subject: "Subject",
      htmlBody: "Email message",
      preview: "Email preview with signature",
      researchNotes: "Research notes",
      sourceLinks: "Source links",
      noSourceLinks: "No source links found in metadata.",
      realRecipientWarning: "Real sends are locked until the record is approved. Test sends create a separate approved copy and never overwrite this recipient.",
      resendId: "Resend ID",
      errorMessage: "Error message",
    },
    actions: {
      reload: "Reload",
      newDraft: "New draft",
      save: "Save changes",
      createDraft: "Create draft",
      approve: "Approve draft",
      approveAll: "Approve all visible drafts",
      quickApprove: "Approve",
      sendTest: "Send test",
      sendReal: "Send approved email",
      skip: "Mark not suitable",
      sending: "Working...",
    },
    statuses: {
      drafted: "Drafted",
      approved: "Approved",
      sending: "Sending",
      sent: "Sent",
      failed: "Failed",
      skipped: "Not suitable",
    },
  },
  es: {
    eyebrow: "Prospección",
    title: "Mesa de aprobación de outreach",
    description: "Revisa borradores creados por IA, edita el mensaje, apruébalo, envía una prueba segura y después manda manualmente el email real aprobado.",
    loadError: "No se pudieron cargar los borradores",
    saveError: "No se pudo guardar el borrador",
    actionError: "Falló la acción de outreach",
    saved: "Borrador guardado.",
    approved: "Borrador aprobado.",
    approveAllDone: (count) => `${count} borradores aprobados.`,
    draftCreated: "Borrador creado.",
    skipped: "Borrador marcado como no adecuado.",
    testSent: (id) => `Email de prueba enviado a ${TEST_RECIPIENT}${id ? ` (${id})` : ""}.`,
    realSent: (id) => `Email real enviado${id ? ` (${id})` : ""}.`,
    sendConfirm: (email) => `Esto enviará el email a ${email}. ¿Continuar?`,
    invalidJson: (field) => `${field} debe ser JSON válido.`,
    filters: {
      allStatuses: "Todos los estados",
      allAudiences: "Todas las audiencias",
      campaign: "Campaña",
      campaignPlaceholder: "Filtrar por campaña",
    },
    kpis: {
      total: "Total",
      drafted: "Borradores",
      approved: "Aprobados",
      sent: "Enviados",
      failed: "Fallidos",
    },
    list: {
      title: "Borradores",
      empty: "No hay registros que coincidan con estos filtros.",
      loading: "Cargando registros...",
      created: "Creado",
      approved: "Aprobado",
      sent: "Enviado",
      failed: "Fallido",
      error: "Error",
      noSubject: "Sin asunto",
    },
    editor: {
      title: "Detalle / editor del borrador",
      newTitle: "Nuevo borrador de outreach",
      empty: "Selecciona un borrador para revisar contexto, editar asunto/cuerpo, aprobarlo o enviar una prueba.",
      recipient: "Destinatario real",
      status: "Estado",
      organizationName: "Organización",
      audienceType: "Tipo de audiencia",
      leadName: "Contacto",
      leadEmail: "Email real del destinatario",
      campaignName: "Campaña",
      subject: "Asunto",
      htmlBody: "Mensaje del email",
      preview: "Vista previa con firma",
      researchNotes: "Notas de investigación",
      sourceLinks: "Enlaces fuente",
      noSourceLinks: "No hay enlaces fuente en la metadata.",
      realRecipientWarning: "El envío real está bloqueado hasta aprobar el registro. Las pruebas crean una copia aprobada y nunca sobrescriben este destinatario.",
      resendId: "ID de Resend",
      errorMessage: "Mensaje de error",
    },
    actions: {
      reload: "Recargar",
      newDraft: "Nuevo borrador",
      save: "Guardar cambios",
      createDraft: "Crear borrador",
      approve: "Aprobar borrador",
      approveAll: "Aprobar todos los borradores visibles",
      quickApprove: "Aprobar",
      sendTest: "Enviar prueba",
      sendReal: "Enviar email aprobado",
      skip: "Marcar no adecuado",
      sending: "Procesando...",
    },
    statuses: {
      drafted: "Borrador",
      approved: "Aprobado",
      sending: "Enviando",
      sent: "Enviado",
      failed: "Fallido",
      skipped: "No adecuado",
    },
  },
};

function emptyForm(): OutreachForm {
  return {
    campaign_name: "",
    lead_name: "",
    lead_email: "",
    organization_name: "",
    audience_type: "",
    subject: "",
    html_body: "",
    researchNotes: "",
    attachmentsText: "[]",
    metadataText: "{}",
  };
}

function formFromEmail(email: OutreachEmail): OutreachForm {
  const metadata = email.metadata ?? {};
  const notes = typeof metadata.research_notes === "string"
    ? metadata.research_notes
    : typeof metadata.researchNotes === "string"
      ? metadata.researchNotes
      : typeof metadata.notes === "string"
        ? metadata.notes
        : "";

  return {
    campaign_name: email.campaign_name ?? "",
    lead_name: email.lead_name ?? "",
    lead_email: email.lead_email ?? "",
    organization_name: email.organization_name ?? "",
    audience_type: email.audience_type ?? "",
    subject: email.subject ?? "",
    html_body: email.html_body ?? "",
    researchNotes: notes,
    attachmentsText: JSON.stringify(email.attachments ?? [], null, 2),
    metadataText: JSON.stringify(metadata, null, 2),
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function parseJsonField<T>(text: string, fallback: T): T {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed) as T;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
}

function extractSourceLinks(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return [];
  const candidates = [
    metadata.source_urls,
    metadata.sourceUrls,
    metadata.sources,
    metadata.links,
    metadata.source_links,
  ];
  return candidates
    .flatMap((candidate) => {
      if (Array.isArray(candidate)) return candidate;
      if (typeof candidate === "string") return [candidate];
      return [];
    })
    .map((value) => {
      if (typeof value === "string") return value;
      if (value && typeof value === "object") {
        const item = value as Record<string, unknown>;
        if (typeof item.url === "string") return item.url;
        if (typeof item.href === "string") return item.href;
      }
      return "";
    })
    .filter(Boolean);
}

function getStatusTone(status: OutreachStatus) {
  if (status === "sent") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "approved") return "bg-blue-50 text-blue-800 border-blue-200";
  if (status === "failed") return "bg-red-50 text-red-800 border-red-200";
  if (status === "skipped") return "bg-slate-50 text-slate-700 border-slate-200";
  if (status === "sending") return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-stone-50 text-stone-800 border-stone-200";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function buildPreviewHtml(htmlBody: string) {
  const source = htmlBody.trim();
  const body = textToHtml(source) || "<p style='color:#718078'>No email message yet.</p>";
  const signature = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;color:#14211B;">
      <tr>
        <td style="vertical-align:top;padding-right:22px;border-right:3px solid #15785A;">
          <img src="https://greenloop-api.onrender.com/assets/greenloop-email-turtle.png" width="66" height="66" alt="GreenLoop" style="display:block;border:0;outline:none;border-radius:12px;" />
        </td>
        <td style="vertical-align:top;padding-left:22px;">
          <div style="font-size:13px;color:#6C8077;font-style:italic;font-family:Georgia,'Times New Roman',serif;margin-bottom:6px;">Un saludo&nbsp;/&nbsp;Kind regards,</div>
          <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:21px;font-weight:bold;letter-spacing:-0.4px;color:#14211B;line-height:1.1;">Morten</div>
          <div style="font-family:'Trebuchet MS',Arial,sans-serif;font-size:14px;font-weight:bold;color:#15785A;letter-spacing:1.5px;text-transform:uppercase;margin-top:3px;">Green<span style="color:#0F2B21;">Loop</span></div>
          <div style="height:11px;line-height:11px;font-size:0;">&nbsp;</div>
          <div style="font-size:13px;line-height:1.7;">
            <a href="https://www.greenloopapp.com" style="color:#14211B;text-decoration:none;font-weight:bold;">www.greenloopapp.com</a><br/>
            <a href="mailto:morten@greenloopapp.com" style="color:#6C8077;text-decoration:none;">morten@greenloopapp.com</a>
          </div>
          <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
          <div style="font-family:Georgia,serif;font-style:italic;font-size:12.5px;color:#C95B3E;">Reciclar, vale la pena&nbsp;/&nbsp;Making recycling worth it</div>
        </td>
      </tr>
    </table>
  `;

  if (/<\/body>/i.test(source)) {
    return source.replace(/<\/body>/i, `${signature}</body>`);
  }

  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:22px;background:#ffffff;font-family:Arial,sans-serif;color:#123127;">
        <div style="font-size:15px;line-height:22px;color:#123127;">
          ${body}
          ${signature}
        </div>
      </body>
    </html>
  `;
}

export function AdminOutreachWorkspace() {
  const { language } = useDashboardLanguage();
  const c = copy[language];
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [audienceFilter, setAudienceFilter] = useState<string>("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<OutreachForm>(() => emptyForm());
  const [isCreating, setIsCreating] = useState(false);

  const selected = useMemo(
    () => emails.find((email) => email.id === selectedId) ?? null,
    [emails, selectedId]
  );

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      if (audienceFilter && email.audience_type !== audienceFilter) return false;
      return true;
    });
  }, [audienceFilter, emails]);

  const audienceOptions = useMemo(() => uniqueStrings(emails.map((email) => email.audience_type)), [emails]);

  const counts = useMemo(() => {
    return emails.reduce(
      (acc, email) => {
        acc.total += 1;
        if (email.status in acc) acc[email.status as keyof typeof acc] += 1;
        return acc;
      },
      { total: 0, drafted: 0, approved: 0, sent: 0, failed: 0, skipped: 0, sending: 0 }
    );
  }, [emails]);

  const sourceLinks = useMemo(() => {
    try {
      return extractSourceLinks(parseJsonField<Record<string, unknown>>(form.metadataText, {}));
    } catch {
      return [];
    }
  }, [form.metadataText]);

  const loadEmails = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (campaignFilter.trim()) params.set("campaign", campaignFilter.trim());
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const data = await apiFetch<OutreachListResponse>(`/admin/outreach/emails${suffix}`, { token });
      setEmails(data.emails ?? []);
      setSelectedId((current) => current && data.emails.some((email) => email.id === current)
        ? current
        : data.emails[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.loadError);
    } finally {
      setLoading(false);
    }
  }, [c.loadError, campaignFilter, statusFilter]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    if (isCreating) return;
    setForm(selected ? formFromEmail(selected) : emptyForm());
  }, [isCreating, selected]);

  const updateForm = (key: keyof OutreachForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const buildPayload = () => {
    let attachments: OutreachAttachment[];
    let metadata: Record<string, unknown>;

    try {
      attachments = parseJsonField<OutreachAttachment[]>(form.attachmentsText, []);
    } catch {
      throw new Error(c.invalidJson("attachments"));
    }

    try {
      metadata = parseJsonField<Record<string, unknown>>(form.metadataText, {});
    } catch {
      throw new Error(c.invalidJson("metadata"));
    }

    return {
      campaign_name: form.campaign_name.trim() || undefined,
      lead_name: form.lead_name.trim() || undefined,
      lead_email: form.lead_email.trim(),
      organization_name: form.organization_name.trim() || undefined,
      audience_type: form.audience_type.trim() || undefined,
      subject: form.subject.trim(),
      html_body: textToHtml(form.html_body),
      attachments,
      metadata: {
        ...metadata,
        ...(form.researchNotes.trim() ? { research_notes: form.researchNotes.trim() } : {}),
      },
    };
  };

  const startNewDraft = () => {
    setIsCreating(true);
    setSelectedId(null);
    setForm(emptyForm());
    setError(null);
    setMessage(null);
  };

  const createDraft = async () => {
    const token = getToken();
    if (!token) return null;
    setAction("create");
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<OutreachMutationResponse>("/admin/outreach/emails", {
        token,
        method: "POST",
        body: { ...buildPayload(), status: "drafted" },
      });
      setEmails((current) => [data.email, ...current]);
      setSelectedId(data.email.id);
      setIsCreating(false);
      setMessage(c.draftCreated);
      return data.email;
    } catch (err) {
      setError(err instanceof Error ? err.message : c.saveError);
      return null;
    } finally {
      setAction(null);
    }
  };

  const saveSelected = async () => {
    if (!selected) return null;
    const token = getToken();
    if (!token) return null;
    setAction("save");
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${selected.id}`, {
        token,
        method: "PATCH",
        body: buildPayload(),
      });
      setEmails((current) => current.map((email) => (email.id === selected.id ? data.email : email)));
      setMessage(c.saved);
      return data.email;
    } catch (err) {
      setError(err instanceof Error ? err.message : c.saveError);
      return null;
    } finally {
      setAction(null);
    }
  };

  const approveSelected = async () => {
    if (!selected) return;
    const token = getToken();
    if (!token) return;
    setAction("approve");
    setError(null);
    setMessage(null);
    try {
      const payload = buildPayload();
      const data = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${selected.id}`, {
        token,
        method: "PATCH",
        body: { ...payload, status: "approved" },
      });
      setEmails((current) => current.map((email) => (email.id === selected.id ? data.email : email)));
      setMessage(c.approved);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
    } finally {
      setAction(null);
    }
  };

  const quickApprove = async (email: OutreachEmail) => {
    const token = getToken();
    if (!token || email.status !== "drafted") return;
    setAction(`approve-${email.id}`);
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${email.id}`, {
        token,
        method: "PATCH",
        body: { status: "approved" },
      });
      setEmails((current) => current.map((item) => (item.id === email.id ? data.email : item)));
      setMessage(c.approved);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
    } finally {
      setAction(null);
    }
  };

  const approveAllVisibleDrafts = async () => {
    const token = getToken();
    if (!token) return;
    const drafts = filteredEmails.filter((email) => email.status === "drafted");
    if (!drafts.length) return;
    setAction("approveAll");
    setError(null);
    setMessage(null);
    let approvedCount = 0;
    try {
      for (const email of drafts) {
        const data = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${email.id}`, {
          token,
          method: "PATCH",
          body: { status: "approved" },
        });
        approvedCount += 1;
        setEmails((current) => current.map((item) => (item.id === email.id ? data.email : item)));
      }
      setMessage(c.approveAllDone(approvedCount));
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
    } finally {
      setAction(null);
    }
  };

  const skipSelected = async () => {
    if (!selected) return;
    const token = getToken();
    if (!token) return;
    setAction("skip");
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${selected.id}`, {
        token,
        method: "PATCH",
        body: { status: "skipped" },
      });
      setEmails((current) => current.map((email) => (email.id === selected.id ? data.email : email)));
      setMessage(c.skipped);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
    } finally {
      setAction(null);
    }
  };

  const sendTest = async () => {
    if (!selected) return;
    const token = getToken();
    if (!token) return;
    setAction("test");
    setError(null);
    setMessage(null);
    try {
      const payload = buildPayload();
      const metadata = {
        ...(payload.metadata ?? {}),
        test_copy: true,
        original_outreach_record_id: selected.id,
        original_recipient_email: selected.lead_email,
        test_recipient_email: TEST_RECIPIENT,
      };
      const created = await apiFetch<OutreachMutationResponse>("/admin/outreach/emails", {
        token,
        method: "POST",
        body: {
          ...payload,
          subject: payload.subject.startsWith("[TEST]") ? payload.subject : `[TEST] ${payload.subject}`,
          lead_email: TEST_RECIPIENT,
          lead_name: "Morten test",
          status: "approved",
          metadata,
        },
      });
      const sent = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${created.email.id}/send`, {
        token,
        method: "POST",
      });
      setEmails((current) => [sent.email, ...current]);
      setMessage(c.testSent(sent.email.resend_email_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
    } finally {
      setAction(null);
    }
  };

  const sendReal = async () => {
    if (!selected || selected.status !== "approved") return;
    if (!window.confirm(c.sendConfirm(selected.lead_email))) return;

    const token = getToken();
    if (!token) return;
    setAction("send");
    setError(null);
    setMessage(null);
    try {
      const sent = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${selected.id}/send`, {
        token,
        method: "POST",
      });
      setEmails((current) => current.map((email) => (email.id === selected.id ? sent.email : email)));
      setMessage(c.realSent(sent.email.resend_email_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
      await loadEmails();
    } finally {
      setAction(null);
    }
  };

  const disabled = Boolean(action) || (!isCreating && (!selected || ["sent", "sending"].includes(selected.status)));

  return (
    <main className="min-h-screen bg-[var(--gl-bg-cream)] px-4 py-8 md:px-8">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gl-green)]">{c.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--gl-ink)]">{c.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--gl-ink-muted)]">{c.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg border border-[var(--gl-green)] bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--gl-green-deep)]"
            onClick={startNewDraft}
            disabled={Boolean(action)}
            type="button"
          >
            {c.actions.newDraft}
          </button>
          <button
            className="rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink)] shadow-sm hover:bg-[var(--gl-card-cream)]"
            onClick={loadEmails}
            disabled={loading || Boolean(action)}
            type="button"
          >
            {c.actions.reload}
          </button>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          [c.kpis.total, counts.total],
          [c.kpis.drafted, counts.drafted],
          [c.kpis.approved, counts.approved],
          [c.kpis.sent, counts.sent],
          [c.kpis.failed, counts.failed],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--gl-ink)]">{value}</p>
          </div>
        ))}
      </section>

      <section className="mb-5 grid gap-3 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm md:grid-cols-3">
        <select
          className="rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm text-[var(--gl-ink)]"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">{c.filters.allStatuses}</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>{c.statuses[status]}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm text-[var(--gl-ink)]"
          value={audienceFilter}
          onChange={(event) => setAudienceFilter(event.target.value)}
        >
          <option value="">{c.filters.allAudiences}</option>
          {audienceOptions.map((audience) => (
            <option key={audience} value={audience}>{audience}</option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <span className="sr-only">{c.filters.campaign}</span>
          <input
            className="w-full rounded-lg border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm text-[var(--gl-ink)]"
            value={campaignFilter}
            onChange={(event) => setCampaignFilter(event.target.value)}
            placeholder={c.filters.campaignPlaceholder}
          />
        </label>
      </section>

      <section className="mb-5 flex flex-col gap-2 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--gl-ink-muted)]">
          {filteredEmails.filter((email) => email.status === "drafted").length} {c.kpis.drafted.toLowerCase()}
        </p>
        <button
          className="rounded-lg border border-[var(--gl-green)] bg-white px-4 py-2 text-sm font-bold text-[var(--gl-green-deep)] shadow-sm hover:bg-[var(--gl-green-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={approveAllVisibleDrafts}
          disabled={Boolean(action) || !filteredEmails.some((email) => email.status === "drafted")}
        >
          {action === "approveAll" ? "..." : c.actions.approveAll}
        </button>
      </section>

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.25fr)]">
        <div className="overflow-hidden rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
          <div className="border-b border-[var(--gl-hairline)] p-4">
            <h2 className="text-lg font-bold text-[var(--gl-ink)]">{c.list.title}</h2>
          </div>
          <div className="max-h-[780px] overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm text-[var(--gl-ink-muted)]">{c.list.loading}</p>
            ) : filteredEmails.length === 0 ? (
              <p className="p-5 text-sm text-[var(--gl-ink-muted)]">{c.list.empty}</p>
            ) : (
              <div className="divide-y divide-[var(--gl-hairline)]">
                {filteredEmails.map((email) => {
                  const selectedRow = email.id === selectedId;
                  return (
                    <div
                      key={email.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedId(email.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setIsCreating(false);
                          setSelectedId(email.id);
                        }
                      }}
                      className={`block w-full px-4 py-4 text-left transition ${
                        selectedRow ? "bg-[var(--gl-green-soft)]" : "hover:bg-[var(--gl-card-cream)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--gl-ink)]">
                            {email.organization_name || email.lead_name || email.lead_email}
                          </p>
                          <p className="mt-1 truncate text-xs text-[var(--gl-ink-muted)]">{email.lead_email}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getStatusTone(email.status)}`}>
                            {c.statuses[email.status]}
                          </span>
                          {email.status === "drafted" ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                quickApprove(email);
                              }}
                              className="rounded-full border border-[var(--gl-green)] bg-white px-2 py-1 text-[11px] font-bold text-[var(--gl-green-deep)] hover:bg-[var(--gl-green-soft)]"
                            >
                              {action === `approve-${email.id}` ? "..." : c.actions.quickApprove}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-semibold text-[var(--gl-ink)]">
                        {email.subject || c.list.noSubject}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--gl-ink-muted)]">
                        <span>{email.audience_type || "-"}</span>
                        <span className="truncate text-right">{email.campaign_name || "-"}</span>
                        <span>{c.list.created}: {formatDate(email.created_at)}</span>
                        <span className="truncate text-right">{email.error_message ? `${c.list.error}: ${email.error_message}` : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[var(--gl-ink)]">{isCreating ? c.editor.newTitle : c.editor.title}</h2>
              {selected && !isCreating ? (
                <p className="mt-1 text-sm text-[var(--gl-ink-muted)]">
                  {c.editor.recipient}: <span className="font-semibold text-[var(--gl-ink)]">{selected.lead_email}</span>
                </p>
              ) : null}
            </div>
            {selected && !isCreating ? (
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(selected.status)}`}>
                {c.statuses[selected.status]}
              </span>
            ) : null}
          </div>

          {!selected && !isCreating ? (
            <p className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-5 text-sm text-[var(--gl-ink-muted)]">
              {c.editor.empty}
            </p>
          ) : (
            <div className="space-y-5">
              {!isCreating ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  {c.editor.realRecipientWarning}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={c.editor.organizationName} value={form.organization_name} onChange={(value) => updateForm("organization_name", value)} disabled={disabled} />
                <Field label={c.editor.audienceType} value={form.audience_type} onChange={(value) => updateForm("audience_type", value)} disabled={disabled} />
                <Field label={c.editor.leadName} value={form.lead_name} onChange={(value) => updateForm("lead_name", value)} disabled={disabled} />
                <Field label={c.editor.leadEmail} value={form.lead_email} onChange={(value) => updateForm("lead_email", value)} disabled={disabled} />
                <Field label={c.editor.campaignName} value={form.campaign_name} onChange={(value) => updateForm("campaign_name", value)} disabled={disabled} />
              </div>

              <Field label={c.editor.subject} value={form.subject} onChange={(value) => updateForm("subject", value)} disabled={disabled} />

              <div>
                <Label>{c.editor.htmlBody}</Label>
                <textarea
                  className="min-h-[260px] w-full rounded-xl border border-[var(--gl-hairline)] bg-white px-3 py-2 font-mono text-xs leading-5 text-[var(--gl-ink)]"
                  value={form.html_body}
                  onChange={(event) => updateForm("html_body", event.target.value)}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>{c.editor.researchNotes}</Label>
                <textarea
                  className="min-h-[120px] w-full rounded-xl border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm leading-5 text-[var(--gl-ink)]"
                  value={form.researchNotes}
                  onChange={(event) => updateForm("researchNotes", event.target.value)}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label>{c.editor.preview}</Label>
                <iframe
                  title="Outreach email preview"
                  srcDoc={buildPreviewHtml(form.html_body)}
                  sandbox=""
                  className="h-[360px] w-full rounded-xl border border-[var(--gl-hairline)] bg-white"
                />
              </div>

              <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{c.editor.sourceLinks}</p>
                {sourceLinks.length ? (
                  <div className="mt-2 space-y-1">
                    {sourceLinks.map((link) => (
                      <a
                        key={link}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-semibold text-[var(--gl-green-deep)] underline"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--gl-ink-muted)]">{c.editor.noSourceLinks}</p>
                )}
              </div>

              {selected && (selected.resend_email_id || selected.error_message) ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {selected.resend_email_id ? (
                    <InfoCard label={c.editor.resendId} value={selected.resend_email_id} />
                  ) : null}
                  {selected.error_message ? (
                    <InfoCard label={c.editor.errorMessage} value={selected.error_message} tone="danger" />
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 border-t border-[var(--gl-hairline)] pt-5 md:flex-row md:flex-wrap">
                {isCreating ? (
                  <ActionButton onClick={createDraft} disabled={Boolean(action)} loading={action === "create"}>
                    {c.actions.createDraft}
                  </ActionButton>
                ) : (
                  <>
                    <ActionButton onClick={saveSelected} disabled={disabled} loading={action === "save"}>{c.actions.save}</ActionButton>
                    <ActionButton onClick={approveSelected} disabled={disabled} loading={action === "approve"}>{c.actions.approve}</ActionButton>
                    <ActionButton onClick={sendTest} disabled={disabled} loading={action === "test"} tone="neutral">{c.actions.sendTest}</ActionButton>
                    <ActionButton
                      onClick={sendReal}
                      disabled={Boolean(action) || !selected || selected.status !== "approved"}
                      loading={action === "send"}
                      tone="primary"
                    >
                      {c.actions.sendReal}
                    </ActionButton>
                    <ActionButton onClick={skipSelected} disabled={Boolean(action) || !selected || selected.status === "sent"} loading={action === "skip"} tone="danger">
                      {c.actions.skip}
                    </ActionButton>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-sm font-semibold text-[var(--gl-ink-soft)]">{children}</p>;
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        className="w-full rounded-xl border border-[var(--gl-hairline)] bg-white px-3 py-2 text-sm text-[var(--gl-ink)] disabled:bg-[var(--gl-card-cream)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  loading,
  tone = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "primary" | "neutral" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
      : tone === "neutral"
        ? "border-[var(--gl-hairline)] bg-white text-[var(--gl-ink)] hover:bg-[var(--gl-card-cream)]"
        : "border-[var(--gl-green)] bg-[var(--gl-green)] text-white hover:bg-[var(--gl-green-deep)]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {loading ? "..." : children}
    </button>
  );
}

function InfoCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "danger" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "danger" ? "border-red-200 bg-red-50" : "border-[var(--gl-hairline)] bg-[var(--gl-card-cream)]"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gl-ink-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[var(--gl-ink)]">{value}</p>
    </div>
  );
}
