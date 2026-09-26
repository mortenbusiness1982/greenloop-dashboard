function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getContactTitle(metadata: unknown): string {
  const data = record(metadata);
  // An explicit dashboard value (including a cleared value) wins over imports.
  if (Object.hasOwn(data, "contact_job_title")) return text(data.contact_job_title);
  const apollo = record(data.apollo);
  const candidates = [
    data.contact_title, data.job_title, data.lead_title, data.contact_role,
    record(data.contact).job_title, record(data.contact).title,
    record(data.person).title, record(data.apollo_person).title,
    record(apollo.person).title,
  ];
  return candidates.map(text).find(value => value && !/^(unknown|n\/?a|not available|no selected role)$/i.test(value)) ?? "";
}

export function withContactTitle(metadata: Record<string, unknown>, title: string): Record<string, unknown> {
  if (title.trim() === getContactTitle(metadata)) return metadata;
  return { ...metadata, contact_job_title: title.trim() || null };
}
