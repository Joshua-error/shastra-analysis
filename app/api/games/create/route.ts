import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // Use service role key if provided, else anon key
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(url, key);

    const body = await request.json();
    const { team_a_name, team_b_name, game_number, scheduled_at, players_a, players_b } = body;

    // 1. Get or create tournament
    let { data: tournament } = await supabase
      .from('tournaments')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tournament) {
      const { data: newT, error: tErr } = await supabase
        .from('tournaments')
        .insert({ name: 'Basketball Tournament', created_by: null })
        .select()
        .single();

      if (tErr) throw tErr;
      tournament = newT;
    }

    // 2. Create game
    const { data: game, error: gameErr } = await supabase
      .from('games')
      .insert({
        tournament_id: tournament.id,
        game_number: game_number || 1,
        team_a_name: team_a_name || 'Team A',
        team_b_name: team_b_name || 'Team B',
        scheduled_at: scheduled_at || null,
        status: 'upcoming',
      })
      .select()
      .single();

    if (gameErr) throw gameErr;

    // 3. Insert players
    const allPlayers = [
      ...players_a.map((p: any) => ({ game_id: game.id, team: 'A', name: p.name.trim(), jersey_number: parseInt(p.jersey_number) })),
      ...players_b.map((p: any) => ({ game_id: game.id, team: 'B', name: p.name.trim(), jersey_number: parseInt(p.jersey_number) })),
    ];

    if (allPlayers.length > 0) {
      const { data: insertedPlayers, error: pErr } = await supabase
        .from('players')
        .insert(allPlayers)
        .select();
      if (pErr) throw pErr;

      // 4. Create stats
      if (insertedPlayers && insertedPlayers.length > 0) {
        const statsRows = insertedPlayers.map((p: any) => ({
          game_id: p.game_id,
          player_id: p.id,
        }));
        await supabase.from('player_game_stats').insert(statsRows);
      }
    }

    return NextResponse.json({ success: true, game });
  } catch (err: any) {
    console.error('Server game creation error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to create game on server' },
      { status: 500 }
    );
  }
}
