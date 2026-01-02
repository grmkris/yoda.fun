export function GET() {
  return Response.json({
    accountAssociation: {
      header: "", // Fill after Base Build verification
      payload: "",
      signature: "",
    },
    miniapp: {
      version: "1",
      name: "yoda.fun",
      homeUrl: "https://yoda.fun",
      iconUrl: "https://yoda.fun/favicon/web-app-manifest-512x512.png",
      splashImageUrl: "https://yoda.fun/splash.png",
      splashBackgroundColor: "#0f0a1a",
      webhookUrl: "https://yoda.fun/api/webhooks/farcaster",
      subtitle: "AI Prediction Markets",
      description:
        "See the Future, Stake Your Claim. Pick your side on sports, crypto, politics, and culture. Win real money when you're right.",
      screenshotUrls: [],
      primaryCategory: "social",
      tags: ["predictions", "markets", "betting", "crypto", "ai"],
      heroImageUrl: "https://yoda.fun/api/og",
      tagline: "See the Future, Stake Your Claim",
      ogTitle: "yoda.fun — AI Prediction Markets",
      ogDescription: "Pick your side. Win real money.",
      ogImageUrl: "https://yoda.fun/api/og",
      noindex: false,
    },
  });
}
