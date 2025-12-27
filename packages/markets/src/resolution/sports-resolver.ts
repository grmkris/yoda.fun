import type { SportsStrategy } from "@yoda.fun/shared/resolution-types";
import {
  type SportsResolutionResult,
  type TheSportsDBEvent,
  TheSportsDBResponseSchema,
} from "@yoda.fun/shared/market.schema";

const THESPORTSDB_API_URL = "https://www.thesportsdb.com/api/v1/json/3";

const LEAGUE_IDS: Record<string, string> = {
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

export async function fetchRecentEvents(
  sport: string,
  teamName: string
): Promise<TheSportsDBEvent[]> {
  const leagueId = LEAGUE_IDS[sport.toLowerCase()];
  if (!leagueId) {
    throw new Error(`Unsupported sport: ${sport}`);
  }

  const url = `${THESPORTSDB_API_URL}/eventspastleague.php?id=${leagueId}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `TheSportsDB API error: ${response.status} ${response.statusText}`
    );
  }

  const data = TheSportsDBResponseSchema.parse(await response.json());

  if (!data.events) {
    return [];
  }

  const teamLower = teamName.toLowerCase();
  return data.events.filter(
    (event) =>
      event.strHomeTeam.toLowerCase().includes(teamLower) ||
      event.strAwayTeam.toLowerCase().includes(teamLower) ||
      event.strEvent.toLowerCase().includes(teamLower)
  );
}

function determineOutcome(
  event: TheSportsDBEvent,
  teamName: string,
  expectedOutcome: "win" | "lose"
): { matches: boolean; description: string } {
  const teamLower = teamName.toLowerCase();
  const isHomeTeam = event.strHomeTeam.toLowerCase().includes(teamLower);

  const homeScore = Number.parseInt(event.intHomeScore ?? "0", 10);
  const awayScore = Number.parseInt(event.intAwayScore ?? "0", 10);

  const teamWon = isHomeTeam ? homeScore > awayScore : awayScore > homeScore;
  const teamLost = isHomeTeam ? homeScore < awayScore : awayScore < homeScore;

  const scoreText = `${event.strHomeTeam} ${homeScore} - ${awayScore} ${event.strAwayTeam}`;

  if (expectedOutcome === "win") {
    return {
      matches: teamWon,
      description: teamWon
        ? `${teamName} won: ${scoreText}`
        : `${teamName} did not win: ${scoreText}`,
    };
  }

  return {
    matches: teamLost,
    description: teamLost
      ? `${teamName} lost: ${scoreText}`
      : `${teamName} did not lose: ${scoreText}`,
  };
}

export async function resolveSportsMarket(
  strategy: SportsStrategy
): Promise<SportsResolutionResult> {
  const { sport, teamName, outcome } = strategy;

  try {
    const events = await fetchRecentEvents(sport, teamName);

    const mostRecentEvent = events[0];
    if (!mostRecentEvent) {
      return {
        result: "INVALID",
        confidence: 0,
        reasoning: `No recent events found for ${teamName} in ${sport.toUpperCase()}.`,
        sources: [],
      };
    }

    if (
      mostRecentEvent.intHomeScore === null ||
      mostRecentEvent.intAwayScore === null
    ) {
      return {
        result: "INVALID",
        confidence: 0,
        reasoning: `Most recent event (${mostRecentEvent.strEvent}) has not finished yet.`,
        sources: [],
      };
    }

    const { matches, description } = determineOutcome(
      mostRecentEvent,
      teamName,
      outcome
    );

    return {
      result: matches ? "YES" : "NO",
      confidence: 95,
      reasoning: description,
      sources: [
        {
          url: `https://www.thesportsdb.com/event/${mostRecentEvent.idEvent}`,
          snippet: `${mostRecentEvent.strEvent} on ${mostRecentEvent.dateEvent}`,
        },
      ],
    };
  } catch (error) {
    return {
      result: "INVALID",
      confidence: 0,
      reasoning: `Failed to fetch sports data: ${error instanceof Error ? error.message : "Unknown error"}`,
      sources: [],
    };
  }
}
