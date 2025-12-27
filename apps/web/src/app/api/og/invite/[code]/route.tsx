import { ImageResponse } from "@takumi-rs/image-response";

export const runtime = "nodejs";

const COLORS = {
  bgDark: "#0a0812",
  gold: "#f5c542",
  goldMuted: "#c9a227",
  amber: "#d97706",
  textLight: "#fefce8",
  textMuted: "#a8a29e",
  purple: "#6b21a8",
} as const;

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { code } = await params;
    const upperCode = code.toUpperCase();

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "60px",
          background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, #1e1b4b 50%, ${COLORS.bgDark} 100%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "48px 64px",
            borderRadius: 32,
            background: "rgba(20, 16, 28, 0.8)",
            border: `2px solid ${COLORS.gold}40`,
            boxShadow: `0 0 80px ${COLORS.gold}20`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.amber})`,
              marginBottom: 24,
              boxShadow: `0 0 40px ${COLORS.gold}60`,
            }}
          >
            <div
              style={{
                fontSize: 40,
                color: COLORS.bgDark,
              }}
            >
              ✦
            </div>
          </div>

          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${COLORS.textLight}, ${COLORS.gold})`,
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 12,
            }}
          >
            You&apos;re Invited
          </div>

          <div
            style={{
              fontSize: 24,
              color: COLORS.textMuted,
              marginBottom: 32,
            }}
          >
            Join the future of prediction markets
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 24px",
              borderRadius: 999,
              background: `${COLORS.gold}20`,
              border: `1px solid ${COLORS.gold}40`,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.goldMuted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Code
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.gold,
                letterSpacing: "0.15em",
                fontFamily: "monospace",
              }}
            >
              {upperCode}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 40,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.gold,
            }}
          >
            yoda.fun
          </div>
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: COLORS.textMuted,
            }}
          />
          <div
            style={{
              fontSize: 18,
              color: COLORS.textMuted,
            }}
          >
            AI Prediction Markets
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        format: "webp",
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to generate OG image",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
