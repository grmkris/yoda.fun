import type { Database } from "@yoda.fun/db";
import { DB_SCHEMA } from "@yoda.fun/db";
import { count, gte } from "@yoda.fun/db/drizzle";
import { MARKET_CATEGORIES } from "@yoda.fun/shared/market.schema";
import { CATEGORY_DISTRIBUTION } from "../config";

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

export interface CategoryStats {
  category: MarketCategory;
  count: number;
  percentage: number;
  targetPercentage: number;
  deficit: number;
}

export async function getCategoryDistribution(
  db: Database
): Promise<CategoryStats[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const results = await db
    .select({
      category: DB_SCHEMA.market.category,
      count: count(),
    })
    .from(DB_SCHEMA.market)
    .where(gte(DB_SCHEMA.market.createdAt, oneDayAgo))
    .groupBy(DB_SCHEMA.market.category);

  const countMap = new Map<string, number>();
  for (const row of results) {
    if (row.category) {
      countMap.set(row.category, row.count);
    }
  }

  const total = results.reduce((sum, r) => sum + r.count, 0) || 1;

  return MARKET_CATEGORIES.map((category) => {
    const cnt = countMap.get(category) || 0;
    const pct = cnt / total;
    const target = CATEGORY_DISTRIBUTION[category] ?? 0.03;
    return {
      category,
      count: cnt,
      percentage: pct,
      targetPercentage: target,
      deficit: target - pct,
    };
  });
}

export async function selectNextCategory(
  db: Database
): Promise<MarketCategory> {
  const distribution = await getCategoryDistribution(db);

  const withWeights = distribution.map((d) => ({
    ...d,
    weight: Math.max(0.01, d.deficit + 0.1),
  }));

  const totalWeight = withWeights.reduce((sum, d) => sum + d.weight, 0);
  let random = Math.random() * totalWeight;

  for (const d of withWeights) {
    random -= d.weight;
    if (random <= 0) {
      return d.category;
    }
  }

  return "other";
}

export async function getDistributionGuidance(db: Database): Promise<{
  deficits: { category: string; deficit: number }[];
  atCap: string[];
  suggested: string;
}> {
  const distribution = await getCategoryDistribution(db);

  const deficits = distribution
    .filter((d) => d.deficit > 0.02)
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 5)
    .map((d) => ({ category: d.category, deficit: d.deficit }));

  const prioritize = deficits.map((d) => d.category).join(", ");
  const suggested = prioritize ? `Prioritize: ${prioritize}.` : "";

  return { deficits, atCap: [], suggested };
}
