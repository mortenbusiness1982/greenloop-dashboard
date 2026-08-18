import type { Metadata } from "next";
import { API_BASE } from "@/lib/api";
import ChallengeInvitationClient, { type InvitationPreview } from "./ChallengeInvitationClient";

const DASHBOARD_BASE_URL = (
  process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.greenloopapp.com"
).replace(/\/$/, "");

type ChallengeInvitationPageProps = {
  params: Promise<{ token: string }>;
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

function previewDescription(invitation: InvitationPreview | null) {
  if (!invitation) return "Join a private GreenLoop recycling challenge.";
  const title = invitation.challenge.title.trim();
  const organizer = invitation.challenge.organizationName?.trim();
  return organizer
    ? `${organizer} invited you to join “${title}”. Recycle together and follow the challenge.`
    : `You’re invited to join “${title}”. Recycle together and follow the challenge.`;
}

export async function generateMetadata({ params }: ChallengeInvitationPageProps): Promise<Metadata> {
  const { token } = await params;
  const invitation = await loadInvitation(token);
  const challengeTitle = invitation?.challenge.title.trim() || "GreenLoop challenge";
  const title = `Join “${challengeTitle}” | GreenLoop`;
  const description = previewDescription(invitation);
  const pageUrl = `${DASHBOARD_BASE_URL}/challenge-invite/${encodeURIComponent(token)}`;
  const imageUrl = `${pageUrl}/preview`;

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

export default async function ChallengeInvitationPage({ params }: ChallengeInvitationPageProps) {
  const { token } = await params;
  const invitation = await loadInvitation(token);

  return <ChallengeInvitationClient token={token} initialInvitation={invitation} />;
}
