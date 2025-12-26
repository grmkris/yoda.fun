import { ImageResponse } from "@takumi-rs/image-response";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { COLORS, OgBackground } from "@/components/og/og-background";
import { client } from "@/utils/orpc";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const market = await client.market.get({ marketId: id as MarketId });

    const totalVotes = market.totalYesVotes + market.totalNoVotes;
    const yesPercent =
      totalVotes > 0
        ? Math.round((market.totalYesVotes / totalVotes) * 100)
        : 50;
    const noPercent = 100 - yesPercent;

    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);

    return new ImageResponse(
      <OgBackground>
        {/* Category badge */}
        {market.category && (
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 16,
            }}
          >
            {market.category}
          </div>
        )}

        {/* Market title */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: COLORS.textLight,
            lineHeight: 1.15,
            marginBottom: 32,
            maxWidth: 900,
          }}
        >
          {market.title}
        </div>

        {/* Odds bar */}
        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: 600,
            height: 48,
            borderRadius: 24,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          {/* Yes side */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: `${yesPercent}%`,
              background: COLORS.yesGreen,
              color: "#fff",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            YES {yesPercent}%
          </div>
          {/* No side */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: `${noPercent}%`,
              background: "#ef4444",
              color: "#fff",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            NO {noPercent}%
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Total Bets
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.textLight,
              }}
            >
              {totalVotes}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Pool
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.textLight,
              }}
            >
              ${Number(market.totalPool).toFixed(2)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Ends
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.textLight,
              }}
            >
              {formatDate(market.votingEndsAt)}
            </div>
          </div>
        </div>

        {/* Branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
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
              fontSize: 18,
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
    // Return default OG on error
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
