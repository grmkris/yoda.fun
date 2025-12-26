import { ResolutionStrategySchema } from "@yoda.fun/shared/resolution-types";
import { z } from "zod";

export const ValidationResultSchema = z.object({
  validated: z.boolean(),
  validatedAt: z.string().datetime(),
  errors: z.array(z.string()).optional(),
});

export const ResolutionPlanSchema = z.object({
  primary: ResolutionStrategySchema,
  verificationSources: z.array(z.string().url()).default([]),
  successCriteria: z.string().min(10),
  validation: ValidationResultSchema.optional(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type ResolutionPlan = z.infer<typeof ResolutionPlanSchema>;
