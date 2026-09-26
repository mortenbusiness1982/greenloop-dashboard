export const invitationLanguages = ["en", "es", "fr", "pt", "de", "da"] as const;
export type InvitationLanguage = typeof invitationLanguages[number];

function supported(value: string): InvitationLanguage | undefined {
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return invitationLanguages.find(language => language === base);
}

// The sender's explicit choice wins over the recipient's browser preferences.
export function resolveInvitationLanguage(value?: string | string[] | null, acceptLanguage = ""): InvitationLanguage {
  const explicit = supported(Array.isArray(value) ? value[0] || "" : value || "");
  if (explicit) return explicit;
  const preferences = acceptLanguage.split(",").map(entry => {
    const [tag, ...parameters] = entry.trim().split(";");
    const quality = parameters.find(parameter => parameter.trim().startsWith("q="));
    return { language: supported(tag), quality: quality ? Number(quality.trim().slice(2)) : 1 };
  }).filter(entry => entry.language && entry.quality > 0).sort((a, b) => b.quality - a.quality);
  return preferences[0]?.language || "en";
}

type InvitationCopy = {
  publicLabel: string; privateLabel: string; title: string; invited: string;
  body: string; until: string; now: string; open: string; missing: string;
  unavailable: string; tagline: string; privacy: string; meta: string;
  preview: string; bella: string;
};

export const invitationCopy: Record<InvitationLanguage, InvitationCopy> = {
  en: {
    publicLabel: "Public GreenLoop challenge", privateLabel: "Private GreenLoop challenge",
    title: "Join the challenge", invited: "You've been invited", body: "Join “{title}” and recycle together.",
    until: "Open until {date}", now: "Open now", open: "Open GreenLoop to join", missing: "This invitation could not be found.",
    unavailable: "This invitation is no longer available.", tagline: "Recycle together. Make every action count.",
    privacy: "Only your GreenLoop display name and approved recycling contributions appear in the challenge.",
    meta: "You're invited to join “{title}” on GreenLoop.", preview: "You've been invited to recycle together on GreenLoop.", bella: "Bella, the GreenLoop turtle",
  },
  es: {
    publicLabel: "Reto público de GreenLoop", privateLabel: "Reto privado de GreenLoop",
    title: "Únete al reto", invited: "Te han invitado", body: "Únete a «{title}» y reciclemos juntos.",
    until: "Disponible hasta {date}", now: "Disponible ahora", open: "Abre GreenLoop para unirte", missing: "No se ha encontrado esta invitación.",
    unavailable: "Esta invitación ya no está disponible.", tagline: "Reciclemos juntos. Cada acción cuenta.",
    privacy: "En el reto solo aparecen tu nombre visible de GreenLoop y tus aportaciones de reciclaje aprobadas.",
    meta: "Te han invitado a unirte a «{title}» en GreenLoop.", preview: "Te han invitado a reciclar juntos en GreenLoop.", bella: "Bella, la tortuga de GreenLoop",
  },
  fr: {
    publicLabel: "Défi public GreenLoop", privateLabel: "Défi privé GreenLoop",
    title: "Rejoignez le défi", invited: "Vous avez reçu une invitation", body: "Rejoignez « {title} » et recyclons ensemble.",
    until: "Ouvert jusqu'au {date}", now: "Ouvert dès maintenant", open: "Ouvrir GreenLoop pour participer", missing: "Cette invitation est introuvable.",
    unavailable: "Cette invitation n'est plus disponible.", tagline: "Recyclons ensemble. Chaque geste compte.",
    privacy: "Seuls votre nom affiché sur GreenLoop et vos contributions de recyclage approuvées apparaissent dans le défi.",
    meta: "Vous avez reçu une invitation à rejoindre « {title} » sur GreenLoop.", preview: "Vous avez reçu une invitation à recycler ensemble sur GreenLoop.", bella: "Bella, la tortue de GreenLoop",
  },
  pt: {
    publicLabel: "Desafio público GreenLoop", privateLabel: "Desafio privado GreenLoop",
    title: "Participe no desafio", invited: "Recebeu um convite", body: "Participe em «{title}» e vamos reciclar juntos.",
    until: "Disponível até {date}", now: "Disponível agora", open: "Abra o GreenLoop para participar", missing: "Não foi possível encontrar este convite.",
    unavailable: "Este convite já não está disponível.", tagline: "Vamos reciclar juntos. Cada ação conta.",
    privacy: "No desafio, aparecem apenas o seu nome de apresentação no GreenLoop e as suas contribuições de reciclagem aprovadas.",
    meta: "Recebeu um convite para participar em «{title}» no GreenLoop.", preview: "Recebeu um convite para reciclar em conjunto no GreenLoop.", bella: "Bella, a tartaruga do GreenLoop",
  },
  de: {
    publicLabel: "Öffentliche GreenLoop-Challenge", privateLabel: "Private GreenLoop-Challenge",
    title: "Mach bei der Challenge mit", invited: "Du wurdest eingeladen", body: "Mach bei „{title}“ mit und recycle mit uns.",
    until: "Offen bis {date}", now: "Jetzt offen", open: "GreenLoop öffnen und mitmachen", missing: "Diese Einladung wurde nicht gefunden.",
    unavailable: "Diese Einladung ist nicht mehr verfügbar.", tagline: "Gemeinsam recyceln. Jede Aktion zählt.",
    privacy: "In der Challenge erscheinen nur dein GreenLoop-Anzeigename und deine bestätigten Recyclingbeiträge.",
    meta: "Du wurdest eingeladen, bei „{title}“ auf GreenLoop mitzumachen.", preview: "Du wurdest eingeladen, gemeinsam auf GreenLoop zu recyceln.", bella: "Bella, die GreenLoop-Schildkröte",
  },
  da: {
    publicLabel: "Offentlig GreenLoop-udfordring", privateLabel: "Privat GreenLoop-udfordring",
    title: "Vær med i udfordringen", invited: "Du er inviteret", body: "Vær med i “{title}”, og lad os genbruge sammen.",
    until: "Åben indtil {date}", now: "Åben nu", open: "Åbn GreenLoop for at deltage", missing: "Invitationen blev ikke fundet.",
    unavailable: "Invitationen er ikke længere tilgængelig.", tagline: "Lad os genbruge sammen. Hver handling tæller.",
    privacy: "Kun dit profilnavn i GreenLoop og dine godkendte genbrug vises i udfordringen.",
    meta: "Du er inviteret til at deltage i “{title}” på GreenLoop.", preview: "Du er inviteret til at genbruge sammen med os på GreenLoop.", bella: "Bella, GreenLoops skildpadde",
  },
};

