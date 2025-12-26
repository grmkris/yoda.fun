import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { typeIdGenerator } from "@yoda.fun/shared/typeid";
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

export async function generateMarketImage(
  market: MarketImageContext,
  config: ImageGenerationConfig
): Promise<string | null> {
  try {
    const google = createGoogleGenerativeAI({ apiKey: config.googleApiKey });
    const prompt = buildImagePrompt(market);

    const result = await generateText({
      model: google("gemini-2.5-flash-image-preview"),
      prompt,
    });

    const image = result.files.find((file) =>
      file.mediaType.startsWith("image/")
    );

    const imageData = image?.base64;
    if (!imageData) {
      return null;
    }

    const key = `markets/${typeIdGenerator("marketImage")}.jpg`;
    const buffer = Buffer.from(imageData, "base64");
    await config.storage.upload({
      key,
      data: buffer,
      contentType: "image/jpeg",
    });

    return key;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
}

export async function generateMarketImages(
  markets: MarketImageContext[],
  config: ImageGenerationConfig
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const concurrency = 1;
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
