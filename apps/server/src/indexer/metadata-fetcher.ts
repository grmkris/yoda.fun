import {
  marketMetadataSchema,
  type MarketMetadata,
} from "@yoda.fun/shared/market-metadata";
import type { Logger } from "@yoda.fun/logger";

export async function fetchMarketMetadata(
  metadataUri: string,
  logger: Logger
): Promise<MarketMetadata | null> {
  if (!metadataUri) {
    return null;
  }

  try {
    const response = await fetch(metadataUri);

    if (!response.ok) {
      logger.warn(
        { metadataUri, status: response.status },
        "Failed to fetch market metadata"
      );
      return null;
    }

    const json = await response.json();
    const parsed = marketMetadataSchema.safeParse(json);

    if (!parsed.success) {
      logger.warn(
        { metadataUri, errors: parsed.error.issues },
        "Invalid market metadata schema"
      );
      return null;
    }

    return parsed.data;
  } catch (error) {
    logger.error(
      { metadataUri, error },
      "Error fetching market metadata"
    );
    return null;
  }
}
