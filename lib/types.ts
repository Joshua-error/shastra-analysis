// ============================================================
// TypeScript types for the Basketball Stats App
// ============================================================

export type GameStatus = 'upcoming' | 'in_progress' | 'completed';
export type Team = 'A' | 'B';
export type StatKey = 'points' | 'fouls' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers';

export interface Tournament {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface Game {
  id: string;
  tournament_id: string;
  game_number: number;
  team_a_name: string;
  team_b_name: string;
  scheduled_at: string | null;
  status: GameStatus;
  started_at: string | null;
  finished_at: string | null;
  team_a_score: number;
  team_b_score: number;
  mvp_player_id: string | null;
  best_defender_player_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  team: Team;
  name: string;
  jersey_number: number;
  created_at: string;
}

export interface PlayerGameStats {
  id: string;
  game_id: string;
  player_id: string;
  points: number;
  fouls: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  mvp_score: number | null;
  defender_score: number | null;
  updated_at: string;
}

// Combined player + stats (used in live game and reports)
export interface PlayerWithStats extends Player {
  stats: PlayerGameStats;
}

// Full game data loaded for live/report view
export interface GameWithPlayers extends Game {
  players_a: PlayerWithStats[];
  players_b: PlayerWithStats[];
}

// Undo action entry
export interface UndoAction {
  playerId: string;
  playerName: string;
  stat: StatKey;
  delta: number; // the delta that was applied (not the reversal)
  timestamp: number;
}

// Save status for UI indicator
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// Award winners (can be multiple on tie)
export interface AwardWinner {
  player: PlayerWithStats;
  score: number;
}

export interface GameAwards {
  mvps: AwardWinner[];
  defenders: AwardWinner[];
}

// Form types
export interface PlayerFormEntry {
  jersey_number: string;
  name: string;
}

export interface GameFormData {
  game_number: string;
  team_a_name: string;
  team_b_name: string;
  scheduled_date: string;
  scheduled_time: string;
  players_a: PlayerFormEntry[];
  players_b: PlayerFormEntry[];
}
