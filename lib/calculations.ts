// ============================================================
// Core calculation utilities — single source of truth for all formulas
// ============================================================

import type { PlayerWithStats, GameAwards, AwardWinner } from './types';

/**
 * MVP Score formula.
 * Points=20, REB=10, AST=5, STL=2, BLK=1, TO=3, F=2 → 41.5
 */
export function calculateMvpScore(stats: {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
}): number {
  return (
    stats.points +
    1.2 * stats.rebounds +
    1.5 * stats.assists +
    2 * stats.steals +
    2 * stats.blocks -
    stats.turnovers -
    0.5 * stats.fouls
  );
}

/**
 * Best Defender Score formula.
 * STL=2, BLK=1, REB=10, F=2 → 6+3+15-1 = 23
 */
export function calculateDefenderScore(stats: {
  steals: number;
  blocks: number;
  rebounds: number;
  fouls: number;
}): number {
  return (
    3 * stats.steals +
    3 * stats.blocks +
    1.5 * stats.rebounds -
    0.5 * stats.fouls
  );
}

/**
 * Calculate total team score from all player points.
 */
export function calculateTeamScore(players: PlayerWithStats[]): number {
  return players.reduce((sum, p) => sum + p.stats.points, 0);
}

/**
 * Calculate MVP and Best Defender from all players in a game.
 * Supports ties — returns arrays.
 */
export function calculateGameAwards(allPlayers: PlayerWithStats[]): GameAwards {
  if (allPlayers.length === 0) {
    return { mvps: [], defenders: [] };
  }

  // Calculate scores for each player
  const scored = allPlayers.map((player) => ({
    player,
    mvpScore: calculateMvpScore(player.stats),
    defenderScore: calculateDefenderScore(player.stats),
  }));

  const maxMvp = Math.max(...scored.map((s) => s.mvpScore));
  const maxDef = Math.max(...scored.map((s) => s.defenderScore));

  const mvps: AwardWinner[] = scored
    .filter((s) => s.mvpScore === maxMvp)
    .map((s) => ({ player: s.player, score: s.mvpScore }));

  const defenders: AwardWinner[] = scored
    .filter((s) => s.defenderScore === maxDef)
    .map((s) => ({ player: s.player, score: s.defenderScore }));

  return { mvps, defenders };
}

/**
 * Aggregate tournament-level stats across all players/games.
 * Ready for future tournament stats page.
 */
export function calculateTournamentStats(allPlayers: PlayerWithStats[]) {
  const totals = allPlayers.reduce(
    (acc, p) => ({
      points: acc.points + p.stats.points,
      rebounds: acc.rebounds + p.stats.rebounds,
      assists: acc.assists + p.stats.assists,
      steals: acc.steals + p.stats.steals,
      blocks: acc.blocks + p.stats.blocks,
      turnovers: acc.turnovers + p.stats.turnovers,
      fouls: acc.fouls + p.stats.fouls,
    }),
    { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 }
  );

  const count = allPlayers.length;
  return {
    totals,
    averages: count > 0
      ? {
          points: totals.points / count,
          rebounds: totals.rebounds / count,
          assists: totals.assists / count,
          steals: totals.steals / count,
          blocks: totals.blocks / count,
          turnovers: totals.turnovers / count,
          fouls: totals.fouls / count,
        }
      : null,
  };
}

/**
 * Format a score to one decimal place if needed, otherwise integer.
 */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? score.toString() : score.toFixed(1);
}