export function formatInvitationCopy(template: string, key: string, value: string) {
  return template.replace(`{${key}}`, () => value);
}

export function invitationDate(value: string, language: InvitationLanguage) {
  const locales = { en: "en-GB", es: "es-ES", fr: "fr-FR", pt: "pt-PT", de: "de-DE", da: "da-DK" };
  return new Intl.DateTimeFormat(locales[language], { timeZone: "UTC" }).format(new Date(value));
}

export const invitationStatus: Record<InvitationLanguage, Record<string, string>> = {
  en: { revoked: "This invitation has been revoked.", expired: "This invitation has expired.", exhausted: "This invitation has reached its usage limit.", closed: "This challenge is closed." },
  es: { revoked: "Esta invitación ha sido revocada.", expired: "Esta invitación ha caducado.", exhausted: "Esta invitación ha alcanzado su límite de usos.", closed: "Este reto está cerrado." },
  fr: { revoked: "Cette invitation a été révoquée.", expired: "Cette invitation a expiré.", exhausted: "Cette invitation a atteint sa limite d'utilisation.", closed: "Ce défi est terminé." },
  pt: { revoked: "Este convite foi revogado.", expired: "Este convite expirou.", exhausted: "Este convite atingiu o limite de utilizações.", closed: "Este desafio está encerrado." },
  de: { revoked: "Diese Einladung wurde widerrufen.", expired: "Diese Einladung ist abgelaufen.", exhausted: "Diese Einladung hat ihr Nutzungslimit erreicht.", closed: "Diese Challenge ist geschlossen." },
  da: { revoked: "Invitationen er trukket tilbage.", expired: "Invitationen er udløbet.", exhausted: "Invitationen kan ikke bruges flere gange.", closed: "Udfordringen er lukket." },
};
