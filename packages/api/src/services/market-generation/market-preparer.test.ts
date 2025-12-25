import { describe, expect, test } from "bun:test";
import { createLogger } from "@yoda.fun/logger";
import type { GeneratedMarket } from "../market-generation-schemas";
import {
  calculateDurationMs,
  calculateMarketDates,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MONTH,
  RESOLUTION_BUFFER_HOURS,
} from "./duration-utils";

const logger = createLogger({
  appName: "market-generation-test",
  level: "error",
  environment: "dev",
});
describe("Duration Utils", () => {
  describe("calculateDurationMs", () => {
    test("calculates hours correctly", () => {
      expect(calculateDurationMs({ value: 1, unit: "hours" })).toBe(
        MS_PER_HOUR
      );
      expect(calculateDurationMs({ value: 4, unit: "hours" })).toBe(
        4 * MS_PER_HOUR
      );
      expect(calculateDurationMs({ value: 24, unit: "hours" })).toBe(
        24 * MS_PER_HOUR
      );
    });

    test("calculates days correctly", () => {
      expect(calculateDurationMs({ value: 1, unit: "days" })).toBe(MS_PER_DAY);
      expect(calculateDurationMs({ value: 7, unit: "days" })).toBe(
        7 * MS_PER_DAY
      );
      expect(calculateDurationMs({ value: 30, unit: "days" })).toBe(
        30 * MS_PER_DAY
      );
    });

    test("calculates months correctly", () => {
      expect(calculateDurationMs({ value: 1, unit: "months" })).toBe(
        MS_PER_MONTH
      );
      expect(calculateDurationMs({ value: 3, unit: "months" })).toBe(
        3 * MS_PER_MONTH
      );
    });

    test("throws for invalid unit", () => {
      expect(() =>
        calculateDurationMs({ value: 1, unit: "weeks" as "days" })
      ).toThrow("Invalid duration unit");
    });
  });

  describe("calculateMarketDates", () => {
    test("calculates votingEndsAt correctly for hours", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const { votingEndsAt } = calculateMarketDates(
        { value: 4, unit: "hours" },
        now
      );

      expect(votingEndsAt.getTime()).toBe(now.getTime() + 4 * MS_PER_HOUR);
    });

    test("calculates votingEndsAt correctly for days", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const { votingEndsAt } = calculateMarketDates(
        { value: 7, unit: "days" },
        now
      );

      expect(votingEndsAt.getTime()).toBe(now.getTime() + 7 * MS_PER_DAY);
    });

    test("calculates votingEndsAt correctly for months", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const { votingEndsAt } = calculateMarketDates(
        { value: 1, unit: "months" },
        now
      );

      expect(votingEndsAt.getTime()).toBe(now.getTime() + MS_PER_MONTH);
    });

    test("resolutionDeadline is 6 hours after votingEndsAt", () => {
      const now = new Date("2025-01-01T12:00:00Z");
      const { votingEndsAt, resolutionDeadline } = calculateMarketDates(
        { value: 7, unit: "days" },
        now
      );

      const expectedResolutionDeadline =
        votingEndsAt.getTime() + RESOLUTION_BUFFER_HOURS * MS_PER_HOUR;
      expect(resolutionDeadline.getTime()).toBe(expectedResolutionDeadline);
    });

    test("uses current time when no date provided", () => {
      const before = Date.now();
      const { votingEndsAt } = calculateMarketDates({
        value: 1,
        unit: "hours",
      });
      const after = Date.now();

      // votingEndsAt should be 1 hour from approximately now
      const votingEndsAtMs = votingEndsAt.getTime();
      expect(votingEndsAtMs).toBeGreaterThanOrEqual(before + MS_PER_HOUR);
      expect(votingEndsAtMs).toBeLessThanOrEqual(after + MS_PER_HOUR);
    });
  });
});

describe("Market Preparer", () => {
  const validWebSearchMarket: GeneratedMarket = {
    title: "Will Taylor Swift announce a new album this month?",
    description: "Fans are buzzing about potential new music",
    category: "entertainment",
    resolutionCriteria: "Resolves YES if official announcement is made",
    resolutionMethod: {
      type: "WEB_SEARCH",
      searchQuery: "Taylor Swift new album announcement 2025",
      successIndicators: ["announced", "new album", "release date"],
    },
    duration: { value: 14, unit: "days" },
    betAmount: "0.25",
  };

  describe("prepareMarket", () => {
    // Note: These are integration tests that hit real APIs
    // For unit tests, mock validateResolutionStrategy

    test("preserves market fields correctly", async () => {
      // Import dynamically to allow mocking
      const { prepareMarket } = await import("./market-preparer");

      const result = await prepareMarket({
        market: validWebSearchMarket,
        logger,
      });

      expect(result.title).toBe(validWebSearchMarket.title);
      expect(result.description).toBe(validWebSearchMarket.description);
      expect(result.category).toBe(validWebSearchMarket.category);
      expect(result.resolutionCriteria).toBe(
        validWebSearchMarket.resolutionCriteria
      );
      expect(result.betAmount).toBe(validWebSearchMarket.betAmount);
    });

    test("sets correct resolutionType from strategy", async () => {
      const { prepareMarket } = await import("./market-preparer");

      const result = await prepareMarket({
        market: validWebSearchMarket,
        logger,
      });

      expect(result.resolutionType).toBe("WEB_SEARCH");
    });

    test("calculates dates based on duration", async () => {
      const { prepareMarket } = await import("./market-preparer");

      const before = Date.now();
      const result = await prepareMarket({
        market: validWebSearchMarket,
        logger,
      });
      const after = Date.now();

      // votingEndsAt should be 14 days from now
      const expectedVotingEndsMs = 14 * MS_PER_DAY;
      const actualVotingEndsMs = result.votingEndsAt.getTime() - before;

      expect(actualVotingEndsMs).toBeGreaterThanOrEqual(expectedVotingEndsMs);
      expect(actualVotingEndsMs).toBeLessThanOrEqual(
        expectedVotingEndsMs + (after - before) + 100
      );
    });

    test("sets imageUrl to null when not provided", async () => {
      const { prepareMarket } = await import("./market-preparer");

      const result = await prepareMarket({
        market: validWebSearchMarket,
        logger,
      });

      expect(result.imageUrl).toBeNull();
    });

    test("uses provided imageUrl", async () => {
      const { prepareMarket } = await import("./market-preparer");

      const result = await prepareMarket({
        market: validWebSearchMarket,
        imageUrl: "https://example.com/image.png",
        logger,
      });

      expect(result.imageUrl).toBe("https://example.com/image.png");
    });
  });
});
