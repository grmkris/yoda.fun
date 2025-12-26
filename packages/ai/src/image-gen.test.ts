import { describe, expect, it } from "bun:test";
import { env as testEnv, write } from "bun";
import z from "zod";
import { generateMarketImageBuffer } from "./image-generation";

const testEnvSchema = z.object({
  REPLICATE_API_KEY: z.string().optional(),
});

const env = testEnvSchema.parse(testEnv);

describe.if(!!env.REPLICATE_API_KEY)("image generation", () => {
  it("should generate an image", async () => {
    if (!env.REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not set");
    }
    const imageBuffer = await generateMarketImageBuffer(
      {
        title: "Test Market",
        description: "Test Description",
        category: "Test Category",
      },
      { replicateApiKey: env.REPLICATE_API_KEY }
    );
    expect(imageBuffer).toBeDefined();
    if (!imageBuffer) {
      throw new Error("Image buffer is null");
    }
    await write("test-image.webp", imageBuffer);
  }, 100_000);
});
