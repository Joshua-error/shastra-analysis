-- ============================================================
-- Basketball Tournament Statistics — Initial Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TOURNAMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tournaments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  created_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- GAMES  (max 20 per tournament enforced by trigger)
-- ============================================================
CREATE TABLE IF NOT EXISTS games (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id           UUID        NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  game_number             INTEGER     NOT NULL CHECK (game_number BETWEEN 1 AND 20),
  team_a_name             TEXT        NOT NULL,
  team_b_name             TEXT        NOT NULL,
  scheduled_at            TIMESTAMPTZ,
  status                  TEXT        NOT NULL DEFAULT 'upcoming'
                            CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  started_at              TIMESTAMPTZ,
  finished_at             TIMESTAMPTZ,
  team_a_score            INTEGER     NOT NULL DEFAULT 0 CHECK (team_a_score >= 0),
  team_b_score            INTEGER     NOT NULL DEFAULT 0 CHECK (team_b_score >= 0),
  mvp_player_id           UUID,
  best_defender_player_id UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, game_number)
);

-- ============================================================
-- PLAYERS  (max 12 per team per game enforced by trigger)
-- ============================================================
CREATE TABLE IF NOT EXISTS players (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team           TEXT        NOT NULL CHECK (team IN ('A', 'B')),
  name           TEXT        NOT NULL,
  jersey_number  INTEGER     NOT NULL CHECK (jersey_number >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, team, jersey_number)
);

-- ============================================================
-- PLAYER GAME STATS  (one row per player per game)
-- ============================================================
CREATE TABLE IF NOT EXISTS player_game_stats (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id      UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE UNIQUE,
  points         INTEGER     NOT NULL DEFAULT 0 CHECK (points >= 0),
  fouls          INTEGER     NOT NULL DEFAULT 0 CHECK (fouls >= 0),
  rebounds       INTEGER     NOT NULL DEFAULT 0 CHECK (rebounds >= 0),
  assists        INTEGER     NOT NULL DEFAULT 0 CHECK (assists >= 0),
  steals         INTEGER     NOT NULL DEFAULT 0 CHECK (steals >= 0),
  blocks         INTEGER     NOT NULL DEFAULT 0 CHECK (blocks >= 0),
  turnovers      INTEGER     NOT NULL DEFAULT 0 CHECK (turnovers >= 0),
  mvp_score      NUMERIC,
  defender_score NUMERIC,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_games_tournament_id    ON games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_games_status           ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_game_number      ON games(tournament_id, game_number);
CREATE INDEX IF NOT EXISTS idx_players_game_id        ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_game_team      ON players(game_id, team);
CREATE INDEX IF NOT EXISTS idx_pgs_game_id            ON player_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_pgs_player_id          ON player_game_stats(player_id);

-- ============================================================
-- TRIGGER: enforce max 20 games per tournament
-- ============================================================
CREATE OR REPLACE FUNCTION check_max_games()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM games WHERE tournament_id = NEW.tournament_id
  ) >= 20 THEN
    RAISE EXCEPTION 'Tournament already has the maximum of 20 games';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_max_games ON games;
CREATE TRIGGER trg_max_games
  BEFORE INSERT ON games
  FOR EACH ROW EXECUTE FUNCTION check_max_games();

-- ============================================================
-- TRIGGER: enforce max 12 players per team per game
-- ============================================================
CREATE OR REPLACE FUNCTION check_max_players()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM players
    WHERE game_id = NEW.game_id AND team = NEW.team
  ) >= 12 THEN
    RAISE EXCEPTION 'Team % already has the maximum of 12 players', NEW.team;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_max_players ON players;
CREATE TRIGGER trg_max_players
  BEFORE INSERT ON players
  FOR EACH ROW EXECUTE FUNCTION check_max_players();

-- ============================================================
-- TRIGGER: auto-update updated_at on games
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_games_updated_at ON games;
CREATE TRIGGER trg_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_pgs_updated_at ON player_game_stats;
CREATE TRIGGER trg_pgs_updated_at
  BEFORE UPDATE ON player_game_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RPC: Atomic stat increment (prevents race conditions)
-- Called from client for every live stat tap.
-- Uses a single UPDATE — no read-modify-write race possible.
-- ============================================================
CREATE OR REPLACE FUNCTION increment_stat(
  p_player_id UUID,
  p_stat       TEXT,
  p_delta      INTEGER
)
RETURNS player_game_stats
LANGUAGE sql
AS $$
  UPDATE player_game_stats
  SET
    points    = CASE WHEN p_stat = 'points'    THEN GREATEST(0, points    + p_delta) ELSE points    END,
    fouls     = CASE WHEN p_stat = 'fouls'     THEN GREATEST(0, fouls     + p_delta) ELSE fouls     END,
    rebounds  = CASE WHEN p_stat = 'rebounds'  THEN GREATEST(0, rebounds  + p_delta) ELSE rebounds  END,
    assists   = CASE WHEN p_stat = 'assists'   THEN GREATEST(0, assists   + p_delta) ELSE assists   END,
    steals    = CASE WHEN p_stat = 'steals'    THEN GREATEST(0, steals    + p_delta) ELSE steals    END,
    blocks    = CASE WHEN p_stat = 'blocks'    THEN GREATEST(0, blocks    + p_delta) ELSE blocks    END,
    turnovers = CASE WHEN p_stat = 'turnovers' THEN GREATEST(0, turnovers + p_delta) ELSE turnovers END,
    updated_at = now()
  WHERE player_id = p_player_id
  RETURNING *;
