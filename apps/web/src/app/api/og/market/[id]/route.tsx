import { ImageResponse } from "@takumi-rs/image-response";
import type { MarketId } from "@yoda.fun/shared/typeid";
import { COLORS } from "@/components/og/og-background";
import { serverClient } from "@/utils/orpc.server";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  crypto: "#f7931a",
  sports: COLORS.yesGreen,
  politics: "#3b82f6",
  entertainment: "#ec4899",
  tech: COLORS.nebulaBlue,
  viral: COLORS.primary,
  default: COLORS.primary,
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const market = await serverClient.market.get({ marketId: id as MarketId });

    const hasDecrypted =
      market.decryptedYesTotal != null && market.decryptedNoTotal != null;
    const decryptedTotal = hasDecrypted
      ? (market.decryptedYesTotal ?? 0) + (market.decryptedNoTotal ?? 0)
      : 0;
    const yesPercent = hasDecrypted && decryptedTotal > 0
      ? Math.round(((market.decryptedYesTotal ?? 0) / decryptedTotal) * 100)
      : 50;
    const noPercent = 100 - yesPercent;

    const categoryColor =
      CATEGORY_COLORS[market.category?.toLowerCase() ?? "default"] ??
      CATEGORY_COLORS.default;

    const formatDate = (date: Date) =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date);

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: `linear-gradient(145deg, ${COLORS.bgDark} 0%, #1a1033 40%, #0f1629 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.nebulaPurple}40 0%, transparent 70%)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.nebulaBlue}30 0%, transparent 70%)`,
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "48px 64px",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Top section */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Category pill */}
            {market.category && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: categoryColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    padding: "8px 16px",
                    borderRadius: 999,
                    background: `${categoryColor}20`,
                    border: `1px solid ${categoryColor}40`,
                  }}
                >
                  {market.category}
                </div>
              </div>
            )}

            {/* Market title */}
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: COLORS.textLight,
                lineHeight: 1.1,
                maxWidth: 1000,
                letterSpacing: "-0.02em",
              }}
            >
              {market.title}
            </div>
          </div>

          {/* Middle section: Odds bar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Stats above bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: COLORS.yesGreen,
                  }}
                >
                  YES {yesPercent}%
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: "#ef4444",
                  }}
                >
                  NO {noPercent}%
                </div>
              </div>
            </div>

            {/* Odds bar */}
            <div
              style={{
                display: "flex",
                width: "100%",
                height: 24,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${yesPercent}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${COLORS.yesGreen} 0%, #34d399 100%)`,
                }}
              />
              <div
                style={{
                  width: `${noPercent}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #f87171 0%, #ef4444 100%)",
                }}
              />
            </div>
          </div>

          {/* Bottom section: Stats + Branding */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {/* Stats */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: COLORS.textLight,
                  }}
                >
                  {hasDecrypted ? decryptedTotal.toLocaleString() : "—"}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                  }}
                >
                  bets
                </div>
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
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                  }}
                >
                  Ends
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
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
                gap: 16,
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: COLORS.textLight,
                }}
              >
                yoda.fun
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.textMuted,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                Prove you know
              </div>
            </div>
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
