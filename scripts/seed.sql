-- ============================================================
-- Development Seed Data (optional — do NOT run in production)
-- ============================================================

-- NOTE: Replace 'YOUR_USER_UUID' with a real Supabase auth user ID
-- You can find it in the Supabase dashboard → Authentication → Users

DO $$
DECLARE
  v_user_id    UUID := 'YOUR_USER_UUID'; -- REPLACE THIS
  v_tournament UUID;
  v_game1      UUID;
  v_game2      UUID;
  -- Team A players game 1
  v_p1 UUID; v_p2 UUID; v_p3 UUID; v_p4 UUID; v_p5 UUID;
  -- Team B players game 1
  v_p6 UUID; v_p7 UUID; v_p8 UUID; v_p9 UUID; v_p10 UUID;
BEGIN

  -- Tournament
  INSERT INTO tournaments (name, created_by)
  VALUES ('Summer Classic 2026', v_user_id)
  RETURNING id INTO v_tournament;

  -- Game 1 (completed)
  INSERT INTO games (
    tournament_id, game_number, team_a_name, team_b_name,
    scheduled_at, status, started_at, finished_at,
    team_a_score, team_b_score
  ) VALUES (
    v_tournament, 1, 'Blazers', 'Thunder',
    now() - INTERVAL '2 hours', 'completed',
    now() - INTERVAL '2 hours', now() - INTERVAL '30 minutes',
    72, 68
  ) RETURNING id INTO v_game1;

  -- Team A players
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'A', 'Joshua Pinto',   23) RETURNING id INTO v_p1;
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'A', 'Marcus Rivera',  14) RETURNING id INTO v_p2;
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'A', 'Devon Carter',    7) RETURNING id INTO v_p3;
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'A', 'Tyler Brooks',   32) RETURNING id INTO v_p4;
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'A', 'Chris Okafor',    5) RETURNING id INTO v_p5;

  -- Team B players
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'B', 'Alex Mercer',    11) RETURNING id INTO v_p6;
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'B', 'Jordan Hayes',    3) RETURNING id INTO v_p7;
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'B', 'Sam Wilson',     18) RETURNING id INTO v_p8;
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'B', 'Mike Torres',    25) RETURNING id INTO v_p9;
  INSERT INTO players (game_id, team, name, jersey_number) VALUES
    (v_game1, 'B', 'Leo Banks',       9) RETURNING id INTO v_p10;

  -- Stats (Joshua Pinto: PTS=20, REB=10, AST=5, STL=2, BLK=1, TO=3, F=2 → MVP=41.5, DEF=23)
  INSERT INTO player_game_stats
    (game_id, player_id, points, fouls, rebounds, assists, steals, blocks, turnovers, mvp_score, defender_score)
  VALUES
    (v_game1, v_p1,  20, 2, 10, 5, 2, 1, 3, 41.5, 23.0),
    (v_game1, v_p2,  18, 3,  4, 6, 1, 0, 2, 28.3, 7.5),
    (v_game1, v_p3,  15, 2,  5, 3, 3, 2, 1, 29.5, 19.5),
    (v_game1, v_p4,  12, 4,  8, 2, 0, 1, 3, 20.1, 10.5),
    (v_game1, v_p5,   7, 1,  6, 1, 1, 3, 1, 20.2, 15.0),
    (v_game1, v_p6,  22, 3,  7, 4, 2, 0, 4, 30.9, 12.5),
    (v_game1, v_p7,  18, 2,  5, 7, 1, 1, 2, 31.0, 10.5),
    (v_game1, v_p8,  14, 3,  6, 2, 3, 2, 2, 26.2, 18.0),
    (v_game1, v_p9,   8, 4,  4, 1, 0, 0, 3, 6.0,  6.0),
    (v_game1, v_p10,  6, 1,  3, 0, 1, 1, 1, 9.5,  8.5);

  -- Update MVP/Defender on game 1
  UPDATE games SET
    mvp_player_id           = v_p1,
    best_defender_player_id = v_p1
  WHERE id = v_game1;

  -- Game 2 (upcoming)
  INSERT INTO games (
    tournament_id, game_number, team_a_name, team_b_name,
    scheduled_at, status
  ) VALUES (
    v_tournament, 2, 'Lakers', 'Celtics',
    now() + INTERVAL '1 hour', 'upcoming'
  ) RETURNING id INTO v_game2;

END $$;
