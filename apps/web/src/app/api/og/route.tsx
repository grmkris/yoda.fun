import { ImageResponse } from "@takumi-rs/image-response";
import { COLORS, OgBackground } from "@/components/og/og-background";

export const runtime = "nodejs";

export function GET() {
  try {
    return new ImageResponse(
      <OgBackground>
        {/* Logo/Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: COLORS.textLight,
              letterSpacing: "-0.02em",
            }}
          >
            yoda.fun
          </div>
          <div
            style={{
              marginLeft: 16,
              fontSize: 24,
              fontWeight: 500,
              color: COLORS.yesGreen,
              padding: "6px 16px",
              borderRadius: 999,
              background: `${COLORS.yesGreen}20`,
              border: `1px solid ${COLORS.yesGreen}40`,
            }}
          >
            BETA
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 600,
            color: COLORS.textLight,
            marginBottom: 24,
            lineHeight: 1.2,
          }}
        >
          See the Future, Stake Your Claim
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: COLORS.textMuted,
            lineHeight: 1.4,
            maxWidth: 800,
          }}
        >
          The future is tradeable. Pick your side and win when you're right.
        </div>

        {/* Features */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 48,
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18,
              color: COLORS.primary,
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: COLORS.primary,
              }}
            />
            AI Markets
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18,
              color: COLORS.yesGreen,
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: COLORS.yesGreen,
              }}
            />
            Instant Payouts
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18,
              color: COLORS.nebulaBlue,
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: COLORS.nebulaBlue,
              }}
            />
            On-Chain
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
