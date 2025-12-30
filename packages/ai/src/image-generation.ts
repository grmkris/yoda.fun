import { Output } from "ai";
import Replicate from "replicate";
import { z } from "zod";
import type { AiClient } from "./ai-client";
import type { AIModelConfig } from "./ai-providers";

// Mirror of WORKFLOW_MODELS.image.promptGen from @yoda.fun/markets
const IMAGE_PROMPT_MODEL: AIModelConfig = {
  provider: "google",
  modelId: "gemini-2.5-flash",
};

export interface MarketImageContext {
  title: string;
  category: string;
  description: string;
}

export type ImageModel =
  | "black-forest-labs/flux-schnell"
  | "google/nano-banana";

const DEFAULT_IMAGE_MODEL: ImageModel = "black-forest-labs/flux-schnell";

export interface ImageGenerationConfig {
  replicateApiKey: string;
  model?: ImageModel;
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
  const model = aiClient.getModel(IMAGE_PROMPT_MODEL);

  const result = await aiClient.generateText({
    model,
    output: Output.object({ schema: ImagePromptResponseSchema }),
    prompt: `Generate a Flux-compatible image prompt for this prediction market.

Market: "${market.title}"
Context: ${market.description}
Category: ${market.category}
Style hints: ${style}

PROMPT RULES (for Flux Schnell model):
- Write DESCRIPTIVE visual language, NOT meta-instructions
- Describe actual objects, colors, lighting, composition
- Include: subject, setting, color palette, lighting style, mood
- End with: "no text no words no letters no numbers"
- 50-100 words

BAD (meta): "Create a professional crypto image with blockchain vibes, eye-catching"
GOOD (descriptive): "Golden Bitcoin coin floating above glowing price chart, neon blue and amber lighting, dark background with subtle digital grid, volumetric light rays, cinematic depth of field, no text no words no letters no numbers"

BAD (meta): "Dynamic sports action shot, professional quality"
GOOD (descriptive): "Basketball player mid-air slam dunk silhouette, arena spotlights creating dramatic rim lighting, crowd blur in background, orange and purple color grade, motion blur on ball, no text no words no letters no numbers"

TAGS: 2-5 reusable tags for image matching:
- Primary entity (team name, person, coin symbol)
- Category tag if relevant

REUSE_OK:
- true: Generic/recurring (regular game, price prediction)
- false: Historic/unique event (record-breaking, first-time)`,
  });

  return result.output;
}

export function buildImagePrompt(market: MarketImageContext): string {
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
- ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO WATERMARKS
- High contrast, attention-grabbing
- Professional quality, suitable for a betting app`;
}

export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate image using a pre-generated AI prompt
 */
export async function generateMarketImageWithPrompt(
  prompt: string,
  config: ImageGenerationConfig
): Promise<string> {
  const model: ImageModel = config.model ?? DEFAULT_IMAGE_MODEL;
  const replicate = new Replicate({ auth: config.replicateApiKey });

  const input =
    model === "black-forest-labs/flux-schnell"
      ? {
          prompt,
          aspect_ratio: "2:3",
          output_format: "webp",
          num_inference_steps: 4,
        }
      : { prompt, aspect_ratio: "2:3", output_format: "png" };

  const output = await replicate.run(model, { input });

  // Flux returns string[], nano-banana returns { url: () => URL }
  if (Array.isArray(output)) {
    return output[0] as string;
  }
  return (output as { url: () => URL }).url().href;
}
