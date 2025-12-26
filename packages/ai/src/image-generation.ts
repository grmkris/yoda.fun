import Replicate from "replicate";

export interface MarketImageContext {
  title: string;
  category: string;
  description: string;
}

export interface ImageGenerationConfig {
  replicateApiKey: string;
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

  // To access the file URL:
  const url = await output.url();
  console.log(url);
  const imageBuffer = await output.blob();
  return Buffer.from(await imageBuffer.arrayBuffer());
}
