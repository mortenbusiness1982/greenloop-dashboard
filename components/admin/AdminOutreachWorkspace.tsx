"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { DashboardLanguage, useDashboardLanguage } from "@/components/crm/DashboardLanguage";

type OutreachStatus =
  | "drafted"
  | "approved"
  | "saved_for_later"
  | "disregarded"
  | "deleted"
  | "sending"
  | "sent"
  | "failed"
  | "skipped";

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

type OutreachDeleteResponse = {
  ok: boolean;
  id?: string;
  deleted?: number;
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

const statusOptions: OutreachStatus[] = ["drafted", "approved", "saved_for_later", "disregarded", "deleted", "failed"];

const copy: Record<DashboardLanguage, {
  eyebrow: string;
  title: string;
  description: string;
  loadError: string;
  saveError: string;
  actionError: string;
  saved: string;
  approved: string;
  savedForLater: string;
  disregarded: string;
  approveAllConfirm: (count: number) => string;
  approveAllDone: (count: number) => string;
  deleteAllConfirm: (count: number) => string;
  deleteAllDone: (count: number) => string;
  deleteConfirm: string;
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
    activeTitle: string;
    bucketDrafts: string;
    bucketReady: string;
    bucketLater: string;
    bucketDisregarded: string;
    bucketDeleted: string;
    archiveTitle: string;
    archiveDescription: string;
    empty: string;
    archiveEmpty: string;
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
    advancedDetails: string;
    realRecipientWarning: string;
    resendId: string;
    errorMessage: string;
    contactQuality: string;
    whyThisLead: string;
    noLeadReason: string;
    editMessage: string;
    attachments: string;
    noAttachments: string;
    openAttachment: string;
  };
  badges: {
    highValue: string;
    assetRecommended: string;
    namedContactEmail: string;
    namedContactGenericEmail: string;
    organizationEmail: string;
    emailOnly: string;
    contactNameOnly: string;
    genericContact: string;
    missingContact: string;
    genericEmail: string;
    needsContact: string;
  };
  actions: {
    reload: string;
    newDraft: string;
    save: string;
    createDraft: string;
    approve: string;
    approveAll: string;
    deleteSelected: string;
    deleteAll: string;
    saveForLater: string;
    sentArchive: string;
    close: string;
    quickApprove: string;
    sendTest: string;
    sendReal: string;
    skip: string;
    disregard: string;
    sending: string;
  };
  statuses: Record<OutreachStatus, string>;
}> = {
  en: {
    eyebrow: "Outreach",
    title: "Outreach drafts",
    description: "A daily decision desk for research-backed drafts: check the contact, review the reason, approve, test, then send manually.",
    loadError: "Unable to load outreach drafts",
    saveError: "Unable to save outreach draft",
    actionError: "Outreach action failed",
    saved: "Draft saved.",
    approved: "Draft approved.",
    savedForLater: "Draft saved for later.",
    disregarded: "Draft moved to disregarded drafts.",
    approveAllConfirm: (count) => `Approve ${count} visible drafts?`,
    approveAllDone: (count) => `${count} drafts approved.`,
    deleteAllConfirm: (count) => `Delete ${count} visible unsent outreach records? Sent emails will stay in the archive.`,
    deleteAllDone: (count) => `${count} outreach records deleted.`,
    deleteConfirm: "Delete this unsent outreach record? Sent emails are retained in the archive.",
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
      activeTitle: "Drafts",
      bucketDrafts: "Drafts",
      bucketReady: "Ready to send",
      bucketLater: "Saved for later",
      bucketDisregarded: "Disregarded drafts",
      bucketDeleted: "Deleted items",
      archiveTitle: "Sent approvals archive",
      archiveDescription: "Sent emails stay here as the audit trail so GreenLoop does not contact the same lead twice by accident.",
      empty: "No outreach records match these filters.",
      archiveEmpty: "No sent outreach emails yet.",
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
      advancedDetails: "Advanced details",
      realRecipientWarning: "Real sends are locked until the record is approved. Test sends create a separate approved copy and never overwrite this recipient.",
      resendId: "Resend ID",
      errorMessage: "Error message",
      contactQuality: "Contact quality",
      whyThisLead: "Why this lead?",
      noLeadReason: "No lead reason saved yet. Ask the research agent to include why_this_lead in metadata.",
      editMessage: "Edit message",
      attachments: "Attachments",
      noAttachments: "No PDF attachment saved on this draft.",
      openAttachment: "Open PDF",
    },
    badges: {
      highValue: "High value",
      assetRecommended: "Asset recommended",
      namedContactEmail: "Named person + email",
      namedContactGenericEmail: "Named person + company email",
      organizationEmail: "Organization email",
      emailOnly: "Email only",
      contactNameOnly: "Contact name only",
      genericContact: "Generic contact",
      missingContact: "Missing contact",
      genericEmail: "Generic email",
      needsContact: "Needs contact",
    },
    actions: {
      reload: "Reload",
      newDraft: "New draft",
      save: "Save changes",
      createDraft: "Create draft",
      approve: "Approve draft",
      approveAll: "Approve visible",
      deleteSelected: "Delete draft",
      deleteAll: "Delete visible",
      saveForLater: "Save for later",
      sentArchive: "Sent",
      close: "Close",
      quickApprove: "Approve",
      sendTest: "Send test",
      sendReal: "Send approved email",
      skip: "Mark not suitable",
      disregard: "Disregard draft",
      sending: "Working...",
    },
    statuses: {
      drafted: "Drafted",
      approved: "Ready to send",
      saved_for_later: "Saved for later",
      disregarded: "Disregarded",
      deleted: "Deleted",
      sending: "Sending",
      sent: "Sent",
      failed: "Failed",
      skipped: "Disregarded",
    },
  },
  es: {
    eyebrow: "Prospección",
    title: "Borradores de prospección",
    description: "Una mesa diaria para decidir: revisa el contacto, entiende el motivo, aprueba, prueba y envía manualmente.",
    loadError: "No se pudieron cargar los borradores",
    saveError: "No se pudo guardar el borrador",
    actionError: "Falló la acción de outreach",
    saved: "Borrador guardado.",
    approved: "Borrador aprobado.",
    savedForLater: "Borrador guardado para más adelante.",
    disregarded: "Borrador movido a descartados.",
    approveAllConfirm: (count) => `¿Aprobar ${count} borradores visibles?`,
    approveAllDone: (count) => `${count} borradores aprobados.`,
    deleteAllConfirm: (count) => `¿Eliminar ${count} registros visibles sin enviar? Los emails enviados se conservarán en el archivo.`,
    deleteAllDone: (count) => `${count} registros eliminados.`,
    deleteConfirm: "¿Eliminar este registro sin enviar? Los emails enviados se conservan en el archivo.",
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
      activeTitle: "Borradores",
      bucketDrafts: "Borradores",
      bucketReady: "Listos para enviar",
      bucketLater: "Guardados para luego",
      bucketDisregarded: "Borradores descartados",
      bucketDeleted: "Eliminados",
      archiveTitle: "Archivo de aprobaciones enviadas",
      archiveDescription: "Los emails enviados se guardan aquí como historial para que GreenLoop no contacte dos veces al mismo lead por accidente.",
      empty: "No hay registros que coincidan con estos filtros.",
      archiveEmpty: "Todavía no hay emails enviados.",
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
      advancedDetails: "Detalles avanzados",
      realRecipientWarning: "El envío real está bloqueado hasta aprobar el registro. Las pruebas crean una copia aprobada y nunca sobrescriben este destinatario.",
      resendId: "ID de Resend",
      errorMessage: "Mensaje de error",
      contactQuality: "Calidad del contacto",
      whyThisLead: "¿Por qué este lead?",
      noLeadReason: "No hay motivo guardado todavía. Pide al agente de research que incluya why_this_lead en metadata.",
      editMessage: "Editar mensaje",
      attachments: "Adjuntos",
      noAttachments: "Este borrador no tiene PDF adjunto guardado.",
      openAttachment: "Abrir PDF",
    },
    badges: {
      highValue: "Alto valor",
      assetRecommended: "Asset recomendado",
      namedContactEmail: "Persona + email directo",
      namedContactGenericEmail: "Persona + email empresa",
      organizationEmail: "Email de organización",
      emailOnly: "Solo email",
      contactNameOnly: "Solo nombre",
      genericContact: "Contacto genérico",
      missingContact: "Falta contacto",
      genericEmail: "Email genérico",
      needsContact: "Necesita contacto",
    },
    actions: {
      reload: "Recargar",
      newDraft: "Nuevo borrador",
      save: "Guardar cambios",
      createDraft: "Crear borrador",
      approve: "Aprobar borrador",
      approveAll: "Aprobar visibles",
      deleteSelected: "Eliminar borrador",
      deleteAll: "Eliminar visibles",
      saveForLater: "Guardar para luego",
      sentArchive: "Enviados",
      close: "Cerrar",
      quickApprove: "Aprobar",
      sendTest: "Enviar prueba",
      sendReal: "Enviar email aprobado",
      skip: "Marcar no adecuado",
      disregard: "Descartar borrador",
      sending: "Procesando...",
    },
    statuses: {
      drafted: "Borrador",
      approved: "Listo para enviar",
      saved_for_later: "Guardado para luego",
      disregarded: "Descartado",
      deleted: "Eliminado",
      sending: "Enviando",
      sent: "Enviado",
      failed: "Fallido",
      skipped: "Descartado",
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

type ContactQualityKey =
  | "namedContactEmail"
  | "namedContactGenericEmail"
  | "organizationEmail"
  | "emailOnly"
  | "contactNameOnly"
  | "genericContact"
  | "missingContact";

const genericEmailPrefixes = ["info", "hello", "contact", "admin", "sales", "marketing", "office", "support", "hola", "correo", "comunicacion"];
const nonPersonLeadNames = ["organization contact", "company contact", "contact", "team", "marketing", "management", "admin", "info", "general", "hotel", "restaurant"];

function metadataText(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return "";
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function metadataNumber(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  const text = metadataText(metadata, keys);
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

function metadataFlag(metadata: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!metadata) return false;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["yes", "true", "1", "recommended", "high", "alto", "si", "sí"].includes(normalized)) return true;
      if (["no", "false", "0"].includes(normalized)) return false;
    }
  }
  return false;
}

