import { ImageResponse } from "@takumi-rs/image-response";
import { COLORS, OgBackground } from "@/components/og/og-background";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ code: string }>;
}

const STARS = [
  { x: 5, y: 8, size: 3, opacity: 0.4 },
  { x: 12, y: 15, size: 2, opacity: 0.3 },
  { x: 8, y: 25, size: 4, opacity: 0.5 },
  { x: 15, y: 40, size: 2, opacity: 0.25 },
  { x: 6, y: 55, size: 3, opacity: 0.4 },
  { x: 10, y: 70, size: 2, opacity: 0.3 },
  { x: 4, y: 85, size: 4, opacity: 0.5 },
  { x: 18, y: 92, size: 2, opacity: 0.35 },
  { x: 88, y: 6, size: 4, opacity: 0.5 },
  { x: 92, y: 18, size: 2, opacity: 0.3 },
  { x: 85, y: 32, size: 3, opacity: 0.4 },
  { x: 95, y: 45, size: 2, opacity: 0.25 },
  { x: 90, y: 60, size: 4, opacity: 0.45 },
  { x: 82, y: 75, size: 2, opacity: 0.35 },
  { x: 94, y: 88, size: 3, opacity: 0.4 },
  { x: 86, y: 95, size: 2, opacity: 0.3 },
  { x: 25, y: 5, size: 2, opacity: 0.25 },
  { x: 75, y: 10, size: 3, opacity: 0.35 },
  { x: 30, y: 90, size: 2, opacity: 0.3 },
  { x: 70, y: 95, size: 3, opacity: 0.4 },
];

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { code } = await params;
    const upperCode = code.toUpperCase();

    return new ImageResponse(
      <OgBackground>
        {/* Starfield layer */}
        {STARS.map((star, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              borderRadius: "50%",
              background:
                i % 3 === 0
                  ? `rgba(139, 92, 246, ${star.opacity})`
                  : `rgba(148, 163, 184, ${star.opacity})`,
              boxShadow:
                i % 3 === 0
                  ? `0 0 ${star.size * 2}px rgba(139, 92, 246, ${star.opacity})`
                  : "none",
            }}
          />
        ))}

        {/* Central portal card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "48px 64px",
            borderRadius: 24,
            background: "rgba(15, 10, 26, 0.75)",
            border: `1px solid ${COLORS.primary}40`,
            boxShadow: `0 0 80px ${COLORS.primary}15, 0 0 120px ${COLORS.nebulaBlue}10`,
          }}
        >
          {/* Portal icon - diamond with glow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              marginBottom: 28,
              transform: "rotate(45deg)",
              background: `linear-gradient(135deg, ${COLORS.primary}30, ${COLORS.yesGreen}20)`,
              border: `2px solid ${COLORS.primary}60`,
              borderRadius: 12,
              boxShadow: `
                0 0 30px ${COLORS.primary}40,
                0 0 60px ${COLORS.yesGreen}20,
                inset 0 0 20px ${COLORS.primary}20
              `,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: `linear-gradient(135deg, ${COLORS.yesGreen}, ${COLORS.primary})`,
                transform: "rotate(-45deg)",
                boxShadow: `0 0 20px ${COLORS.yesGreen}60`,
              }}
            />
          </div>

          {/* Headline with gradient */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "0.02em",
              marginBottom: 12,
              background: `linear-gradient(135deg, ${COLORS.textLight}, ${COLORS.primary})`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            YOU'RE INVITED
          </div>

          {/* Mysterious subtitle */}
          <div
            style={{
              fontSize: 22,
              color: COLORS.textMuted,
              marginBottom: 36,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            See the future
          </div>

          {/* Invite code - astronomical coordinates style */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 32px",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.yesGreen}10, ${COLORS.nebulaBlue}10)`,
              border: `1px solid ${COLORS.yesGreen}30`,
              boxShadow: `0 0 30px ${COLORS.yesGreen}15`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Code
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                background: `${COLORS.yesGreen}40`,
              }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                fontFamily: "monospace",
                color: COLORS.yesGreen,
                letterSpacing: "0.2em",
                textShadow: `0 0 20px ${COLORS.yesGreen}50`,
              }}
            >
              {upperCode}
            </div>
          </div>
        </div>

        {/* Brand footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 40,
            position: "absolute",
            bottom: 50,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: COLORS.primary,
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
              fontSize: 16,
              color: COLORS.textMuted,
            }}
          >
            AI Prediction Markets
          </div>
        </div>
      </OgBackground>,
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
