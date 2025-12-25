import type { Logger } from "@yoda.fun/logger";
import type {
  ResolutionMethodType,
  ResolutionStrategy,
} from "@yoda.fun/shared/resolution-types";
import type { GeneratedMarket } from "../market-generation-schemas";
import {
  createWebSearchFallbackStrategy,
  validateResolutionStrategy,
} from "../resolvers/validation";
import { calculateMarketDates } from "./duration-utils";

export interface PreparedMarket {
  title: string;
  description: string;
  category: string;
  resolutionCriteria: string;
  resolutionType: ResolutionMethodType;
  resolutionStrategy: ResolutionStrategy;
  betAmount: string;
  votingEndsAt: Date;
  resolutionDeadline: Date;
  imageUrl: string | null;
}

export interface PrepareMarketOptions {
  market: GeneratedMarket;
  imageUrl?: string | null;
  logger: Logger;
}

export async function prepareMarket(
  options: PrepareMarketOptions
): Promise<PreparedMarket> {
  const { market, imageUrl, logger } = options;
  const strategy = await validateWithFallback(market, logger);
  const { votingEndsAt, resolutionDeadline } = calculateMarketDates(
    market.duration
  );

  return {
    title: market.title,
    description: market.description,
    category: market.category,
    resolutionCriteria: market.resolutionCriteria,
    resolutionType: strategy.type,
    resolutionStrategy: strategy,
    betAmount: market.betAmount,
    votingEndsAt,
    resolutionDeadline,
    imageUrl: imageUrl ?? null,
  };
}

async function validateWithFallback(
  market: GeneratedMarket,
  logger: Logger
): Promise<ResolutionStrategy> {
  const strategy = market.resolutionMethod;

  try {
    const isValid = await validateResolutionStrategy(strategy);

    if (!isValid && strategy.type !== "WEB_SEARCH") {
      logger.warn(
        { title: market.title, strategyType: strategy.type },
        "Strategy validation failed, using WEB_SEARCH fallback"
      );
      return createWebSearchFallbackStrategy(market.title, market.description);
    }

    logger.debug(
      { title: market.title, strategyType: strategy.type },
      "Resolution strategy validated"
    );

    return strategy;
  } catch (error) {
    logger.error(
      { title: market.title, error },
      "Strategy validation error, using fallback"
    );
    return createWebSearchFallbackStrategy(market.title, market.description);
  }
}
