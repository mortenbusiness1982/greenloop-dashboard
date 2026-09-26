import type { Metadata } from "next";
import { headers } from "next/headers";
import { invitationCopy, formatInvitationCopy, resolveInvitationLanguage } from "@/lib/invitationLanguage";
import { API_BASE } from "@/lib/api";
import ChallengeInvitationClient, { type InvitationPreview } from "./ChallengeInvitationClient";

const INVITATION_BASE_URL = (
  process.env.NEXT_PUBLIC_INVITATION_URL || "https://join.greenloopapp.com"
).replace(/\/$/, "");

type ChallengeInvitationPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

async function loadInvitation(token: string): Promise<InvitationPreview | null> {
  if (!token) return null;

  try {
    const response = await fetch(
      `${API_BASE}/challenge-invitations/${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const json = (await response.json()) as { invitation?: InvitationPreview };
    return json.invitation || null;
  } catch {
    return null;
  }
}

async function pageLanguage(searchParams: ChallengeInvitationPageProps["searchParams"]) {
  const query = await searchParams;
  return resolveInvitationLanguage(query.lang, (await headers()).get("accept-language") || "");
}

export async function generateMetadata({ params, searchParams }: ChallengeInvitationPageProps): Promise<Metadata> {
  const { token } = await params;
  const language = await pageLanguage(searchParams);
  const copy = invitationCopy[language];
  const invitation = await loadInvitation(token);
  const challengeTitle = invitation?.challenge.title.trim() || copy.title;
  const title = `${copy.title}: ${challengeTitle} | GreenLoop`;
  const description = invitation ? formatInvitationCopy(copy.meta, "title", challengeTitle) : copy.preview;
  const pageUrl = `${INVITATION_BASE_URL}/i/${encodeURIComponent(token)}?lang=${language}`;
  const imageUrl = `${INVITATION_BASE_URL}/challenge-invite/${encodeURIComponent(token)}/preview?lang=${language}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "GreenLoop Recycling App",
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: challengeTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ChallengeInvitationPage({ params, searchParams }: ChallengeInvitationPageProps) {
  const { token } = await params;
  const invitation = await loadInvitation(token);

  const language = await pageLanguage(searchParams);
  return <ChallengeInvitationClient token={token} initialInvitation={invitation} language={language} />;
}
