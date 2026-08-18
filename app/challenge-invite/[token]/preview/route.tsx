import { ImageResponse } from "next/og";
import { API_BASE } from "@/lib/api";

type InvitationPreview = {
  challenge?: {
    title?: string | null;
    description?: string | null;
    heroImageUrl?: string | null;
    organizationName?: string | null;
  };
};

type PreviewRouteProps = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, { params }: PreviewRouteProps) {
  const { token } = await params;
  let invitation: InvitationPreview | null = null;

  try {
    const response = await fetch(
      `${API_BASE}/challenge-invitations/${encodeURIComponent(token)}`,
      { cache: "no-store" }
    );
    if (response.ok) {
      const json = (await response.json()) as { invitation?: InvitationPreview };
      invitation = json.invitation || null;
    }
  } catch {
    invitation = null;
  }

  const title = invitation?.challenge?.title?.trim() || "Join a GreenLoop challenge";
  const organizer = invitation?.challenge?.organizationName?.trim() || "GreenLoop community";
  const imageUrl = invitation?.challenge?.heroImageUrl || `${new URL(request.url).origin}/bella-stage-2.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f3e7",
          color: "#072d23",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: "54%",
            padding: "64px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#168566", fontSize: 24, fontWeight: 700, letterSpacing: 4 }}>
              PRIVATE CHALLENGE
            </div>
            <div style={{ marginTop: 26, fontSize: 58, lineHeight: 1.05, fontWeight: 800 }}>
              {title}
            </div>
            <div style={{ marginTop: 24, color: "#55756c", fontSize: 28, lineHeight: 1.3, display: "flex" }}>
              {organizer} invited you to recycle together.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#f6a92d" }} />
            <div style={{ fontSize: 27, fontWeight: 700 }}>GreenLoop Recycling App</div>
          </div>
        </div>
        <div
          style={{
            position: "relative",
            width: "46%",
            height: "100%",
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" width="552" height="630" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: "linear-gradient(90deg, rgba(247,243,231,0.18), rgba(7,45,35,0.04))",
            }}
          />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    }
  );
}
