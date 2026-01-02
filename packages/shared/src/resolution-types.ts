import { z } from "zod";

export const MarketForResolutionSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  resolutionCriteria: z.string().nullable(),
  // Temporal context - critical for accurate resolution
  createdAt: z.coerce.date(),
  votingEndsAt: z.coerce.date(),
  resolutionDeadline: z.coerce.date(),
});
export type MarketForResolution = z.infer<typeof MarketForResolutionSchema>;

export const AIResolutionSchema = z.object({
  result: z.enum(["YES", "NO", "INVALID"]),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  sources: z.array(
    z.object({
      url: z.string(),
      snippet: z.string(),
      relevance: z.string(),
    })
  ),
});
export type AIResolutionResult = z.infer<typeof AIResolutionSchema>;

export const ResolutionMetadataSchema = z.object({
  sources: z
    .array(z.object({ url: z.string(), snippet: z.string() }))
    .optional(),
  confidence: z.number().min(0).max(100).optional(),
  reasoning: z.string().optional(),
});
export type ResolutionMetadata = z.infer<typeof ResolutionMetadataSchema>;
