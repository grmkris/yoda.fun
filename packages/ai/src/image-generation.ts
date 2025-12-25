import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { StorageClient } from "@yoda.fun/storage";
import { generateText } from "ai";

export interface MarketImageContext {
  title: string;
  category: string;
  description: string;
}

export interface ImageGenerationConfig {
  googleApiKey: string;
  storage: StorageClient;
}

/**
 * Build an image prompt from market context
 */
function buildImagePrompt(market: MarketImageContext): string {
  const categoryStyles: Record<string, string> = {
    sports: "dynamic action shot, stadium atmosphere, vibrant colors",
    entertainment: "glamorous, spotlight, red carpet vibes, cinematic lighting",
    tech: "futuristic, sleek devices, neon accents, digital aesthetic",
    crypto:
      "blockchain visualization, digital coins, cyber aesthetic, gold and blue",
    politics: "professional setting, flags, podiums, dramatic lighting",
    memes: "internet culture, viral aesthetic, bold colors, humorous tone",
    other: "modern, clean, professional, engaging",
  };

  const style = categoryStyles[market.category] || categoryStyles.other;

  return `Create a visually striking, eye-catching image for a prediction market betting card.

Topic: "${market.title}"
Context: ${market.description}

Style requirements:
- ${style}
- Suitable for a mobile card UI (2:3 aspect ratio feel)
- No text overlays or watermarks
- High contrast, attention-grabbing
- Professional quality, suitable for a betting app`;
}

/**
 * Generate an image for a market and upload to storage
 * Returns the public URL or null if generation fails
 */
export async function generateMarketImage(
  market: MarketImageContext,
  config: ImageGenerationConfig
): Promise<string | null> {
  try {
    const google = createGoogleGenerativeAI({ apiKey: config.googleApiKey });
    const prompt = buildImagePrompt(market);

    const result = await generateText({
      model: google("gemini-3-pro-image-preview"),
      prompt,
    });

    const image = result.files.find((file) =>
      file.mediaType.startsWith("image/")
    );

    // Get the image data as base64
    const imageData = image?.base64;
    if (!imageData) {
      return null;
    }

    // Generate unique key for storage
    const timestamp = Date.now();
    const slug = market.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);
    const key = `markets/${timestamp}-${slug}.jpg`;

    // Convert base64 to buffer and upload
    const buffer = Buffer.from(imageData, "base64");
    await config.storage.upload({
      key,
      data: buffer,
      contentType: "image/jpeg",
    });

    // Return the signed URL (long expiry for public access)
    return config.storage.getSignedUrl({ key, expiresIn: 60 * 60 * 24 * 365 });
  } catch (error) {
    // Log but don't throw - image generation is optional
    console.error("Image generation failed:", error);
    return null;
  }
}

/**
 * Generate images for multiple markets in parallel
 * Returns map of market title -> image URL (or null)
 */
export async function generateMarketImages(
  markets: MarketImageContext[],
  config: ImageGenerationConfig
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  // Generate in parallel with concurrency limit
  const concurrency = 3;
  for (let i = 0; i < markets.length; i += concurrency) {
    const batch = markets.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (market) => {
        const url = await generateMarketImage(market, config);
        return { title: market.title, url };
      })
    );

    for (const { title, url } of batchResults) {
      results.set(title, url);
    }
  }

  return results;
}
