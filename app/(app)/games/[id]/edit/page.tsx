import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import GameForm from '@/components/GameForm';
import type { Player } from '@/lib/types';

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (!game || game.status !== 'upcoming') notFound();

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', id)
    .order('jersey_number', { ascending: true });

  const allPlayers = (players as Player[]) ?? [];
  const playersA = allPlayers.filter((p) => p.team === 'A');
  const playersB = allPlayers.filter((p) => p.team === 'B');

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('id', game.tournament_id)
    .single();

  const { count: gameCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', game.tournament_id);

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Edit Game {game.game_number}</h1>
        <p className="text-gray-400 mt-1">Modify roster and details</p>
      </div>
      <GameForm
        tournamentId={tournament?.id ?? ''}
        currentGameCount={gameCount ?? 0}
        nextGameNumber={game.game_number}
        editGame={{
          id: game.id,
          game_number: game.game_number,
          team_a_name: game.team_a_name,
          team_b_name: game.team_b_name,
          scheduled_at: game.scheduled_at,
          players_a: playersA,
          players_b: playersB,
        }}
      />
    </div>
  );
}