function isGenericEmail(email?: string | null) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return false;
  const local = normalized.split("@")[0];
  return genericEmailPrefixes.some((prefix) => local === prefix || local.startsWith(`${prefix}.`) || local.startsWith(`${prefix}-`));
}

function normalizeContactText(value?: string | null) {
  return value
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim() ?? "";
}

function looksLikePersonName(leadName?: string | null, organizationName?: string | null) {
  const name = normalizeContactText(leadName);
  if (!name) return false;

  const organization = normalizeContactText(organizationName);
  if (organization && (name === organization || name.includes(organization) || organization.includes(name))) return false;
  if (nonPersonLeadNames.some((generic) => name === generic || name.includes(` ${generic} `) || name.endsWith(` ${generic}`))) return false;

  const parts = name.split(/\s+/).filter(Boolean);
  return parts.length >= 2;
}

function getContactQuality(email: Pick<OutreachEmail, "lead_name" | "lead_email" | "organization_name">): ContactQualityKey {
  const hasEmail = Boolean(email.lead_email?.trim());
  const generic = isGenericEmail(email.lead_email);
  const hasPersonName = looksLikePersonName(email.lead_name, email.organization_name);
  const hasAnyName = Boolean(email.lead_name?.trim());

  if (hasPersonName && hasEmail && !generic) return "namedContactEmail";
  if (hasPersonName && hasEmail) return "namedContactGenericEmail";
  if (hasEmail && generic) return "genericContact";
  if (hasEmail) return "organizationEmail";
  if (hasPersonName || hasAnyName) return "contactNameOnly";
  return "missingContact";
}

