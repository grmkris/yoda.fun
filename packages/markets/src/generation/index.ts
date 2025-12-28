// Public API for market generation
export { generateAndInsertMarkets } from "./service";
export { getTrendingTopics } from "./trending-research";
export { getDistributionGuidance, selectNextCategory } from "./distribution";
export { createImageService, type ImageService } from "./image-service";

// Types for tests
export type { TopicConfig, ResearchConfig } from "./trending-research";
