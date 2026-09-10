import { createClient } from '@/lib/supabase/server';
import type { Game, Player } from '@/lib/types';
import HistoryClient from '@/components/HistoryClient';

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!tournament) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-4">History</h1>
        <p className="text-gray-400">No games recorded yet.</p>
      </div>
    );
  }

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .eq('tournament_id', tournament.id)
    .eq('status', 'completed')
    .order('game_number', { ascending: false });

  const completedGames = (games as Game[]) ?? [];

  // Load MVP/Defender names for each game
  const enriched = await Promise.all(
    completedGames.map(async (game) => {
      let mvp_name, mvp_jersey, defender_name, defender_jersey;

      if (game.mvp_player_id) {
        const { data } = await supabase
          .from('players')
          .select('name, jersey_number')
          .eq('id', game.mvp_player_id)
          .single() as { data: Pick<Player, 'name' | 'jersey_number'> | null };
        mvp_name = data?.name;
        mvp_jersey = data?.jersey_number;
      }

      if (game.best_defender_player_id) {
        const { data } = await supabase
          .from('players')
          .select('name, jersey_number')
          .eq('id', game.best_defender_player_id)
          .single() as { data: Pick<Player, 'name' | 'jersey_number'> | null };
        defender_name = data?.name;
        defender_jersey = data?.jersey_number;
      }

      return { ...game, mvp_name, mvp_jersey, defender_name, defender_jersey };
    })
  );

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">History</h1>
        <p className="text-gray-400 mt-1">{completedGames.length} completed game{completedGames.length !== 1 ? 's' : ''}</p>
      </div>
      <HistoryClient games={enriched} />
    </div>
  );
}
