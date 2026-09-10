import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Game, Tournament } from '@/lib/types';

const STATUS_CONFIG = {
  upcoming: { label: 'Upcoming', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  in_progress: { label: 'Live', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
} as const;

export default async function GamesPage() {
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single() as { data: Tournament | null };

  let games: Game[] = [];

  if (tournament) {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('tournament_id', tournament.id)
      .order('game_number', { ascending: true });
    games = (data as Game[]) ?? [];
  }

  const canAddGame = games.length < 20;

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Games</h1>
          <p className="text-gray-400 mt-1">
            {games.length} / 20 games
          </p>
        </div>
        {canAddGame ? (
          <Link
            href="/games/new"
            className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
          >
            + Add Game
          </Link>
        ) : (
          <span className="bg-gray-800 text-gray-400 font-semibold px-5 py-2.5 rounded-xl text-sm">
            Maximum 20 games reached
          </span>
        )}
      </div>

      {!tournament && (
        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🏀</div>
          <p className="text-gray-400 mb-4">No games yet. Create your first game!</p>
          <Link href="/games/new" className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            + Add First Game
          </Link>
        </div>
      )}

      {games.length === 0 && tournament && (
        <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center">
          <p className="text-gray-400">No games yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {games.map((game) => {
          const statusCfg = STATUS_CONFIG[game.status];
          return (
            <div
              key={game.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                      Game {game.game_number} of 20
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusCfg.className}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {game.team_a_name} <span className="text-gray-500 font-normal">vs</span> {game.team_b_name}
                  </h2>
                  {game.scheduled_at && (
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(game.scheduled_at).toLocaleString()}
                    </p>
                  )}
                  {game.status === 'completed' && (
                    <p className="text-white font-black text-xl mt-1">
                      {game.team_a_score} – {game.team_b_score}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {game.status === 'upcoming' && (
                    <>
                      <Link
                        href={`/games/${game.id}/edit`}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/games/${game.id}/start`}
                        className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        ▶ Start
                      </Link>
                    </>
                  )}
                  {game.status === 'in_progress' && (
                    <Link
                      href={`/live/${game.id}`}
                      className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors animate-pulse"
                    >
                      📡 Continue Live
                    </Link>
                  )}
                  {game.status === 'completed' && (
                    <>
                      <Link
                        href={`/report/${game.id}`}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        View Report
                      </Link>
                      <Link
                        href={`/games/${game.id}/reopen`}
                        className="bg-gray-800 hover:bg-gray-700 text-yellow-400 font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Reopen
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
