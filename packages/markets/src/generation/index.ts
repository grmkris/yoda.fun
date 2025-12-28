// Public API for market generation

// biome-ignore lint/performance/noBarrelFile: <TODO>
export { getDistributionGuidance, selectNextCategory } from "./distribution";
export { createImageService, type ImageService } from "./image-service";
export { generateAndInsertMarkets } from "./service";
// Types for tests
export { getTrendingTopics } from "./trending-research";
