import { ImageResponse } from "@takumi-rs/image-response";
import { COLORS } from "@/components/og/og-background";

export const runtime = "nodejs";

const SAMPLE_MARKETS = [
  "Can Bitcoin smash $150k by NYE?",
  "Will Lakers pull off the upset?",
  "Does MrBeast hit 100M views?",
];

export function GET() {
  try {
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
          {/* Top section: Cards + Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            {/* Stacked prediction cards */}
            <div
              style={{
                display: "flex",
                position: "relative",
                width: 420,
                height: 320,
              }}
            >
              {SAMPLE_MARKETS.map((market, i) => (
                <div
                  key={market}
                  style={{
                    position: "absolute",
                    top: i * 24,
                    left: i * 16,
                    width: 360,
                    height: 220,
                    background:
                      "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
                    borderRadius: 20,
                    border: `1px solid ${i === 2 ? COLORS.primary : "#374151"}`,
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow:
                      i === 2
                        ? `0 20px 60px ${COLORS.primary}30`
                        : "0 10px 40px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Category pill */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: COLORS.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {i === 0 ? "CRYPTO" : i === 1 ? "SPORTS" : "VIRAL"}
                    </div>
                  </div>

                  {/* Market question */}
                  <div
                    style={{
                      fontSize: i === 2 ? 26 : 20,
                      fontWeight: 800,
                      color: i === 2 ? COLORS.textLight : COLORS.textMuted,
                      lineHeight: 1.25,
                    }}
                  >
                    {market}
                  </div>

                  {/* YES/NO buttons */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 44,
                        background:
                          i === 2 ? COLORS.yesGreen : `${COLORS.yesGreen}40`,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                        color: i === 2 ? "#fff" : COLORS.yesGreen,
                      }}
                    >
                      YES
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 44,
                        background: i === 2 ? "#ef4444" : "#ef444440",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                        color: i === 2 ? "#fff" : "#ef4444",
                      }}
                    >
                      NO
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right side: Branding */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "center",
                height: "100%",
                paddingTop: 40,
              }}
            >
              {/* Logo */}
              <div
                style={{
                  fontSize: 120,
                  fontWeight: 900,
                  color: COLORS.textLight,
                  letterSpacing: "-0.05em",
                  marginBottom: 12,
                  textShadow: `0 4px 60px ${COLORS.primary}60`,
                }}
              >
                yoda.fun
              </div>

              {/* Tagline */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  marginBottom: 32,
                }}
              >
                {["Swipe", "Predict", "Win"].map((word, i) => (
                  <div
                    key={word}
                    style={{
                      fontSize: 48,
                      fontWeight: 800,
                      color:
                        i === 0
                          ? COLORS.primary
                          : i === 1
                            ? COLORS.yesGreen
                            : COLORS.nebulaBlue,
                    }}
                  >
                    {word}
                    {i < 2 ? "." : ""}
                  </div>
                ))}
              </div>

              {/* Bold Statement */}
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.textMuted,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                Prove you know
              </div>
            </div>
          </div>

          {/* Bottom: YES/NO battle bar */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Stats */}
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
                    fontSize: 28,
                    fontWeight: 800,
                    color: COLORS.yesGreen,
                  }}
                >
                  YES 67%
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: COLORS.textMuted,
                  }}
                >
                  1,234 bets
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
                    fontSize: 18,
                    fontWeight: 500,
                    color: COLORS.textMuted,
                  }}
                >
                  891 bets
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#ef4444",
                  }}
                >
                  NO 33%
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div
              style={{
                display: "flex",
                width: "100%",
                height: 20,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "67%",
                  height: "100%",
                  background: `linear-gradient(90deg, ${COLORS.yesGreen} 0%, #34d399 100%)`,
                }}
              />
              <div
                style={{
                  width: "33%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #f87171 0%, #ef4444 100%)",
                }}
              />
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