function getResearchReason(metadata: Record<string, unknown> | null | undefined) {
  return metadataText(metadata, [
    "research_notes",
    "researchNotes",
    "why_this_lead",
    "whyThisLead",
    "why_it_matters",
    "greenloop_fit",
    "personalization_reason",
    "notes",
  ]);
}

function getPriorityConfidence(metadata: Record<string, unknown> | null | undefined) {
  return {
    priority: metadataNumber(metadata, ["priority_score", "priorityScore", "priority"]),
    confidence: metadataNumber(metadata, ["confidence_score", "confidenceScore", "confidence"]),
  };
}

function isHighValue(email: OutreachEmail) {
  const metadata = email.metadata ?? {};
  if (metadataFlag(metadata, ["high_value", "highValue"])) return true;
  const { priority, confidence } = getPriorityConfidence(metadata);
  return priority !== null && confidence !== null && priority >= 8 && confidence >= 7;
}

function isAssetRecommended(email: OutreachEmail) {
  const metadata = email.metadata ?? {};
  return metadataFlag(metadata, ["asset_recommended", "assetRecommended", "personalized_asset", "personalizedAsset"]);
}

function compactSummary(parts: Array<string | number | null | undefined>) {
  return parts.filter((part) => part !== null && part !== undefined && String(part).trim()).join(" · ");
}

function getStatusTone(status: OutreachStatus) {
  if (status === "sent") return "bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)] border-[var(--gl-green)]/25";
  if (status === "approved") return "bg-[var(--gl-coral-soft)] text-[var(--gl-coral-ink)] border-[var(--gl-coral)]/30";
  if (status === "failed") return "bg-red-50 text-red-800 border-red-200";
  if (status === "saved_for_later") return "bg-blue-50 text-blue-800 border-blue-200";
  if (status === "disregarded" || status === "skipped") return "bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)] border-[var(--gl-hairline)]";
  if (status === "deleted") return "bg-red-50 text-red-800 border-red-200";
  if (status === "sending") return "bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)] border-[var(--gl-amber)]/30";
  return "bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)] border-[var(--gl-hairline)]";
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

function extractBodyContent(value: string) {
  const match = value.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1]?.trim() || value;
}

