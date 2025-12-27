import { Output } from "ai";
import Replicate from "replicate";
import { z } from "zod";
import type { AiClient } from "./ai-client";

export interface MarketImageContext {
  title: string;
  category: string;
  description: string;
}

export interface ImageGenerationConfig {
  replicateApiKey: string;
}

export interface ImagePromptResult {
  prompt: string;
  tags: string[];
  reuseOk: boolean;
}

const ImagePromptResponseSchema = z.object({
  prompt: z.string(),
  tags: z.array(z.string()),
  reuseOk: z.boolean(),
});

export async function generateImagePromptWithTags(
  market: MarketImageContext,
  aiClient: AiClient
): Promise<ImagePromptResult> {
  const categoryStyles: Record<string, string> = {
    movies: "cinematic, movie poster aesthetic, dramatic lighting",
    tv: "streaming platform vibes, screen glow aesthetic",
    music: "concert stage, vinyl records, vibrant stage lighting",
    celebrities: "glamorous, red carpet, spotlight, magazine cover",
    gaming: "esports arena, neon RGB lighting, gaming setup",
    sports: "dynamic action shot, stadium atmosphere, athletic",
    politics: "professional setting, flags, podiums",
    tech: "futuristic, sleek devices, digital aesthetic",
    crypto: "blockchain visualization, digital coins, cyber aesthetic",
    viral: "trending hashtag, social media icons, phone screen",
    memes: "internet culture, viral aesthetic, bold colors",
    weather: "dramatic sky, weather elements, meteorological",
    other: "modern, clean, professional",
  };

  const style = categoryStyles[market.category] || categoryStyles.other;
  const model = aiClient.getModel({
    provider: "google",
    modelId: "gemini-2.0-flash",
  });

  const result = await aiClient.generateText({
    model,
    output: Output.object({ schema: ImagePromptResponseSchema }),
    prompt: `Generate an image prompt, reusable tags, and reuse decision for this prediction market:

Title: "${market.title}"
Description: ${market.description}
Category: ${market.category}
Style hints: ${style}

PROMPT: Create a detailed image generation prompt (50-100 words) for a betting card. Include:
- Visual style matching the category
- No text/watermarks
- 2:3 aspect ratio feel
- Eye-catching, professional quality

TAGS: Extract 2-5 reusable tags for image matching:
- Primary entity (team name, person name, coin symbol, etc.)
- Category-level tag if relevant
- Only include entities that would match similar future markets

REUSE_OK: Should we reuse an existing image if tags match?
- true: Generic/recurring topic (regular game, price prediction, ongoing series)
- false: Unique/novel event that deserves a fresh image (record-breaking, historic, first-time, specific moment)

Examples:
- "Will Lakers beat Celtics?" → tags: ["lakers", "nba"], reuseOk: true (regular game)
- "Lakers break 20-game win streak?" → tags: ["lakers", "nba"], reuseOk: false (historic moment)
- "Will Bitcoin hit $100k?" → tags: ["bitcoin", "crypto"], reuseOk: true (price milestone)
- "Bitcoin ETF approved for first time?" → tags: ["bitcoin", "crypto"], reuseOk: false (novel event)`,
  });

  return result.output;
}

function buildImagePrompt(market: MarketImageContext): string {
  const categoryStyles: Record<string, string> = {
    // Entertainment subcategories
    movies:
      "cinematic scene, movie poster aesthetic, dramatic lighting, film reel elements",
    tv: "living room screen glow, streaming platform vibes, binge-worthy aesthetic",
    music:
      "concert stage, vinyl records, musical notes, vibrant stage lighting",
    celebrities:
      "glamorous, red carpet, paparazzi flash, spotlight, magazine cover feel",
    gaming:
      "esports arena, gaming setup, neon RGB lighting, controller and screen",
    // Core categories
    sports: "dynamic action shot, stadium atmosphere, vibrant colors, athletic",
    politics: "professional setting, flags, podiums, dramatic lighting",
    tech: "futuristic, sleek devices, neon accents, digital aesthetic",
    crypto:
      "blockchain visualization, digital coins, cyber aesthetic, gold and blue",
    // Social/Viral
    viral:
      "trending hashtag, social media icons, phone screen, notification aesthetic",
    memes: "internet culture, viral aesthetic, bold colors, humorous tone",
    // Misc
    weather:
      "dramatic sky, weather elements, meteorological, clouds and sun or storms",
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

export async function generateMarketImageBuffer(
  market: MarketImageContext,
  config: ImageGenerationConfig
): Promise<Buffer | null> {
  const replicate = new Replicate({
    auth: config.replicateApiKey,
  });
  const prompt = buildImagePrompt(market);

  const output = (await replicate.run("google/nano-banana", {
    input: {
      prompt,
      aspect_ratio: "2:3",
      output_format: "png",
    },
  })) as { url: () => Promise<string>; blob: () => Promise<Blob> };

  const imageBuffer = await output.blob();
  return Buffer.from(await imageBuffer.arrayBuffer());
}

export async function generateMarketImageUrl(
  market: MarketImageContext,
  config: ImageGenerationConfig
): Promise<string | null> {
  const replicate = new Replicate({
    auth: config.replicateApiKey,
  });
  const prompt = buildImagePrompt(market);

  const output = (await replicate.run("google/nano-banana", {
    input: {
      prompt,
      aspect_ratio: "2:3",
      output_format: "png",
    },
  })) as { url: () => Promise<string>; blob: () => Promise<Blob> };

  return output.url();
}

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
