import { z } from "zod";

export const marketMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string(),
  image: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  resolutionCriteria: z.string().optional(),
});

export type MarketMetadata = z.infer<typeof marketMetadataSchema>;