function buildPreviewHtml(htmlBody: string) {
  const source = extractBodyContent(htmlBody.trim());
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

  return `
    <div style="font-family:Arial,sans-serif;font-size:15px;line-height:22px;color:#123127;">
      ${body}
      ${signature}
    </div>
  `;
}

function getAttachmentHref(attachment: OutreachAttachment) {
  if (attachment.content) {
    const contentType = attachment.content_type || attachment.contentType || "application/pdf";
    return `data:${contentType};base64,${attachment.content}`;
  }

  if (attachment.path && /^https?:\/\//i.test(attachment.path)) {
    return attachment.path;
  }

  return null;
}

function parseAttachmentsForDisplay(text: string): OutreachAttachment[] {
  try {
    const attachments = parseJsonField<OutreachAttachment[]>(text, []);
    return Array.isArray(attachments) ? attachments.filter((attachment) => attachment?.filename) : [];
  } catch {
    return [];
  }
}

export function AdminOutreachWorkspace() {
  const { language } = useDashboardLanguage();
  const c = copy[language];
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("drafted");
  const [audienceFilter, setAudienceFilter] = useState<string>("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<OutreachForm>(() => emptyForm());
  const [isCreating, setIsCreating] = useState(false);
  const [sentArchiveOpen, setSentArchiveOpen] = useState(false);
  const [advancedDetailsOpen, setAdvancedDetailsOpen] = useState(false);

  const selected = useMemo(
    () => emails.find((email) => email.id === selectedId) ?? null,
    [emails, selectedId]
  );

  const filteredEmails = useMemo(() => {
    return emails.filter((email) => {
      if (statusFilter && email.status !== statusFilter) return false;
      if (!statusFilter && email.status === "deleted") return false;
      if (audienceFilter && email.audience_type !== audienceFilter) return false;
      return true;
    });
  }, [audienceFilter, emails, statusFilter]);

  const activeEmails = useMemo(
    () => filteredEmails.filter((email) => email.status !== "sent"),
    [filteredEmails]
  );

  const sentEmails = useMemo(
    () => emails.filter((email) => email.status === "sent"),
    [emails]
  );

  const audienceOptions = useMemo(() => uniqueStrings(emails.map((email) => email.audience_type)), [emails]);

  const counts = useMemo(() => {
    return emails.reduce(
      (acc, email) => {
        acc.total += 1;
        if (email.status in acc) acc[email.status as keyof typeof acc] += 1;
        return acc;
      },
      { total: 0, drafted: 0, approved: 0, saved_for_later: 0, disregarded: 0, deleted: 0, sent: 0, failed: 0, skipped: 0, sending: 0 }
    );
  }, [emails]);

  const sourceLinks = useMemo(() => {
    try {
      return extractSourceLinks(parseJsonField<Record<string, unknown>>(form.metadataText, {}));
    } catch {
      return [];
    }
  }, [form.metadataText]);

  const formMetadata = useMemo(() => {
    try {
      return parseJsonField<Record<string, unknown>>(form.metadataText, {});
    } catch {
      return {};
    }
  }, [form.metadataText]);

  const selectedContactQuality = getContactQuality({ lead_name: form.lead_name, lead_email: form.lead_email, organization_name: form.organization_name });
  const selectedResearchReason = getResearchReason(formMetadata);
  const selectedPriorityConfidence = getPriorityConfidence(formMetadata);
  const selectedHighValue = selected ? isHighValue(selected) : metadataFlag(formMetadata, ["high_value", "highValue"]);
  const selectedAssetRecommended = selected ? isAssetRecommended(selected) : metadataFlag(formMetadata, ["asset_recommended", "assetRecommended", "personalized_asset", "personalizedAsset"]);
  const formAttachments = useMemo(() => parseAttachmentsForDisplay(form.attachmentsText), [form.attachmentsText]);

  const loadEmails = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (campaignFilter.trim()) params.set("campaign", campaignFilter.trim());
      const suffix = params.toString() ? `?${params.toString()}` : "";
      const data = await apiFetch<OutreachListResponse>(`/admin/outreach/emails${suffix}`, { token });
      setEmails(data.emails ?? []);
      const firstActiveId = data.emails.find((email) => email.status !== "sent" && email.status !== "deleted")?.id ?? null;
      setSelectedId((current) => current && data.emails.some((email) => email.id === current)
        ? current
        : firstActiveId);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.loadError);
    } finally {
      setLoading(false);
    }
  }, [c.loadError, campaignFilter]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    if (isCreating) return;
    setForm(selected ? formFromEmail(selected) : emptyForm());
    setAdvancedDetailsOpen(false);
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
    if (!token || !["drafted", "saved_for_later"].includes(email.status)) return;
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
    const drafts = activeEmails.filter((email) => ["drafted", "saved_for_later"].includes(email.status));
    if (!drafts.length) return;
    if (!window.confirm(c.approveAllConfirm(drafts.length))) return;
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

  const deleteSelected = async () => {
    if (!selected || selected.status === "sent" || selected.status === "sending") return;
    if (!window.confirm(c.deleteConfirm)) return;

    const token = getToken();
    if (!token) return;
    setAction("delete");
    setError(null);
    setMessage(null);
    try {
      await apiFetch<OutreachDeleteResponse>(`/admin/outreach/emails/${selected.id}`, {
        token,
        method: "DELETE",
      });
      setEmails((current) => current.map((email) => (
        email.id === selected.id
          ? { ...email, status: "deleted", approved_at: null, updated_at: new Date().toISOString() }
          : email
      )));
      setSelectedId((current) => (current === selected.id ? null : current));
      setMessage(c.deleteAllDone(1));
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
    } finally {
      setAction(null);
    }
  };

  const deleteAllVisibleUnsent = async () => {
    const token = getToken();
    if (!token) return;
    const deletable = activeEmails.filter((email) => email.status !== "sending" && email.status !== "deleted");
    if (!deletable.length) return;
    if (!window.confirm(c.deleteAllConfirm(deletable.length))) return;

    setAction("deleteAll");
    setError(null);
    setMessage(null);
    let deletedCount = 0;
    try {
      for (const email of deletable) {
        await apiFetch<OutreachDeleteResponse>(`/admin/outreach/emails/${email.id}`, {
          token,
          method: "DELETE",
        });
        deletedCount += 1;
      }
      const deletedIds = new Set(deletable.map((email) => email.id));
      setEmails((current) => current.map((email) => (
        deletedIds.has(email.id)
          ? { ...email, status: "deleted", approved_at: null, updated_at: new Date().toISOString() }
          : email
      )));
      setSelectedId((current) => (current && deletedIds.has(current) ? null : current));
      setMessage(c.deleteAllDone(deletedCount));
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
      await loadEmails();
    } finally {
      setAction(null);
    }
  };

  const saveForLaterSelected = async () => {
    if (!selected) return;
    const token = getToken();
    if (!token) return;
    setAction("saveForLater");
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${selected.id}`, {
        token,
        method: "PATCH",
        body: { status: "saved_for_later" },
      });
      setEmails((current) => current.map((email) => (email.id === selected.id ? data.email : email)));
      setMessage(c.savedForLater);
    } catch (err) {
      setError(err instanceof Error ? err.message : c.actionError);
    } finally {
      setAction(null);
    }
  };

  const disregardSelected = async () => {
    if (!selected) return;
    const token = getToken();
    if (!token) return;
    setAction("disregard");
    setError(null);
    setMessage(null);
    try {
      const data = await apiFetch<OutreachMutationResponse>(`/admin/outreach/emails/${selected.id}`, {
        token,
        method: "PATCH",
        body: { status: "disregarded" },
      });
      setEmails((current) => current.map((email) => (email.id === selected.id ? data.email : email)));
      setMessage(c.disregarded);
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

  const disabled = Boolean(action) || (!isCreating && (!selected || ["sent", "sending", "deleted"].includes(selected.status)));

  return (
    <div className="space-y-5">
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gl-green)]">{c.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--gl-ink)]">{c.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--gl-ink-muted)]">{c.description}</p>
        </div>
        <div className="flex max-w-full flex-wrap gap-2 lg:max-w-[620px] lg:justify-end">
          <button
            className="whitespace-nowrap rounded-lg border border-[var(--gl-green)] bg-[var(--gl-green)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--gl-green-deep)]"
            onClick={startNewDraft}
            disabled={Boolean(action)}
            type="button"
          >
            {c.actions.newDraft}
          </button>
          <button
            className="whitespace-nowrap rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink)] shadow-sm hover:bg-[var(--gl-card-cream)]"
            onClick={loadEmails}
            disabled={loading || Boolean(action)}
            type="button"
          >
            {c.actions.reload}
          </button>
          <button
            className="whitespace-nowrap rounded-lg border border-[var(--gl-hairline)] bg-[var(--gl-paper)] px-4 py-2 text-sm font-semibold text-[var(--gl-ink)] shadow-sm hover:bg-[var(--gl-card-cream)]"
            onClick={() => setSentArchiveOpen(true)}
            type="button"
          >
            {c.actions.sentArchive} ({sentEmails.length})
          </button>
        </div>
      </section>

      <section className="mb-5 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-semibold text-[var(--gl-ink)]">
            {compactSummary([
              `${counts.drafted} ${c.kpis.drafted.toLowerCase()}`,
              `${counts.approved} ${c.kpis.approved.toLowerCase()}`,
              `${counts.saved_for_later} ${c.list.bucketLater.toLowerCase()}`,
              `${counts.disregarded + counts.skipped} ${c.list.bucketDisregarded.toLowerCase()}`,
              `${counts.sent} ${c.kpis.sent.toLowerCase()}`,
              counts.failed ? `${counts.failed} ${c.kpis.failed.toLowerCase()}` : null,
            ])}
          </p>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              className="whitespace-nowrap rounded-lg border border-[var(--gl-coral)] bg-white px-4 py-2 text-sm font-bold text-[var(--gl-coral-ink)] shadow-sm hover:bg-[var(--gl-coral-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={deleteAllVisibleUnsent}
              disabled={Boolean(action) || !activeEmails.some((email) => email.status !== "sending" && email.status !== "deleted")}
            >
              {action === "deleteAll" ? "..." : c.actions.deleteAll}
            </button>
            <button
              className="whitespace-nowrap rounded-lg border border-[var(--gl-green)] bg-white px-4 py-2 text-sm font-bold text-[var(--gl-green-deep)] shadow-sm hover:bg-[var(--gl-green-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={approveAllVisibleDrafts}
              disabled={Boolean(action) || !activeEmails.some((email) => ["drafted", "saved_for_later"].includes(email.status))}
            >
              {action === "approveAll" ? "..." : c.actions.approveAll}
            </button>
          </div>
        </div>
      </section>

      <section className="mb-5 flex flex-wrap gap-2 rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] p-3 shadow-sm">
        {[
          ["drafted", c.list.bucketDrafts, counts.drafted],
          ["approved", c.list.bucketReady, counts.approved],
          ["saved_for_later", c.list.bucketLater, counts.saved_for_later],
          ["disregarded", c.list.bucketDisregarded, counts.disregarded + counts.skipped],
          ["deleted", c.list.bucketDeleted, counts.deleted],
        ].map(([status, label, count]) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(String(status))}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
              statusFilter === status
                ? "border-[var(--gl-green)] bg-[var(--gl-green)] text-white"
                : "border-[var(--gl-hairline)] bg-white text-[var(--gl-ink)] hover:bg-[var(--gl-card-cream)]"
            }`}
          >
            {label} <span className="opacity-70">{count}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStatusFilter("")}
          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
            statusFilter === ""
              ? "border-[var(--gl-green)] bg-[var(--gl-green)] text-white"
              : "border-[var(--gl-hairline)] bg-white text-[var(--gl-ink)] hover:bg-[var(--gl-card-cream)]"
          }`}
        >
          {c.filters.allStatuses}
        </button>
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

      {error ? (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-5 rounded-xl border border-[var(--gl-green)]/25 bg-[var(--gl-green-soft)] px-4 py-3 text-sm font-semibold text-[var(--gl-green-deep)]">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.25fr)]">
        <div className="overflow-hidden rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-sm">
          <div className="border-b border-[var(--gl-hairline)] p-4">
            <h2 className="text-lg font-bold text-[var(--gl-ink)]">{c.list.activeTitle}</h2>
          </div>
          <div className="max-h-[780px] overflow-y-auto">
            {loading ? (
              <p className="p-5 text-sm text-[var(--gl-ink-muted)]">{c.list.loading}</p>
            ) : activeEmails.length === 0 ? (
              <p className="p-5 text-sm text-[var(--gl-ink-muted)]">{c.list.empty}</p>
            ) : (
              <div className="divide-y divide-[var(--gl-hairline)]">
                {activeEmails.map((email) => {
                  const selectedRow = email.id === selectedId;
                  const contactQuality = getContactQuality(email);
                  const researchReason = getResearchReason(email.metadata);
                  const { priority, confidence } = getPriorityConfidence(email.metadata);
                  const highValue = isHighValue(email);
                  const assetRecommended = isAssetRecommended(email);
                  const summary = compactSummary([
                    email.audience_type || null,
                    email.campaign_name || null,
                    priority !== null ? `P${priority}` : null,
                    confidence !== null ? `C${confidence}` : null,
                    `${c.list.created}: ${formatDate(email.created_at)}`,
                  ]);

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
                            {email.organization_name || email.lead_name || email.lead_email || c.list.noSubject}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--gl-ink)]">
                            {email.subject || c.list.noSubject}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${getStatusTone(email.status)}`}>
                            {c.statuses[email.status]}
                          </span>
                          {["drafted", "saved_for_later"].includes(email.status) ? (
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

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge tone={contactQuality === "missingContact" || contactQuality === "genericContact" ? "warning" : "green"}>
                          {c.badges[contactQuality]}
                        </Badge>
                        {highValue ? <Badge tone="amber">{c.badges.highValue}</Badge> : null}
                        {assetRecommended ? <Badge tone="blue">{c.badges.assetRecommended}</Badge> : null}
                        {email.error_message ? <Badge tone="danger">{c.list.error}</Badge> : null}
                      </div>

                      <p className="mt-3 truncate text-xs font-semibold text-[var(--gl-ink-muted)]">
                        {compactSummary([email.lead_name || null, email.lead_email || null]) || c.badges.needsContact}
                      </p>
                      {researchReason ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--gl-ink-muted)]">
                          <span className="font-bold text-[var(--gl-ink-soft)]">{c.editor.whyThisLead}:</span> {researchReason}
                        </p>
                      ) : null}
                      <p className="mt-3 truncate text-xs text-[var(--gl-ink-muted)]">{summary}</p>
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
                <div className="rounded-xl border border-[var(--gl-amber)]/30 bg-[var(--gl-amber-soft)] px-4 py-3 text-sm font-semibold text-[var(--gl-amber-ink)]">
                  {c.editor.realRecipientWarning}
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gl-ink-muted)]">{c.editor.contactQuality}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={selectedContactQuality === "missingContact" || selectedContactQuality === "genericContact" ? "warning" : "green"}>
                      {c.badges[selectedContactQuality]}
                    </Badge>
                    {selectedHighValue ? <Badge tone="amber">{c.badges.highValue}</Badge> : null}
                    {selectedAssetRecommended ? <Badge tone="blue">{c.badges.assetRecommended}</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--gl-ink)]">{form.lead_name || c.badges.contactNameOnly}</p>
                  <p className="mt-1 break-all text-sm text-[var(--gl-ink-muted)]">{form.lead_email || c.badges.needsContact}</p>
                </div>

                <div className="rounded-xl border border-[var(--gl-hairline)] bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--gl-ink-muted)]">{c.editor.whyThisLead}</p>
                  <p className={`mt-2 text-sm leading-6 ${selectedResearchReason ? "text-[var(--gl-ink)]" : "text-[var(--gl-ink-muted)]"}`}>
                    {selectedResearchReason || c.editor.noLeadReason}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-[var(--gl-ink-muted)]">
                    {compactSummary([
                      selectedPriorityConfidence.priority !== null ? `P${selectedPriorityConfidence.priority}` : null,
                      selectedPriorityConfidence.confidence !== null ? `C${selectedPriorityConfidence.confidence}` : null,
                      sourceLinks.length ? `${sourceLinks.length} ${c.editor.sourceLinks.toLowerCase()}` : null,
                    ]) || c.editor.noSourceLinks}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={c.editor.organizationName} value={form.organization_name} onChange={(value) => updateForm("organization_name", value)} disabled={disabled} />
                <Field label={c.editor.audienceType} value={form.audience_type} onChange={(value) => updateForm("audience_type", value)} disabled={disabled} />
                <Field label={c.editor.leadName} value={form.lead_name} onChange={(value) => updateForm("lead_name", value)} disabled={disabled} />
                <Field label={c.editor.leadEmail} value={form.lead_email} onChange={(value) => updateForm("lead_email", value)} disabled={disabled} />
                <Field label={c.editor.campaignName} value={form.campaign_name} onChange={(value) => updateForm("campaign_name", value)} disabled={disabled} />
              </div>

              <Field label={c.editor.subject} value={form.subject} onChange={(value) => updateForm("subject", value)} disabled={disabled} />

              <div>
                <Label>{c.editor.preview}</Label>
                <div className={`mb-3 rounded-xl border px-4 py-3 text-sm ${
                  formAttachments.length
                    ? "border-[var(--gl-green)]/25 bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]"
                    : "border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] text-[var(--gl-ink-muted)]"
                }`}>
                  <span className="font-bold text-[var(--gl-ink)]">{c.editor.attachments}:</span>
                  {formAttachments.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formAttachments.map((attachment) => {
                        const href = getAttachmentHref(attachment);
                        return href ? (
                          <a
                            key={attachment.filename}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            download={attachment.filename}
                            className="rounded-full border border-[var(--gl-green)]/30 bg-white px-3 py-1 text-xs font-bold text-[var(--gl-green-deep)] hover:bg-[var(--gl-paper)]"
                          >
                            {attachment.filename} · {c.editor.openAttachment}
                          </a>
                        ) : (
                          <span
                            key={attachment.filename}
                            className="rounded-full border border-[var(--gl-hairline)] bg-white px-3 py-1 text-xs font-bold text-[var(--gl-ink-muted)]"
                          >
                            {attachment.filename}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="ml-1">{c.editor.noAttachments}</span>
                  )}
                </div>
                <div
                  className="max-h-[640px] min-h-[420px] overflow-auto rounded-xl border border-[var(--gl-hairline)] bg-white p-6"
                  dangerouslySetInnerHTML={{ __html: buildPreviewHtml(form.html_body) }}
                />
              </div>

              <div>
                <Label>{c.editor.editMessage}</Label>
                <textarea
                  className="min-h-[220px] w-full rounded-xl border border-[var(--gl-hairline)] bg-white px-3 py-2 font-mono text-xs leading-5 text-[var(--gl-ink)]"
                  value={form.html_body}
                  onChange={(event) => updateForm("html_body", event.target.value)}
                  disabled={disabled}
                />
              </div>

              <div className="rounded-xl border border-[var(--gl-hairline)] bg-[var(--gl-card-cream)]">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-[var(--gl-ink)]"
                  onClick={() => setAdvancedDetailsOpen((open) => !open)}
                >
                  {c.editor.advancedDetails}
                  <span>{advancedDetailsOpen ? "−" : "+"}</span>
                </button>
                {advancedDetailsOpen ? (
                  <div className="space-y-4 border-t border-[var(--gl-hairline)] p-4">
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
                  </div>
                ) : null}
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
                    <ActionButton onClick={saveForLaterSelected} disabled={disabled} loading={action === "saveForLater"} tone="neutral">{c.actions.saveForLater}</ActionButton>
                    <ActionButton onClick={sendTest} disabled={disabled} loading={action === "test"} tone="neutral">{c.actions.sendTest}</ActionButton>
                    <ActionButton
                      onClick={sendReal}
                      disabled={Boolean(action) || !selected || selected.status !== "approved"}
                      loading={action === "send"}
                      tone="primary"
                    >
                      {c.actions.sendReal}
                    </ActionButton>
                    <ActionButton onClick={disregardSelected} disabled={Boolean(action) || !selected || ["sent", "sending", "deleted"].includes(selected.status)} loading={action === "disregard"} tone="danger">
                      {c.actions.disregard}
                    </ActionButton>
                    <ActionButton onClick={deleteSelected} disabled={Boolean(action) || !selected || ["sent", "sending", "deleted"].includes(selected.status)} loading={action === "delete"} tone="danger">
                      {c.actions.deleteSelected}
                    </ActionButton>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
      {sentArchiveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--gl-hairline)] bg-[var(--gl-paper)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--gl-hairline)] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--gl-green)]">{c.actions.sentArchive}</p>
                <h2 className="mt-1 text-2xl font-bold text-[var(--gl-ink)]">{c.list.archiveTitle}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--gl-ink-muted)]">{c.list.archiveDescription}</p>
              </div>
              <button
                type="button"
                onClick={() => setSentArchiveOpen(false)}
                className="rounded-full border border-[var(--gl-hairline)] bg-white px-4 py-2 text-sm font-bold text-[var(--gl-ink)]"
              >
                {c.actions.close}
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto">
              {sentEmails.length ? (
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="sticky top-0 bg-[var(--gl-card-cream)] text-xs uppercase tracking-wide text-[var(--gl-ink-muted)]">
                    <tr>
                      <th className="px-4 py-3">Organization</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Campaign</th>
                      <th className="px-4 py-3">Sent</th>
                      <th className="px-4 py-3">Resend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--gl-hairline)]">
                    {sentEmails.map((email) => (
                      <tr key={email.id}>
                        <td className="px-4 py-3 font-semibold text-[var(--gl-ink)]">{email.organization_name || email.lead_name || "-"}</td>
                        <td className="px-4 py-3 text-[var(--gl-ink-muted)]">{email.lead_email}</td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-[var(--gl-ink)]">{email.subject}</td>
                        <td className="px-4 py-3 text-[var(--gl-ink-muted)]">{email.campaign_name || "-"}</td>
                        <td className="px-4 py-3 text-[var(--gl-ink-muted)]">{formatDate(email.sent_at)}</td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-[var(--gl-ink-muted)]">{email.resend_email_id || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-6 text-sm text-[var(--gl-ink-muted)]">{c.list.archiveEmpty}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "amber" | "blue" | "warning" | "danger" | "neutral" }) {
  const tones = {
    green: "border-[var(--gl-green)]/25 bg-[var(--gl-green-soft)] text-[var(--gl-green-deep)]",
    amber: "border-[var(--gl-amber)]/30 bg-[var(--gl-amber-soft)] text-[var(--gl-amber-ink)]",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    warning: "border-orange-200 bg-orange-50 text-orange-800",
    danger: "border-red-200 bg-red-50 text-red-800",
    neutral: "border-[var(--gl-hairline)] bg-[var(--gl-card-cream)] text-[var(--gl-ink-soft)]",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-bold ${tones[tone]}`}>
      {children}
    </span>
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
