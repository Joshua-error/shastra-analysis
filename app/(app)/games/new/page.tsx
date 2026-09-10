import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GameForm from '@/components/GameForm';
import type { Tournament, Game } from '@/lib/types';

export default async function NewGamePage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: Tournament | null };

  let gameCount = 0;
  let nextGameNumber = 1;

  if (tournament) {
    const { data: games } = await supabase
      .from('games')
      .select('game_number')
      .eq('tournament_id', tournament.id)
      .order('game_number', { ascending: false });

    const existingGames = (games as Pick<Game, 'game_number'>[] | null) ?? [];
    gameCount = existingGames.length;

    if (gameCount >= 20) {
      redirect('/games');
    }

    const usedNumbers = new Set(existingGames.map((g) => g.game_number));
    for (let i = 1; i <= 20; i++) {
      if (!usedNumbers.has(i)) {
        nextGameNumber = i;
        break;
      }
    }
  }

  // Create tournament on first game creation if it doesn't exist
  const tournamentId = tournament?.id ?? '';

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">New Game</h1>
        <p className="text-gray-400 mt-1">Game {nextGameNumber} of 20</p>
      </div>
      <GameForm
        tournamentId={tournamentId}
        currentGameCount={gameCount}
        nextGameNumber={nextGameNumber}
      />
    </div>
  );
}
