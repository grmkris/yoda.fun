import { describe, expect, test } from "bun:test";
import { fetchRecentEvents, resolveSportsMarket } from "./sports-resolver";

const THESPORTSDB_EVENT_URL_REGEX =
  /https:\/\/www\.thesportsdb\.com\/event\/\d+/;

describe("Sports Resolver", () => {
  describe("fetchRecentEvents", () => {
    test("fetches NBA events from TheSportsDB", async () => {
      const events = await fetchRecentEvents("nba", "Lakers");

      expect(Array.isArray(events)).toBe(true);
    }, 10_000);

    test("fetches NFL events from TheSportsDB", async () => {
      const events = await fetchRecentEvents("nfl", "Chiefs");

      expect(Array.isArray(events)).toBe(true);
    }, 10_000);

    test("fetches MLB events from TheSportsDB", async () => {
      const events = await fetchRecentEvents("mlb", "Yankees");

      expect(Array.isArray(events)).toBe(true);
    }, 10_000);

    test("throws error for unsupported sport", async () => {
      await expect(fetchRecentEvents("curling", "Team")).rejects.toThrow(
        "Unsupported sport: curling"
      );
    }, 10_000);

    test("filters events by team name", async () => {
      const events = await fetchRecentEvents("nba", "Celtics");

      for (const event of events) {
        const eventText =
          `${event.strHomeTeam} ${event.strAwayTeam} ${event.strEvent}`.toLowerCase();
        expect(eventText).toContain("celtics");
      }
    }, 10_000);
  });

  describe("resolveSportsMarket", () => {
    test("resolves win/lose outcome for NBA team", async () => {
      const result = await resolveSportsMarket({
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "nba",
        teamName: "Lakers",
        outcome: "win",
      });

      expect(["YES", "NO", "INVALID"]).toContain(result.result);

      if (result.result !== "INVALID") {
        expect(result.confidence).toBe(95);
        expect(result.sources).toHaveLength(1);
        expect(result.sources[0]?.url).toContain("thesportsdb.com");
      }
    }, 10_000);

    test("resolves with source URL and snippet", async () => {
      const result = await resolveSportsMarket({
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "nba",
        teamName: "Celtics",
        outcome: "win",
      });

      if (result.result !== "INVALID") {
        expect(result.sources).toHaveLength(1);
        expect(result.sources[0]?.url).toMatch(THESPORTSDB_EVENT_URL_REGEX);
        expect(result.sources[0]?.snippet).toBeTruthy();
      }
    }, 10_000);

    test("handles non-existent team gracefully", async () => {
      const result = await resolveSportsMarket({
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "nba",
        teamName: "NotARealTeam12345",
        outcome: "win",
      });

      expect(result.result).toBe("INVALID");
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toContain("No recent events found");
    }, 10_000);

    test("handles unsupported sport gracefully", async () => {
      const result = await resolveSportsMarket({
        type: "SPORTS",
        provider: "thesportsdb",
        sport: "curling" as "nba",
        teamName: "Canada",
        outcome: "win",
      });

      expect(result.result).toBe("INVALID");
      expect(result.reasoning).toContain("Unsupported sport");
    }, 10_000);
  });
});
