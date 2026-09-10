import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import LiveGameClient from '@/components/LiveGameClient';
import type { GameWithPlayers, PlayerWithStats, Player, PlayerGameStats } from '@/lib/types';

export default async function LiveGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (!game) notFound();
  if (game.status === 'upcoming') redirect(`/games/${id}/start`);
  if (game.status === 'completed') redirect(`/report/${id}`);

  // Load players + stats
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', id)
    .order('jersey_number', { ascending: true });

  const { data: stats } = await supabase
    .from('player_game_stats')
    .select('*')
    .eq('game_id', id);

  const allPlayers = (players as Player[]) ?? [];
  const allStats = (stats as PlayerGameStats[]) ?? [];

  const statsMap = new Map(allStats.map((s) => [s.player_id, s]));

  const withStats = (team: 'A' | 'B'): PlayerWithStats[] =>
    allPlayers
      .filter((p) => p.team === team)
      .map((p) => ({
        ...p,
        stats: statsMap.get(p.id) ?? {
          id: '',
          game_id: id,
          player_id: p.id,
          points: 0,
          fouls: 0,
          rebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          turnovers: 0,
          mvp_score: null,
          defender_score: null,
          updated_at: new Date().toISOString(),
        },
      }));

  const gameWithPlayers: GameWithPlayers = {
    ...game,
    players_a: withStats('A'),
    players_b: withStats('B'),
  };

  return <LiveGameClient initialGame={gameWithPlayers} />;
}
