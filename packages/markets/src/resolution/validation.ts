import type {
  PriceStrategy,
  ResolutionStrategy,
  SportsStrategy,
  WebSearchStrategy,
} from "@yoda.fun/shared/resolution-types";
import type { ResolutionPlan, ValidationResult } from "../types";

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3";
const THESPORTSDB_API_URL = "https://www.thesportsdb.com/api/v1/json/3";
const SPECIAL_CHARS_PATTERN = /[^\w\s]/g;
const WHITESPACE_PATTERN = /\s+/;

export interface StrategyValidationResult {
  valid: boolean;
  error?: string;
  enrichedData?: Record<string, unknown>;
}

export async function validatePriceStrategy(
  strategy: PriceStrategy
): Promise<StrategyValidationResult> {
  try {
    const url = `${COINGECKO_API_URL}/simple/price?ids=${encodeURIComponent(strategy.coinId)}&vs_currencies=usd`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - assume valid, will retry at resolution
        return { valid: true };
      }
      return {
        valid: false,
        error: `CoinGecko API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as Record<string, { usd?: number }>;
    const coinData = data[strategy.coinId.toLowerCase()];

    if (!coinData?.usd) {
      return {
        valid: false,
        error: `Coin ID "${strategy.coinId}" not found on CoinGecko`,
      };
    }

    return {
      valid: true,
      enrichedData: { currentPrice: coinData.usd },
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate coin: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function validateSportsStrategy(
  strategy: SportsStrategy
): Promise<StrategyValidationResult> {
  const leagueIds: Record<string, string> = {
    nba: "4387",
    nfl: "4391",
    mlb: "4424",
    nhl: "4380",
    soccer: "4328",
    mma: "4443",
    boxing: "4470",
    tennis: "4464",
    esports: "4572",
  };

  const leagueId = leagueIds[strategy.sport];
  if (!leagueId) {
    return {
      valid: false,
      error: `Unsupported sport: ${strategy.sport}`,
    };
  }

  try {
    // Search for team in the league
    const url = `${THESPORTSDB_API_URL}/search_all_teams.php?l=${encodeURIComponent(strategy.sport.toUpperCase())}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      // TheSportsDB may be unavailable - allow with warning
      return {
        valid: true,
        enrichedData: {
          warning: "Could not verify team, will attempt at resolution",
        },
      };
    }

    const data = (await response.json()) as {
      teams?: Array<{ idTeam: string; strTeam: string }>;
    };

    if (!data.teams) {
      return {
        valid: true,
        enrichedData: { warning: "No teams data, will attempt at resolution" },
      };
    }

    const teamLower = strategy.teamName.toLowerCase();
    const matchedTeam = data.teams.find(
      (t) =>
        t.strTeam.toLowerCase().includes(teamLower) ||
        teamLower.includes(t.strTeam.toLowerCase())
    );

    if (matchedTeam) {
      return {
        valid: true,
        enrichedData: {
          teamId: matchedTeam.idTeam,
          teamName: matchedTeam.strTeam,
        },
      };
    }

    // Team not found in league search - still allow, may find in events
    return {
      valid: true,
      enrichedData: {
        warning: `Team "${strategy.teamName}" not found in ${strategy.sport} roster`,
      },
    };
  } catch (error) {
    // Network error - allow with warning
    return {
      valid: true,
      enrichedData: {
        warning: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
    };
  }
}

export function validateWebSearchStrategy(
  strategy: WebSearchStrategy
): StrategyValidationResult {
  if (!strategy.searchQuery || strategy.searchQuery.length < 5) {
    return {
      valid: false,
      error: "Search query too short",
    };
  }

  if (!strategy.successIndicators || strategy.successIndicators.length === 0) {
    return {
      valid: false,
      error: "No success indicators provided",
    };
  }

  return { valid: true };
}

export function validateStrategy(
  strategy: ResolutionStrategy
): Promise<StrategyValidationResult> | StrategyValidationResult {
  switch (strategy.type) {
    case "PRICE":
      return validatePriceStrategy(strategy);
    case "SPORTS":
      return validateSportsStrategy(strategy);
    case "WEB_SEARCH":
      return validateWebSearchStrategy(strategy);
    default:
      return {
        valid: false,
        error: `Unknown strategy type: ${(strategy as { type: string }).type}`,
      };
  }
}

export async function validateResolutionStrategy(
  strategy: ResolutionStrategy
): Promise<boolean> {
  const result = await validateStrategy(strategy);
  return result.valid;
}

export function createWebSearchFallbackStrategy(
  title: string,
  description: string
): WebSearchStrategy {
  return {
    type: "WEB_SEARCH",
    searchQuery: title,
    successIndicators: extractKeywords(`${title} ${description}`),
  };
}

export async function validateResolutionPlan(
  plan: Omit<ResolutionPlan, "validation">
): Promise<ResolutionPlan> {
  const result = await validateStrategy(plan.primary);

  const validation: ValidationResult = {
    validated: result.valid,
    validatedAt: new Date().toISOString(),
    errors: result.error ? [result.error] : undefined,
  };

  return {
    ...plan,
    validation,
  };
}

export function createWebSearchFallback(
  title: string,
  description: string,
  originalError: string
): ResolutionPlan {
  return {
    primary: {
      type: "WEB_SEARCH",
      searchQuery: title,
      successIndicators: extractKeywords(`${title} ${description}`),
    },
    verificationSources: [],
    successCriteria: description,
    validation: {
      validated: true,
      validatedAt: new Date().toISOString(),
      errors: [`Fallback from: ${originalError}`],
    },
  };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "will",
    "be",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "or",
    "and",
    "if",
    "it",
    "this",
    "that",
    "as",
    "but",
    "not",
  ]);

  const words = text
    .toLowerCase()
    .replace(SPECIAL_CHARS_PATTERN, "")
    .split(WHITESPACE_PATTERN)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  // Return unique words, max 5
  return [...new Set(words)].slice(0, 5);
}
