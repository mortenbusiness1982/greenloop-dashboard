import type { Metadata } from "next";
import { API_BASE } from "@/lib/api";
import ChallengeInvitationClient, { type InvitationPreview } from "./ChallengeInvitationClient";

const INVITATION_BASE_URL = (
  process.env.NEXT_PUBLIC_INVITATION_URL || "https://join.greenloopapp.com"
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
  return `You’re invited to join “${title}” on GreenLoop.`;
}

export async function generateMetadata({ params }: ChallengeInvitationPageProps): Promise<Metadata> {
  const { token } = await params;
  const invitation = await loadInvitation(token);
  const challengeTitle = invitation?.challenge.title.trim() || "GreenLoop challenge";
  const title = `Join “${challengeTitle}” | GreenLoop`;
  const description = previewDescription(invitation);
  const pageUrl = `${INVITATION_BASE_URL}/i/${encodeURIComponent(token)}`;
  const imageUrl = `${INVITATION_BASE_URL}/challenge-invite/${encodeURIComponent(token)}/preview`;

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