$$;

-- ============================================================
-- RPC: Finalize game — atomically compute scores + mark completed
-- Called from server-side API route only.
-- ============================================================
CREATE OR REPLACE FUNCTION finalize_game(p_game_id UUID)
RETURNS games
LANGUAGE plpgsql
AS $$
DECLARE
  v_game         games%ROWTYPE;
  v_mvp_id       UUID;
  v_defender_id  UUID;
  v_team_a_score INTEGER;
  v_team_b_score INTEGER;
BEGIN
  -- Calculate and store per-player scores
  UPDATE player_game_stats pgs
  SET
    mvp_score = (
      pgs.points
      + (1.2 * pgs.rebounds)
      + (1.5 * pgs.assists)
      + (2   * pgs.steals)
      + (2   * pgs.blocks)
      - pgs.turnovers
      - (0.5 * pgs.fouls)
    ),
    defender_score = (
      (3   * pgs.steals)
      + (3   * pgs.blocks)
      + (1.5 * pgs.rebounds)
      - (0.5 * pgs.fouls)
    ),
    updated_at = now()
  WHERE pgs.game_id = p_game_id;

  -- Calculate team scores from player points
  SELECT
    COALESCE(SUM(pgs.points), 0)
  INTO v_team_a_score
  FROM player_game_stats pgs
  JOIN players p ON p.id = pgs.player_id
  WHERE pgs.game_id = p_game_id AND p.team = 'A';

  SELECT
    COALESCE(SUM(pgs.points), 0)
  INTO v_team_b_score
  FROM player_game_stats pgs
  JOIN players p ON p.id = pgs.player_id
  WHERE pgs.game_id = p_game_id AND p.team = 'B';

  -- Find MVP (highest mvp_score)
  SELECT pgs.player_id
  INTO v_mvp_id
  FROM player_game_stats pgs
  WHERE pgs.game_id = p_game_id
  ORDER BY pgs.mvp_score DESC NULLS LAST
  LIMIT 1;

  -- Find Best Defender (highest defender_score)
  SELECT pgs.player_id
  INTO v_defender_id
  FROM player_game_stats pgs
  WHERE pgs.game_id = p_game_id
  ORDER BY pgs.defender_score DESC NULLS LAST
  LIMIT 1;

  -- Finalize the game record
  UPDATE games
  SET
    status                  = 'completed',
    finished_at             = now(),
    team_a_score            = v_team_a_score,
    team_b_score            = v_team_b_score,
    mvp_player_id           = v_mvp_id,
    best_defender_player_id = v_defender_id,
    updated_at              = now()
  WHERE id = p_game_id
  RETURNING * INTO v_game;

  RETURN v_game;
END;
$$;

-- ============================================================
-- RPC: Reopen game — marks a completed game back to in_progress
-- ============================================================
CREATE OR REPLACE FUNCTION reopen_game(p_game_id UUID)
RETURNS games
LANGUAGE sql
AS $$
  UPDATE games
  SET
    status      = 'in_progress',
    finished_at = NULL,
    updated_at  = now()
  WHERE id = p_game_id
  RETURNING *;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tournaments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE games             ENABLE ROW LEVEL SECURITY;
ALTER TABLE players           ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;

-- Tournaments: owner can do everything
CREATE POLICY "tournaments_owner_all"
  ON tournaments FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Games: owner of tournament can do everything
CREATE POLICY "games_owner_all"
  ON games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = games.tournament_id AND t.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = games.tournament_id AND t.created_by = auth.uid()
    )
  );

-- Players: owner of tournament can do everything
CREATE POLICY "players_owner_all"
  ON players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN tournaments t ON t.id = g.tournament_id
      WHERE g.id = players.game_id AND t.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      JOIN tournaments t ON t.id = g.tournament_id
      WHERE g.id = players.game_id AND t.created_by = auth.uid()
    )
  );

-- Player game stats: owner of tournament can do everything
CREATE POLICY "pgs_owner_all"
  ON player_game_stats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM games g
      JOIN tournaments t ON t.id = g.tournament_id
      WHERE g.id = player_game_stats.game_id AND t.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      JOIN tournaments t ON t.id = g.tournament_id
      WHERE g.id = player_game_stats.game_id AND t.created_by = auth.uid()
    )
  );

-- Grant execute on RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION increment_stat(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_game(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_game(UUID) TO authenticated;
